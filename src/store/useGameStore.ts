import { create } from "zustand";
import type { SourceLocation } from "../parser/types";
import type { GameAction } from "../engine/SpellExecutor";
import type { EnemyIntent } from "../engine/EnemyAI";

// バトルフェーズ
export type BattlePhase =
  | "player_turn" // プレイヤーのターン（コード入力中）
  | "executing" // コード実行中
  | "show_intent" // 敵の予兆を表示
  | "enemy_turn" // 敵のターン（攻撃アニメーション）
  | "victory" // 勝利
  | "defeat"; // 敗北

// 実行状態
export type ExecutionStatus =
  | "idle" // 待機中
  | "running" // 実行中（通常モード）
  | "stepping" // ステップ実行中
  | "paused" // 一時停止（次のステップ待ち）
  | "completed" // 完了
  | "error"; // エラー

// 実行中の行情報
export interface ExecutingLine {
  lineNumber: number;
  location: SourceLocation;
  status: "executing" | "complete";
}

// リトライ用のスナップショット
export interface TurnSnapshot {
  playerHp: number;
  enemyHp: number;
  turnCount: number;
  variables: Map<string, number | string>;
}

// ゲームストアの状態
export interface GameState {
  // ゲーム状態
  playerHp: number;
  maxPlayerHp: number;
  enemyHp: number;
  maxEnemyHp: number;

  // ターン管理
  battlePhase: BattlePhase;
  turnCount: number;
  currentStage: number;

  // プレイヤー状態
  isDefending: boolean;
  defenseMultiplier: number;

  // Intent（予兆）システム
  currentIntent: EnemyIntent | null;
  lastDamageReceived: number;
  lastDamageBlocked: number;

  // リトライ用スナップショット
  turnSnapshot: TurnSnapshot | null;

  // 変数ウォッチ
  variables: Map<string, number | string>;

  // 実行状態
  executionStatus: ExecutionStatus;
  isStepMode: boolean;
  currentLine: number | null;
  executedLines: ExecutingLine[];
  pendingActions: GameAction[];
  logs: string[];
  errorMessage: string | null;

  // ステップ実行用のPromise resolver
  stepResolver: (() => void) | null;
}

// ゲームストアのアクション
export interface GameActions {
  // HP操作
  setPlayerHp: (hp: number) => void;
  setEnemyHp: (hp: number) => void;
  damageEnemy: (amount: number) => void;
  damagePlayer: (amount: number) => void;
  healPlayer: (amount: number) => void;

  // ターン管理
  setBattlePhase: (phase: BattlePhase) => void;
  nextTurn: () => void;
  setCurrentStage: (stage: number) => void;

  // 防御状態
  setDefending: (defending: boolean) => void;

  // Intent管理
  setIntent: (intent: EnemyIntent | null) => void;
  setLastDamage: (received: number, blocked: number) => void;

  // リトライ
  saveTurnSnapshot: () => void;
  restoreFromSnapshot: () => void;

  // 変数操作
  setVariable: (name: string, value: number | string) => void;
  clearVariables: () => void;

  // 実行制御
  setStepMode: (enabled: boolean) => void;
  startExecution: () => void;
  pauseExecution: (lineNumber: number, location: SourceLocation) => void;
  resumeExecution: () => void;
  nextStep: () => void;
  completeExecution: () => void;
  setError: (message: string) => void;
  resetExecution: () => void;

  // 行ハイライト
  markLineExecuting: (lineNumber: number, location: SourceLocation) => void;
  markLineComplete: (lineNumber: number) => void;

  // アクション・ログ
  addAction: (action: GameAction) => void;
  addLog: (message: string) => void;
  clearLogs: () => void;

  // ステージリセット
  resetStage: (enemyHp: number) => void;

  // Promise resolver設定
  setStepResolver: (resolver: (() => void) | null) => void;
}

// 初期状態
const initialState: GameState = {
  playerHp: 100,
  maxPlayerHp: 100,
  enemyHp: 30,
  maxEnemyHp: 30,
  battlePhase: "player_turn",
  turnCount: 1,
  currentStage: 1,
  isDefending: false,
  defenseMultiplier: 0.5,
  currentIntent: null,
  lastDamageReceived: 0,
  lastDamageBlocked: 0,
  turnSnapshot: null,
  variables: new Map(),
  executionStatus: "idle",
  isStepMode: false,
  currentLine: null,
  executedLines: [],
  pendingActions: [],
  logs: [],
  errorMessage: null,
  stepResolver: null,
};

