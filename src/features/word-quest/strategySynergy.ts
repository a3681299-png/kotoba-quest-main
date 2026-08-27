import {
  VOCABULARY_BY_ID,
  type SentenceSlot,
  type SentenceValidation,
  type StrategySentence,
  type WordId,
} from "../../wordQuest";

export interface SentenceCompressionInsight {
  sentenceIndex: number;
  actionRuns: number;
  savedSentences: number;
  labels: readonly string[];
  highlightedSlots: readonly SentenceSlot[];
}

export interface StrategyCausalLink {
  fromSentenceIndex: number;
  toSentenceIndex: number;
  label: string;
}

export interface StrategySynergyView {
  validSentenceCount: number;
  representedActionCount: number;
  savedSentenceCount: number;
  placedWordCount: number;
  uniqueWordCount: number;
  sentences: readonly SentenceCompressionInsight[];
  links: readonly StrategyCausalLink[];
}

const ACTION_TO_NEXT_CONDITION: Readonly<Record<string, string>> = {
  "action.stop": "condition.enemy_stopped",
  "action.bind": "condition.enemy_bound",
  "action.call_name": "condition.enemy_named",
};

const ACTION_CONDITION_PAIR_LABELS: Readonly<Record<string, string>> = {
  "condition.player_attacked|action.counter": "被弾を反撃へ変換",
  "condition.enemy_stopped|action.bind": "停止が拘束を有効化",
  "condition.enemy_bound|action.attack": "拘束の隙を攻撃へ利用",
  "condition.enemy_named|action.stop": "真名から停止へ接続",
};

const SENTENCE_SLOTS: readonly SentenceSlot[] = [
  "subject",
  "condition",
  "connector",
  "action",
  "target",
  "modifier",
];

function wordLabel(wordId: WordId | null): string {
  return wordId ? (VOCABULARY_BY_ID[wordId]?.label ?? wordId) : "";
}

function sentenceCompression(
  sentence: StrategySentence,
  sentenceIndex: number,
  valid: boolean,
): SentenceCompressionInsight {
  if (!valid) {
    return {
      sentenceIndex,
      actionRuns: 0,
      savedSentences: 0,
      labels: [],
      highlightedSlots: [],
    };
  }

  let actionRuns = 1;
  const labels: string[] = [];
  const highlightedSlots = new Set<SentenceSlot>();
  const connector = sentence.connector
    ? VOCABULARY_BY_ID[sentence.connector]
    : null;
  const modifier = sentence.modifier
    ? VOCABULARY_BY_ID[sentence.modifier]
    : null;

  if (
    connector?.effect.kind === "connector" &&
    connector.effect.connector === "whenever"
  ) {
    actionRuns += 1;
    labels.push("接続詞が反復を受け持つ");
    highlightedSlots.add("connector");
  }

  if (modifier?.effect.kind === "modifier") {
    if (modifier.effect.modifier === "twice") {
      actionRuns += 1;
      labels.push("修飾語が行動を一回増やす");
      highlightedSlots.add("modifier");
    } else if (modifier.effect.modifier === "again") {
      actionRuns += 1;
      labels.push("同じ行動をもう一度実行");
      highlightedSlots.add("modifier");
    } else if (modifier.effect.modifier === "negate") {
      labels.push("条件を反転して語彙を再利用");
      highlightedSlots.add("condition");
      highlightedSlots.add("modifier");
    }
  }

  const internalPair =
    ACTION_CONDITION_PAIR_LABELS[
      `${sentence.condition ?? ""}|${sentence.action ?? ""}`
    ];
  if (internalPair) {
    labels.push(internalPair);
    highlightedSlots.add("condition");
    highlightedSlots.add("action");
  }

  return {
    sentenceIndex,
    actionRuns,
    savedSentences: Math.max(0, actionRuns - 1),
    labels,
    highlightedSlots: [...highlightedSlots],
  };
}

function causalLink(
  previous: StrategySentence,
  current: StrategySentence,
  toSentenceIndex: number,
): StrategyCausalLink | null {
  if (
    current.modifier === "modifier.again" &&
    previous.action &&
    previous.action === current.action
  ) {
    return {
      fromSentenceIndex: toSentenceIndex - 1,
      toSentenceIndex,
      label: `「${wordLabel(previous.action)}」を再利用`,
    };
  }

  const expectedCondition = previous.action
    ? ACTION_TO_NEXT_CONDITION[previous.action]
    : null;
  if (expectedCondition && current.condition === expectedCondition) {
    return {
      fromSentenceIndex: toSentenceIndex - 1,
      toSentenceIndex,
      label: `${wordLabel(previous.action)} → ${wordLabel(current.condition)}`,
    };
  }

  if (current.connector === "connector.after") {
    return {
      fromSentenceIndex: toSentenceIndex - 1,
      toSentenceIndex,
      label: "前の手番の実行結果を受け渡す",
    };
  }

  return null;
}

export function analyzeStrategySynergy(
  strategies: readonly StrategySentence[],
  validations: readonly SentenceValidation[],
): StrategySynergyView {
  const sentences = strategies.map((sentence, sentenceIndex) =>
    sentenceCompression(
      sentence,
      sentenceIndex,
      validations[sentenceIndex]?.valid === true,
    ),
  );
  const validSentenceCount = sentences.filter(
    (sentence) => sentence.actionRuns > 0,
  ).length;
  const representedActionCount = sentences.reduce(
    (total, sentence) => total + sentence.actionRuns,
    0,
  );
  const links: StrategyCausalLink[] = [];

  for (let index = 1; index < strategies.length; index += 1) {
    if (
      validations[index - 1]?.valid !== true ||
      validations[index]?.valid !== true
    ) {
      continue;
    }
    const link = causalLink(strategies[index - 1], strategies[index], index);
    if (link) links.push(link);
  }

  const placedWords = strategies.flatMap((sentence) =>
    SENTENCE_SLOTS.map((slot) => sentence[slot]).filter(
      (wordId): wordId is WordId => Boolean(wordId),
    ),
  );

  return {
    validSentenceCount,
    representedActionCount,
    savedSentenceCount: Math.max(
      0,
      representedActionCount - validSentenceCount,
    ),
    placedWordCount: placedWords.length,
    uniqueWordCount: new Set(placedWords).size,
    sentences,
    links,
  };
}
