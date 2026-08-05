import type {
  SentenceSlot,
  StrategySentence,
  WordCategory,
} from "../../wordQuest";

export const SLOT_ORDER: readonly SentenceSlot[] = [
  "subject",
  "condition",
  "connector",
  "action",
  "target",
  "modifier",
];

export const CATEGORY_ORDER: readonly WordCategory[] = [
  "subject",
  "condition",
  "connector",
  "action",
  "modifier",
];

export const CATEGORY_META: Readonly<
  Record<
    WordCategory,
    {
      label: string;
      mark: string;
      prompt: string;
      shapeLabel: string;
    }
  >
> = {
  subject: {
    mark: "主",
    label: "主体",
    prompt: "だれを動かす？",
    shapeLabel: "肖像のアーチ",
  },
  condition: {
    mark: "条",
    label: "条件",
    prompt: "いつ起こす？",
    shapeLabel: "分岐のひし形",
  },
  connector: {
    mark: "接",
    label: "接続",
    prompt: "どうつなぐ？",
    shapeLabel: "橋渡しのくびれ",
  },
  action: {
    mark: "動",
    label: "行動",
    prompt: "なにをする？",
    shapeLabel: "前へ向く矢じり",
  },
  modifier: {
    mark: "修",
    label: "修飾",
    prompt: "動きをどう変える？",
    shapeLabel: "補助歯車の切り欠き",
  },
};

export function categoryForSlot(slot: SentenceSlot): WordCategory {
  return slot === "target" ? "subject" : slot;
}

export function slotForCategory(
  sentence: StrategySentence,
  category: WordCategory,
): SentenceSlot {
  const candidates = SLOT_ORDER.filter(
    (slot) => categoryForSlot(slot) === category,
  );
  return candidates.find((slot) => !sentence[slot]) ?? candidates[0];
}
