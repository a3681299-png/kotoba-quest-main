import type { ASTNode, ConditionNode, SourceLocation } from "../parser/types";
import { gameStore } from "../store/useGameStore";

// ゲーム状態へのアクセス用インターフェース
export interface GameContext {
  playerHp: number;
  enemyHp: number;
  maxEnemyHp: number;
  variables: Map<string, number | string>;
}

// 実行イベントの種類
export type ExecutionEventType =
  | "execution-start"
  | "line-execute"
  | "line-complete"
  | "action-emit"
  | "execution-complete"
  | "execution-error";

// 実行イベント
export interface ExecutionEvent {
  type: ExecutionEventType;
  location?: SourceLocation;
  lineNumber?: number;
  action?: GameAction;
  message?: string;
  error?: string;
}

// ゲームアクション
export type GameAction =
  | {
      type: "attack";
      attackType: "fire" | "ice" | "thunder" | "normal";
      damage: number;
    }
  | { type: "heal"; amount: number }
  | { type: "defend" };

// イベントリスナー型
type EventListener = (event: ExecutionEvent) => void;

/**
 * SpellExecutor - イベント駆動型実行エンジン（ステップ実行対応版）
 *
 * ASTを受け取り、各ノードを順次実行しながら
 * 「どの行を実行中か」をイベントとしてemitする。
 * isStepMode が true のときは各行実行後に一時停止し、
 * nextStep() が呼ばれるまで待機する。
 */
export class SpellExecutor {
  private context: GameContext;
  private listeners: Map<ExecutionEventType, EventListener[]> = new Map();
  private actions: GameAction[] = [];
  private logs: string[] = [];
  private isStepMode: boolean = false;
  private useStore: boolean = false;

  constructor(context: GameContext, options?: { useStore?: boolean }) {
    this.context = {
      ...context,
      variables: new Map(context.variables),
    };
    this.useStore = options?.useStore ?? false;

    // ストア使用時は初期変数をストアに同期
    if (this.useStore) {
      const store = gameStore.getState();
      context.variables.forEach((value, key) => {
        store.setVariable(key, value);
      });
    }
  }

  // イベントリスナーを登録
  on(eventType: ExecutionEventType, listener: EventListener): void {
    const listeners = this.listeners.get(eventType) || [];
    listeners.push(listener);
    this.listeners.set(eventType, listeners);
  }

