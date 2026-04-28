import type { ASTNode, ConditionNode } from "../parser/types";

// ゲーム状態へのアクセス用インターフェース
export interface GameContext {
    playerHp: number;
    enemyHp: number;
    maxEnemyHp: number;
    enemyIsAirborne: boolean;
    enemyShieldTurnsRemaining: number;
    variables: Map<string, number | string>;
}

// 実行結果
export interface ExecutionResult {
    actions: GameAction[];
    logs: string[];
    error?: string;
}

// ゲームアクション
export type GameAction =
    | { type: "attack"; attackType: "fire" | "ice" | "thunder" | "normal"; damage: number }
    | { type: "heal"; amount: number }
    | { type: "defend" };

// インタープリター
export class Interpreter {
    private context: GameContext;
    private actions: GameAction[] = [];
    private logs: string[] = [];

    constructor(context: GameContext) {
        this.context = {
            ...context,
            variables: new Map(context.variables),
        };
    }

    // ASTを実行
    execute(ast: ASTNode[]): ExecutionResult {
        this.actions = [];
        this.logs = [];

        try {
            for (const node of ast) {
                this.executeNode(node);
            }
            return { actions: this.actions, logs: this.logs };
        } catch (error) {
            return {
                actions: this.actions,
                logs: this.logs,
                error: error instanceof Error ? error.message : "実行エラー",
            };
        }
    }

    private executeNode(node: ASTNode): void {
        switch (node.type) {
            case "FunctionCall":
                this.executeFunctionCall(node.name, node.args);
                break;
            case "VariableDecl":
                this.context.variables.set(node.name, node.value);
                this.logs.push(`変数 ${node.name} = ${node.value} を設定`);
                break;
            case "If":
                if (this.evaluateCondition(node.condition)) {
                    for (const child of node.body) {
                        this.executeNode(child);
                    }
                }
                break;
            case "Loop":
                const count = Math.min(node.count, 10); // 最大10回に制限
                this.logs.push(`${count}回 繰り返し開始`);
                for (let i = 0; i < count; i++) {
                    for (const child of node.body) {
                        this.executeNode(child);
                    }
                }
                break;
        }
    }

    private executeFunctionCall(name: string, args: (string | number)[]): void {
        switch (name) {
            case "攻撃":
                this.executeAttack(args);
                break;
            case "回復":
                this.executeHeal(args);
                break;
            case "防御":
                this.actions.push({ type: "defend" });
                this.logs.push("防御した！");
                break;
            default:
                this.logs.push(`不明な関数: ${name}`);
        }
    }

    private executeAttack(args: (string | number)[]): void {
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

        this.actions.push({ type: "attack", attackType, damage: baseDamage });
        this.logs.push(`${spellName || "通常"}攻撃！ ${baseDamage}ダメージ`);
    }

    private executeHeal(args: (string | number)[]): void {
        const amount = typeof args[0] === "number" ? args[0] : 20;
        this.actions.push({ type: "heal", amount });
        this.logs.push(`${amount} 回復！`);
    }

    private evaluateCondition(condition: ConditionNode): boolean {
        const left = this.resolveValue(condition.left);
        const right = this.resolveValue(condition.right);

        switch (condition.op) {
            case "<": return left < right;
            case ">": return left > right;
            case "<=": return left <= right;
            case ">=": return left >= right;
            case "==": return left === right;
            case "!=": return left !== right;
            default: return false;
        }
    }

    private resolveValue(value: string | number): number {
        if (typeof value === "number") {
            return value;
        }

        // 特殊な識別子
        if (value === "体力" || value === "敵の体力") {
            return this.context.enemyHp;
        }
        if (value === "敵の状態" || value === "敵が空中") {
            if (this.context.enemyShieldTurnsRemaining > 0) {
                return 2;
            }
            return this.context.enemyIsAirborne ? 1 : 0;
        }
        if (value === "自分の体力") {
            return this.context.playerHp;
        }

        // 変数を探す
        const varValue = this.context.variables.get(value);
        if (typeof varValue === "number") {
            return varValue;
        }

        return 0;
    }
}