// Zustand ストア
export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  // HP操作
  setPlayerHp: (hp) =>
    set({ playerHp: Math.max(0, Math.min(hp, get().maxPlayerHp)) }),
  setEnemyHp: (hp) =>
    set({ enemyHp: Math.max(0, Math.min(hp, get().maxEnemyHp)) }),
  damageEnemy: (amount) =>
    set((state) => ({
      enemyHp: Math.max(0, state.enemyHp - amount),
    })),
  damagePlayer: (amount) =>
    set((state) => {
      const actualDamage = state.isDefending
        ? Math.floor(amount * state.defenseMultiplier)
        : amount;
      const blocked = amount - actualDamage;
      return {
        playerHp: Math.max(0, state.playerHp - actualDamage),
        lastDamageReceived: actualDamage,
        lastDamageBlocked: blocked,
      };
    }),
  healPlayer: (amount) =>
    set((state) => ({
      playerHp: Math.min(state.maxPlayerHp, state.playerHp + amount),
    })),

  // ターン管理
  setBattlePhase: (phase) => set({ battlePhase: phase }),
  nextTurn: () =>
    set((state) => ({
      turnCount: state.turnCount + 1,
      battlePhase: "player_turn",
      isDefending: false, // 防御はターン終了でリセット
    })),
  setCurrentStage: (stage) => set({ currentStage: stage }),

  // 防御状態
  setDefending: (defending) => set({ isDefending: defending }),

  // Intent管理
  setIntent: (intent) => set({ currentIntent: intent }),
  setLastDamage: (received, blocked) =>
    set({ lastDamageReceived: received, lastDamageBlocked: blocked }),

  // リトライ
  saveTurnSnapshot: () =>
    set((state) => ({
      turnSnapshot: {
        playerHp: state.playerHp,
        enemyHp: state.enemyHp,
        turnCount: state.turnCount,
        variables: new Map(state.variables),
      },
    })),
  restoreFromSnapshot: () => {
    const snapshot = get().turnSnapshot;
    if (snapshot) {
      set({
        playerHp: snapshot.playerHp,
        enemyHp: snapshot.enemyHp,
        turnCount: snapshot.turnCount,
        variables: new Map(snapshot.variables),
        battlePhase: "player_turn",
        isDefending: false,
        lastDamageReceived: 0,
        lastDamageBlocked: 0,
      });
    }
  },

  // 変数操作
  setVariable: (name, value) =>
    set((state) => {
      const newVars = new Map(state.variables);
      newVars.set(name, value);
      return { variables: newVars };
    }),
  clearVariables: () => set({ variables: new Map() }),

  // 実行制御
  setStepMode: (enabled) => set({ isStepMode: enabled }),

  startExecution: () =>
    set({
      executionStatus: get().isStepMode ? "stepping" : "running",
      battlePhase: "executing",
      executedLines: [],
      pendingActions: [],
      errorMessage: null,
    }),

  pauseExecution: (lineNumber, _location) =>
    set({
      executionStatus: "paused",
      currentLine: lineNumber,
    }),

  resumeExecution: () =>
    set({
      executionStatus: "stepping",
    }),

  nextStep: () => {
    const resolver = get().stepResolver;
    if (resolver) {
      set({ stepResolver: null, executionStatus: "stepping" });
      resolver();
    }
  },

  completeExecution: () =>
    set({
      executionStatus: "completed",
      currentLine: null,
      stepResolver: null,
    }),

  setError: (message) =>
    set({
      executionStatus: "error",
      errorMessage: message,
      stepResolver: null,
    }),

  resetExecution: () =>
    set({
      executionStatus: "idle",
      currentLine: null,
      executedLines: [],
      pendingActions: [],
      errorMessage: null,
      stepResolver: null,
    }),

  // 行ハイライト
  markLineExecuting: (lineNumber, location) =>
    set((state) => ({
      currentLine: lineNumber,
      executedLines: [
        ...state.executedLines.filter((l) => l.lineNumber !== lineNumber),
        { lineNumber, location, status: "executing" as const },
      ],
    })),

  markLineComplete: (lineNumber) =>
    set((state) => ({
      executedLines: state.executedLines.map((l) =>
        l.lineNumber === lineNumber ? { ...l, status: "complete" as const } : l,
      ),
    })),

  // アクション・ログ
  addAction: (action) =>
    set((state) => ({
      pendingActions: [...state.pendingActions, action],
    })),

  addLog: (message) =>
    set((state) => ({
      logs: [...state.logs.slice(-10), message],
    })),

  clearLogs: () => set({ logs: [] }),

  // ステージリセット
  resetStage: (enemyHp) =>
    set({
      ...initialState,
      enemyHp,
      maxEnemyHp: enemyHp,
    }),

  // Promise resolver設定
  setStepResolver: (resolver) => set({ stepResolver: resolver }),
}));

// React外からストアにアクセスするためのヘルパー
export const gameStore = {
  getState: useGameStore.getState,
  setState: useGameStore.setState,
  subscribe: useGameStore.subscribe,
};
