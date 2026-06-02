import type { ASTNode, Condition, LVal, MagicArg, MagicName, RVal, WhileCondition } from "../parser/ast";
import { MAGIC_NAMES } from "../parser/ast";
import type { BattleState, PlayerAction } from "./types";

// ─── 実行結果 ──────────────────────────────────────────

export interface ExecutionResult {
  actions: PlayerAction[];
  variables: Map<string, number | string>;  // 実行後の変数スナップショット
  error: string | null;
}

// ─── 公開: ループボディを1ラウンド分実行する ─────────────

export interface ExecuteOptions {
  // 相互参照用: ターン開始時点の相手側の変数
  peerVariables?: ReadonlyMap<string, number | string>;
  selfId?: "プレイヤー" | "なかま";
}

export function executeRoundBody(
  nodes: ASTNode[],
  state: Readonly<BattleState>,
  options: ExecuteOptions = {},
): ExecutionResult {
  const actions: PlayerAction[] = [];
  const variables = new Map<string, number | string>();
  const ctx: ExecContext = {
    state, variables, actions, error: null,
    peerVariables: options.peerVariables,
    selfId: options.selfId,
    healUsed: false,
  };

  for (const node of nodes) {
    execNode(node, ctx);
    if (ctx.error) break;
  }

  return { actions: ctx.actions, variables: ctx.variables, error: ctx.error };
}

// ─── 内部型 ───────────────────────────────────────────

interface ExecContext {
  state: Readonly<BattleState>;
  variables: Map<string, number | string>;
  // ターン開始時点の相手変数（相互参照用・読み取り専用）
  peerVariables?: ReadonlyMap<string, number | string>;
  // この実行者の識別子 ("プレイヤー" or "なかま")
  selfId?: "プレイヤー" | "なかま";
  actions: PlayerAction[];
  error: string | null;
  // 回復は1ラウンド1回まで（繰り返し内でも複数発動しないようにする）
  healUsed: boolean;
}

// ─── ノード実行 ───────────────────────────────────────

const MAX_LOOP_ITER = 200; // 無限ループ防止

function execNode(node: ASTNode, ctx: ExecContext): void {
  if (ctx.error) return;

  switch (node.type) {
    case "MagicCmd": {
      const magic = resolveMagicArg(node.arg, ctx.variables);
      if (magic === null) {
        ctx.error = `変数 "${node.arg}" は魔法名ではありません`;
        return;
      }
      ctx.actions.push({ type: "MagicUse", magic });
      break;
    }

    case "DefendCmd":
      ctx.actions.push({ type: "Defend" });
      break;

    case "HealCmd":
      // 回復は1ラウンド1回まで。繰り返し内で増殖しないようにする。
      if (!ctx.healUsed) {
        ctx.actions.push({ type: "Heal" });
        ctx.healUsed = true;
      }
      break;

    case "WaitCmd":
      ctx.actions.push({ type: "Wait" });
      break;

    case "Assign": {
      const value = resolveRVal(node.value, ctx.variables);
      ctx.variables.set(node.name, value);
      break;
    }

    case "LoopN": {
      for (let i = 0; i < node.count; i++) {
        for (const child of node.body) {
          execNode(child, ctx);
          if (ctx.error) return;
        }
      }
      break;
    }

    case "LoopWhile": {
      // メインループ以外で書かれた LoopWhile（入れ子など）
      // ゲーム状態は変わらないので無限ループに注意
      let iter = 0;
      while (iter < MAX_LOOP_ITER && evalWhileCond(node.condition, ctx)) {
        for (const child of node.body) {
          execNode(child, ctx);
          if (ctx.error) return;
        }
        iter++;
      }
      break;
    }

    case "If": {
      if (evalCond(node.condition, ctx)) {
        for (const child of node.then) execNode(child, ctx);
      } else {
        let matched = false;
        for (const branch of node.elseIfs) {
          if (evalCond(branch.condition, ctx)) {
            for (const child of branch.body) execNode(child, ctx);
            matched = true;
            break;
          }
        }
        if (!matched && node.else) {
          for (const child of node.else) execNode(child, ctx);
        }
      }
      break;
    }

    case "TargetedMagic": {
      const magic = resolveMagicArg(node.magic.arg, ctx.variables);
      if (magic === null) {
        ctx.error = `変数 "${node.magic.arg}" は魔法名ではありません`;
        return;
      }
      ctx.actions.push({ type: "MagicUse", magic, targetIndex: node.targetIndex });
      break;
    }
  }
}

// ─── 条件評価 ─────────────────────────────────────────

function evalWhileCond(cond: WhileCondition, ctx: ExecContext): boolean {
  if (cond.type === "EnemyAlive") return ctx.state.enemyHp > 0;
  return evalCond(cond, ctx);
}

function evalCond(cond: Condition, ctx: ExecContext): boolean {
  switch (cond.type) {
    case "EnemyAlive":
      return ctx.state.enemyHp > 0;

    case "EnemyState":
      return ctx.state.currentEnemyState === cond.element;

    case "Logic": {
      const l = evalCond(cond.left, ctx);
      const r = evalCond(cond.right, ctx);
      return cond.op === "かつ" ? l && r : l || r;
    }

    case "Comp": {
      const left = resolveCompVal(cond.left, ctx);
      const right = resolveCompVal(cond.right, ctx);
      if (typeof left !== "number" || typeof right !== "number") return false;
      switch (cond.op) {
        case "より小さい":   return left < right;
        case "より大きい":   return left > right;
        case "以上":        return left >= right;
        case "以下":        return left <= right;
        case "と等しい":    return left === right;
        case "と等しくない": return left !== right;
      }
    }
  }
}

// ─── 値解決 ───────────────────────────────────────────

function resolveCompVal(v: LVal | RVal, ctx: ExecContext): number | string {
  if (typeof v === "number") return v;
  switch (v) {
    case "敵のHP":   return ctx.state.enemyHp;
    case "自分のHP": return ctx.state.playerHp;
    case "自分のMP": return ctx.state.playerMp;
    default: {
      // 相互参照: "なかま.変数名" or "プレイヤー.変数名"
      if (v.includes(".")) {
        const [prefix, varName] = v.split(".");
        const isSelf =
          (prefix === "プレイヤー" && ctx.selfId === "プレイヤー") ||
          (prefix === "なかま" && ctx.selfId === "なかま");
        if (isSelf) {
          const val = ctx.variables.get(varName);
          return val !== undefined ? val : varName;
        }
        // 相手の変数を参照
        if (ctx.peerVariables) {
          const val = ctx.peerVariables.get(varName);
          return val !== undefined ? val : varName;
        }
        return varName;
      }
      // ローカル変数参照
      const val = ctx.variables.get(v);
      if (val !== undefined) return val;
      return v; // リテラル文字列
    }
  }
}

function resolveRVal(v: RVal, variables: Map<string, number | string>): number | string {
  if (typeof v === "number") return v;
  const fromVar = variables.get(v);
  return fromVar !== undefined ? fromVar : v;
}

function resolveMagicArg(arg: MagicArg, variables: Map<string, number | string>): MagicName | null {
  // 直接魔法名
  if (MAGIC_NAMES.has(arg as MagicName)) return arg as MagicName;
  // 変数経由
  const val = variables.get(arg);
  if (typeof val === "string" && MAGIC_NAMES.has(val as MagicName)) return val as MagicName;
  return null;
}