  // イベントリスナーを削除
  off(eventType: ExecutionEventType, listener: EventListener): void {
    const listeners = this.listeners.get(eventType) || [];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  // イベントをemit
  private emit(event: ExecutionEvent): void {
    const listeners = this.listeners.get(event.type) || [];
    for (const listener of listeners) {
      listener(event);
    }
  }

  // ステップモードを設定
  setStepMode(enabled: boolean): void {
    this.isStepMode = enabled;
    if (this.useStore) {
      gameStore.getState().setStepMode(enabled);
    }
  }

  // ステップ待機（ストア経由）
  private async waitForStep(
    lineNumber: number,
    location: SourceLocation,
  ): Promise<void> {
    if (!this.isStepMode) return;

    const store = gameStore.getState();

    // 一時停止状態に設定
    store.pauseExecution(lineNumber, location);

    // nextStep() が呼ばれるまで待機
    return new Promise<void>((resolve) => {
      store.setStepResolver(resolve);
    });
  }

  // 現在の状態を取得
  getState(): {
    actions: GameAction[];
    logs: string[];
    variables: Map<string, number | string>;
  } {
    return {
      actions: [...this.actions],
      logs: [...this.logs],
      variables: new Map(this.context.variables),
    };
  }

  // ASTを非同期で実行
  async execute(
    ast: ASTNode[],
  ): Promise<{ actions: GameAction[]; logs: string[]; error?: string }> {
    this.actions = [];
    this.logs = [];

    if (this.useStore) {
      gameStore.getState().startExecution();
    }

    this.emit({ type: "execution-start" });

    try {
      for (const node of ast) {
        await this.executeNode(node);
      }

      if (this.useStore) {
        gameStore.getState().completeExecution();
      }

      this.emit({ type: "execution-complete" });
      return { actions: this.actions, logs: this.logs };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "実行エラー";

      if (this.useStore) {
        gameStore.getState().setError(errorMessage);
      }

      this.emit({ type: "execution-error", error: errorMessage });
      return { actions: this.actions, logs: this.logs, error: errorMessage };
    }
  }

  private async executeNode(node: ASTNode): Promise<void> {
    const lineNumber = node.location.start.line;

    // 実行開始をemit
    this.emit({
      type: "line-execute",
      location: node.location,
      lineNumber,
    });

    if (this.useStore) {
      gameStore.getState().markLineExecuting(lineNumber, node.location);
    }

    // ステップモードなら待機
    if (this.isStepMode) {
      await this.waitForStep(lineNumber, node.location);
    }

    // 少し遅延を入れて視覚的フィードバックを与える
    await this.delay(this.isStepMode ? 50 : 100);

    switch (node.type) {
      case "FunctionCall":
        await this.executeFunctionCall(node.name, node.args);
        break;
      case "VariableDecl":
        this.context.variables.set(node.name, node.value);
        this.logs.push(`変数 ${node.name} = ${node.value} を設定`);

        // ストアに変数を同期
        if (this.useStore) {
          gameStore.getState().setVariable(node.name, node.value);
        }
        break;
      case "If":
        if (this.evaluateCondition(node.condition)) {
          for (const child of node.body) {
            await this.executeNode(child);
          }
        }
        break;
      case "Loop":
        const count = Math.min(node.count, 10); // 最大10回に制限
        this.logs.push(`${count}回 繰り返し開始`);
        for (let i = 0; i < count; i++) {
          for (const child of node.body) {
            await this.executeNode(child);
          }
        }
        break;
    }

    // 実行完了をemit
    this.emit({
      type: "line-complete",
      location: node.location,
      lineNumber,
    });

    if (this.useStore) {
      gameStore.getState().markLineComplete(lineNumber);
    }
  }

  private async executeFunctionCall(
    name: string,
    args: (string | number)[],
  ): Promise<void> {
    switch (name) {
      case "攻撃":
        await this.executeAttack(args);
        break;
      case "回復":
        await this.executeHeal(args);
        break;
      case "防御":
        const defendAction: GameAction = { type: "defend" };
        this.actions.push(defendAction);
        this.logs.push("🛡️ 防御の構え！ダメージを半減！");

        if (this.useStore) {
          gameStore.getState().setDefending(true);
          gameStore.getState().addAction(defendAction);
          gameStore.getState().addLog("🛡️ 防御の構え！ダメージを半減！");
        }

        this.emit({ type: "action-emit", action: defendAction });
        break;
      default:
        this.logs.push(`不明な関数: ${name}`);
    }
  }

  private async executeAttack(args: (string | number)[]): Promise<void> {
    const spellName = args[0]?.toString() || "";
    let attackType: "fire" | "ice" | "thunder" | "normal" = "normal";
    let baseDamage = 10;

    // 魔法の種類を判定
    if (spellName.includes("ファイア") || spellName.includes("火")) {
      attackType = "fire";
      baseDamage = 15;
    } else if (spellName.includes("アイス") || spellName.includes("氷")) {
      attackType = "ice";
      baseDamage = 12;
    } else if (spellName.includes("サンダー") || spellName.includes("雷")) {
      attackType = "thunder";
      baseDamage = 18;
    }

    // 変数「威力」があれば上乗せ
    const powerBonus = this.context.variables.get("威力");
    if (typeof powerBonus === "number") {
      baseDamage += powerBonus;
    }

    const action: GameAction = {
      type: "attack",
      attackType,
      damage: baseDamage,
    };
    this.actions.push(action);
    const logMessage = `${spellName || "通常"}攻撃！ ${baseDamage}ダメージ`;
    this.logs.push(logMessage);

    if (this.useStore) {
      gameStore.getState().addAction(action);
      gameStore.getState().addLog(logMessage);
    }

    this.emit({ type: "action-emit", action });
  }

  private async executeHeal(args: (string | number)[]): Promise<void> {
    const amount = typeof args[0] === "number" ? args[0] : 20;
    const action: GameAction = { type: "heal", amount };
    this.actions.push(action);
    const logMessage = `${amount} 回復！`;
    this.logs.push(logMessage);

    if (this.useStore) {
      gameStore.getState().addAction(action);
      gameStore.getState().addLog(logMessage);
      gameStore.getState().healPlayer(amount);
    }

    this.emit({ type: "action-emit", action });
  }

  private evaluateCondition(condition: ConditionNode): boolean {
    const left = this.resolveValue(condition.left);
    const right = this.resolveValue(condition.right);

    switch (condition.op) {
      case "<":
        return left < right;
      case ">":
        return left > right;
      case "<=":
        return left <= right;
      case ">=":
        return left >= right;
      case "==":
        return left === right;
      case "!=":
        return left !== right;
      default:
        return false;
    }
  }

  private resolveValue(value: string | number): number {
    if (typeof value === "number") {
      return value;
    }

    // 特殊な識別子
    if (value === "体力" || value === "敵の体力") {
      return this.useStore
        ? gameStore.getState().enemyHp
        : this.context.enemyHp;
    }
    if (value === "自分の体力") {
      return this.useStore
        ? gameStore.getState().playerHp
        : this.context.playerHp;
    }

    // 変数を探す
    const varValue = this.context.variables.get(value);
    if (typeof varValue === "number") {
      return varValue;
    }

    return 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
