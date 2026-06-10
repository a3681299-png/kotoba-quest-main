export type TacticalCardKind = "logic" | "condition" | "action" | "memory";

export interface TacticalCard {
  id: string;
  label: string;
  code: string;
  kind: TacticalCardKind;
  cost: number;
  description: string;
  stageIds: number[];
}

const CARD_POOL: TacticalCard[] = [
  {
    id: "attack",
    label: "攻撃",
    code: "攻撃する",
    kind: "action",
    cost: 1,
    description: "正面から意味を通す",
    stageIds: [1, 2, 3],
  },
  {
    id: "heal",
    label: "回復",
    code: "回復する",
    kind: "action",
    cost: 0,
    description: "順番の中に立て直しを入れる",
    stageIds: [1],
  },
  {
    id: "if-low-hp-attack",
    label: "弱っているなら攻撃",
    code: "もし 敵HP が 少ない なら 攻撃する",
    kind: "condition",
    cost: 2,
    description: "状態を見て行動を選ぶ",
    stageIds: [2],
  },
  {
    id: "else-observe",
    label: "そうでなければ観察",
    code: "そうでなければ 観察する",
    kind: "logic",
    cost: 0,
    description: "条件に合わない時の行動",
    stageIds: [2, 6],
  },
  {
    id: "observe",
    label: "観察",
    code: "観察する",
    kind: "action",
    cost: 0,
    description: "文脈を読む",
    stageIds: [2, 5, 6],
  },
  {
    id: "repeat-attack",
    label: "3回くりかえす",
    code: "3回 くりかえす 攻撃する",
    kind: "logic",
    cost: 3,
    description: "同じ行動をまとめる",
    stageIds: [3],
  },
  {
    id: "record-words",
    label: "言葉を記録",
    code: "敵の言葉を 記録する",
    kind: "memory",
    cost: 1,
    description: "あとで使う情報を残す",
    stageIds: [4],
  },
  {
    id: "if-same-talk",
    label: "同じなら話す",
    code: "もし 敵の言葉 が 前と同じ なら 話しかける",
    kind: "condition",
    cost: 2,
    description: "記録を条件に変える",
    stageIds: [4],
  },
  {
    id: "plan-a",
    label: "作戦A",
    code: "作戦A は { 観察する 話しかける }",
    kind: "logic",
    cost: 2,
    description: "行動のまとまりに名前をつける",
    stageIds: [5],
  },
  {
    id: "run-plan-a",
    label: "作戦実行",
    code: "作戦A を 実行する",
    kind: "action",
    cost: 1,
    description: "名前をつけた作戦を呼び出す",
    stageIds: [5],
  },
  {
    id: "if-not-enemy-reach",
    label: "敵ではないなら",
    code: "もし 敵が敵ではない なら 手を伸ばす",
    kind: "condition",
    cost: 2,
    description: "前提を疑って行動を変える",
    stageIds: [6],
  },
];

export function getTacticalCardsForStage(stageId: number): TacticalCard[] {
  return CARD_POOL.filter((card) => card.stageIds.includes(stageId)).sort(
    (a, b) => {
      const aStageSpecific = a.stageIds[0] === stageId ? 0 : 1;
      const bStageSpecific = b.stageIds[0] === stageId ? 0 : 1;
      return aStageSpecific - bStageSpecific;
    },
  );
}

export function buildCodeFromCardSelection(
  cards: TacticalCard[],
  selectedIds: string[],
): string {
  return selectedIds
    .map((id) => cards.find((card) => card.id === id)?.code)
    .filter((code): code is string => Boolean(code))
    .join("\n");
}

export function appendCardSelection(
  selectedIds: string[],
  cardId: string,
): string[] {
  return [...selectedIds, cardId];
}

export function removeCardSelection(
  selectedIds: string[],
  removeIndex: number,
): string[] {
  return selectedIds.filter((_, index) => index !== removeIndex);
}
