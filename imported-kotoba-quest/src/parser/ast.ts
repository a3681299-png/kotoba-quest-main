// Kotoba Quest 独自言語の AST 型定義

export type ASTNode =
  | LoopWhileNode
  | LoopNNode
  | IfNode
  | AssignNode
  | MagicCmdNode
  | DefendCmdNode
  | HealCmdNode
  | WaitCmdNode
  | TargetedMagicNode;

// ─── ループ ───────────────────────────────────────────

export interface LoopWhileNode {
  type: "LoopWhile";
  condition: WhileCondition;
  body: ASTNode[];
}

export interface LoopNNode {
  type: "LoopN";
  count: number;
  body: ASTNode[];
}

// ─── 条件分岐 ─────────────────────────────────────────

export interface IfNode {
  type: "If";
  condition: Condition;
  then: ASTNode[];
  elseIfs: ElseIfBranch[];
  else: ASTNode[] | null;
}

export interface ElseIfBranch {
  condition: Condition;
  body: ASTNode[];
}

// ─── 代入 ─────────────────────────────────────────────

export interface AssignNode {
  type: "Assign";
  name: string;
  value: RVal;
}

// ─── コマンド ─────────────────────────────────────────

export interface MagicCmdNode {
  type: "MagicCmd";
  arg: MagicArg;
  target: TargetSpec | null;
}

export interface DefendCmdNode {
  type: "DefendCmd";
}

export interface HealCmdNode {
  type: "HealCmd";
}

export interface WaitCmdNode {
  type: "WaitCmd";
}

export interface TargetedMagicNode {
  type: "TargetedMagic";
  targetIndex: number; // 1番目 → 1
  magic: MagicCmdNode;
}

// ─── 条件式 ───────────────────────────────────────────

export type WhileCondition = EnemyAliveCondition | Condition;

export type Condition = CompCondition | EnemyStateCondition | EnemyAliveCondition | LogicCondition;

export interface EnemyAliveCondition {
  type: "EnemyAlive";
}

export interface EnemyStateCondition {
  type: "EnemyState";
  element: Element;
}

export interface CompCondition {
  type: "Comp";
  left: LVal;
  op: CompOp;
  right: RVal;
}

export interface LogicCondition {
  type: "Logic";
  op: "かつ" | "または";
  left: Condition;
  right: Condition;
}

// ─── 値・参照 ─────────────────────────────────────────

export type LVal = GameStateRef | string; // string = 変数名

export type GameStateRef = "敵のHP" | "自分のHP" | "自分のMP";

export type MagicArg = MagicName | string; // string = 変数名

export type MagicName = "フレイム" | "アクア" | "スパーク" | "フロスト" | "ゲイル";

export type Element = "火" | "水" | "雷" | "氷" | "風";

export type RVal = number | MagicName | string; // string = 変数名

export type CompOp =
  | "より小さい"
  | "より大きい"
  | "以上"
  | "以下"
  | "と等しい"
  | "と等しくない";

export type TargetSpec = { index: number };

// ─── 定数セット ───────────────────────────────────────

export const MAGIC_NAMES: Set<MagicName> = new Set([
  "フレイム",
  "アクア",
  "スパーク",
  "フロスト",
  "ゲイル",
]);

export const ELEMENTS: Set<Element> = new Set(["火", "水", "雷", "氷", "風"]);

export const ELEMENT_TO_MAGIC: Record<Element, MagicName> = {
  火: "フレイム",
  水: "アクア",
  雷: "スパーク",
  氷: "フロスト",
  風: "ゲイル",
};

export const GAME_STATE_REFS: Set<GameStateRef> = new Set([
  "敵のHP",
  "自分のHP",
  "自分のMP",
]);
