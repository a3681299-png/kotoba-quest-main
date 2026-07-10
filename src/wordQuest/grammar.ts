import type {
  SentenceSlot,
  SentenceValidation,
  StrategySentence,
  WordId,
  WordInventory,
} from "./types";
import {
  SENTENCE_SLOT_LABELS,
  VOCABULARY_BY_ID,
  wordFitsSlot,
} from "./vocabulary";

const REQUIRED_SLOTS: readonly SentenceSlot[] = [
  "subject",
  "condition",
  "connector",
  "action",
  "target",
];

export function createStrategySentence(index: number): StrategySentence {
  return {
    id: `strategy-${index + 1}`,
    subject: "subject.self",
    condition: null,
    connector: "connector.then",
    action: null,
    target: "subject.enemy",
    modifier: "modifier.once",
  };
}

export function setSentenceSlot(
  sentence: StrategySentence,
  slot: SentenceSlot,
  wordId: WordId | null,
): StrategySentence {
  return { ...sentence, [slot]: wordId };
}

function invalid(
  sentence: StrategySentence,
  issue: string,
  missingSlot: SentenceSlot | null = null,
): SentenceValidation {
  return {
    sentenceId: sentence.id,
    valid: false,
    issue,
    missingSlot,
  };
}

export function validateSentence(
  sentence: StrategySentence,
  sentenceIndex: number,
  plan: readonly StrategySentence[],
  inventory: WordInventory,
): SentenceValidation {
  for (const slot of REQUIRED_SLOTS) {
    if (!sentence[slot]) {
      return invalid(
        sentence,
        `「${SENTENCE_SLOT_LABELS[slot]}」に語彙が必要です。`,
        slot,
      );
    }
  }

  const slots: readonly SentenceSlot[] = [
    ...REQUIRED_SLOTS,
    "modifier",
  ];
  for (const slot of slots) {
    const wordId = sentence[slot];
    if (!wordId) continue;
    const word = VOCABULARY_BY_ID[wordId];
    if (!word) return invalid(sentence, `不明な語彙「${wordId}」があります。`, slot);
    if (!inventory[wordId]) {
      return invalid(sentence, `「${word.label}」はまだ獲得していません。`, slot);
    }
    if (!wordFitsSlot(word, slot)) {
      return invalid(
        sentence,
        `「${word.label}」は「${SENTENCE_SLOT_LABELS[slot]}」には置けません。`,
        slot,
      );
    }
  }

  const subject = VOCABULARY_BY_ID[sentence.subject as WordId];
  const condition = VOCABULARY_BY_ID[sentence.condition as WordId];
  const connector = VOCABULARY_BY_ID[sentence.connector as WordId];
  const action = VOCABULARY_BY_ID[sentence.action as WordId];
  const target = VOCABULARY_BY_ID[sentence.target as WordId];
  const modifier = sentence.modifier
    ? VOCABULARY_BY_ID[sentence.modifier]
    : null;

  if (
    subject?.effect.kind !== "subject" ||
    condition?.effect.kind !== "condition" ||
    connector?.effect.kind !== "connector" ||
    action?.effect.kind !== "action" ||
    target?.effect.kind !== "subject" ||
    (modifier && modifier.effect.kind !== "modifier")
  ) {
    return invalid(sentence, "語彙の役割が文章の位置と一致していません。");
  }

  const enemyCondition = condition.effect.condition.startsWith("enemy_");
  const playerCondition = condition.effect.condition.startsWith("player_");
  if (enemyCondition && subject.effect.subject !== "enemy") {
    return invalid(sentence, `「${condition.label}」の主体には「敵」が必要です。`, "subject");
  }
  if (playerCondition && subject.effect.subject !== "self") {
    return invalid(sentence, `「${condition.label}」の主体には「自分」が必要です。`, "subject");
  }

  if (!action.effect.allowedTargets.includes(target.effect.subject)) {
    return invalid(
      sentence,
      `「${action.label}」は「${target.label}」を対象にできません。`,
      "target",
    );
  }

  if (connector.effect.connector === "after" && sentenceIndex === 0) {
    return invalid(
      sentence,
      "「その後」の前には、実行される作戦文が必要です。",
      "connector",
    );
  }

  if (modifier?.effect.kind === "modifier" && modifier.effect.modifier === "again") {
    const previousAction = sentenceIndex > 0 ? plan[sentenceIndex - 1]?.action : null;
    if (!previousAction || previousAction !== sentence.action) {
      return invalid(
        sentence,
        "「もう一度」は、直前と同じ行動を置いた文章で使えます。",
        "modifier",
      );
    }
  }

  return {
    sentenceId: sentence.id,
    valid: true,
    issue: null,
    missingSlot: null,
  };
}

export function validatePlan(
  plan: readonly StrategySentence[],
  inventory: WordInventory,
): readonly SentenceValidation[] {
  if (plan.length === 0) {
    return [
      {
        sentenceId: "plan",
        valid: false,
        issue: "作戦文を一つ以上作ってください。",
        missingSlot: null,
      },
    ];
  }
  return plan.map((sentence, index) =>
    validateSentence(sentence, index, plan, inventory),
  );
}

export function getNextEmptySlot(sentence: StrategySentence): SentenceSlot {
  return (
    REQUIRED_SLOTS.find((slot) => !sentence[slot]) ??
    (sentence.modifier ? "condition" : "modifier")
  );
}

export function formatSentence(sentence: StrategySentence): string {
  const label = (wordId: WordId | null, fallback: string) =>
    (wordId && VOCABULARY_BY_ID[wordId]?.label) || fallback;
  const subject = label(sentence.subject, "誰か");
  const condition = label(sentence.condition, "条件");
  const connector = label(sentence.connector, "なら");
  const action = label(sentence.action, "行動する");
  const target = label(sentence.target, "対象");
  const modifier = sentence.modifier
    ? `、${label(sentence.modifier, "")}`
    : "";
  return `${subject}が${condition}${connector}、${target}へ${action}${modifier}。`;
}

export function getSentenceRulePreview(
  sentence: StrategySentence,
  validation: SentenceValidation,
): string {
  if (!validation.valid) return validation.issue ?? "文章を完成させてください。";
  const condition = VOCABULARY_BY_ID[sentence.condition as WordId];
  const action = VOCABULARY_BY_ID[sentence.action as WordId];
  const target = VOCABULARY_BY_ID[sentence.target as WordId];
  return `${condition?.label ?? "条件"} → ${target?.label ?? "対象"}に${action?.label ?? "行動"}`;
}
