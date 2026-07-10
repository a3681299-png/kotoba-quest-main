import type {
  EncounterDefinition,
  EvidenceText,
  ExtractableFragment,
  Hypothesis,
  HypothesisValidationResult,
  SemanticId,
} from "./types";

export const EVIDENCE_AUTHORING_CHECKLIST = [
  "兆候と、その判断を支える文章上の根拠を対にする",
  "文章外の常識を知らなくても判断できるようにする",
  "複数の解釈が成り立つ曖昧さと、判断材料が足りない状態を区別する",
  "解釈ごとに、反証となる証拠と確定に必要な証拠を定める",
  "同じ意味の表現には、同じsemanticIdを割り当てる",
  "複数の攻略法が成り立つ遭遇では、戦闘処理でも成功として扱う",
] as const;

const BATTLE_RECORD =
  "鎧の継ぎ目が赤く脈打った直後、獣は決まって正面へ飛びかかった。正面から刃を受け止めた兵士は、その衝撃ごと壁へ叩きつけられた。";

const SCOUT_NOTE = "横へ身を投げた斥候だけが、その突進を免れた。";

function fragment(
  text: string,
  definition: Omit<ExtractableFragment, "start" | "end" | "quote"> & {
    quote: string;
  },
): ExtractableFragment {
  const start = text.indexOf(definition.quote);

  if (start < 0) {
    throw new Error(`Evidence fragment not found: ${definition.quote}`);
  }

  return {
    ...definition,
    start,
    end: start + definition.quote.length,
  } as ExtractableFragment;
}

const battleRecord: EvidenceText = {
  id: "battle-record",
  title: "崩れた見張り台の戦闘記録",
  text: BATTLE_RECORD,
  fragments: [
    fragment(BATTLE_RECORD, {
      id: "record-red-seams",
      kind: "condition",
      quote: "鎧の継ぎ目が赤く脈打った",
      semanticId: "enemy.armor_glows_red",
    }),
    fragment(BATTLE_RECORD, {
      id: "record-red-pulse",
      kind: "condition",
      quote: "赤く脈打った直後",
      semanticId: "enemy.armor_glows_red",
    }),
    fragment(BATTLE_RECORD, {
      id: "record-front-lunge",
      kind: "enemy_action",
      quote: "獣は決まって正面へ飛びかかった",
      semanticId: "enemy.charges_front",
    }),
    fragment(BATTLE_RECORD, {
      id: "record-front-lunge-short",
      kind: "enemy_action",
      quote: "正面へ飛びかかった",
      semanticId: "enemy.charges_front",
    }),
  ],
};

const scoutNote: EvidenceText = {
  id: "scout-note",
  title: "斥候の走り書き",
  text: SCOUT_NOTE,
  fragments: [
    fragment(SCOUT_NOTE, {
      id: "scout-side-dodge",
      kind: "player_action",
      quote: "横へ身を投げた",
      semanticId: "player.dodge_side",
    }),
  ],
};

export const RED_ARMOR_ENCOUNTER: EncounterDefinition = {
  id: "split-armor-beast",
  enemyName: "裂鎧の獣",
  evidenceTexts: [battleRecord, scoutNote],
  enemyRule: {
    condition: "enemy.armor_glows_red",
    action: "enemy.charges_front",
    actionDelay: 1,
    successfulCounters: ["player.dodge_side"],
  },
  acceptedInterpretations: [
    {
      id: "full-clauses",
      condition: "enemy.armor_glows_red",
      enemyAction: "enemy.charges_front",
      evidenceFragmentIds: ["record-red-seams", "record-front-lunge"],
    },
    {
      id: "short-clauses",
      condition: "enemy.armor_glows_red",
      enemyAction: "enemy.charges_front",
      evidenceFragmentIds: [
        "record-red-pulse",
        "record-front-lunge-short",
      ],
    },
  ],
  availableActions: [
    "player.dodge_side",
    "player.guard_front",
    "player.attack",
  ],
  semanticLabels: [
    {
      semanticId: "enemy.armor_glows_red",
      label: "鎧の継ぎ目が赤く光る",
    },
    {
      semanticId: "enemy.charges_front",
      label: "正面へ突進する",
    },
    { semanticId: "player.dodge_side", label: "横へ回避する" },
    { semanticId: "player.guard_front", label: "正面で防御する" },
    { semanticId: "player.attack", label: "そのまま攻撃する" },
  ],
};

export function getEncounterFragment(
  encounter: EncounterDefinition,
  fragmentId: string,
): ExtractableFragment | null {
  for (const evidence of encounter.evidenceTexts) {
    const match = evidence.fragments.find((item) => item.id === fragmentId);
    if (match) {
      return match;
    }
  }

  return null;
}

export function getSemanticLabel(
  encounter: EncounterDefinition,
  semanticId: SemanticId,
): string {
  return (
    encounter.semanticLabels.find((entry) => entry.semanticId === semanticId)
      ?.label ?? semanticId
  );
}

export function validateHypothesis(
  encounter: EncounterDefinition,
  hypothesis: Hypothesis,
): HypothesisValidationResult {
  const matches = encounter.acceptedInterpretations.filter(
    (interpretation) =>
      interpretation.condition === hypothesis.condition &&
      interpretation.enemyAction === hypothesis.predictedAction,
  );

  return {
    assessment: matches.length > 0 ? "confirmed" : "contradicted",
    matchedInterpretationIds: matches.map((interpretation) => interpretation.id),
  };
}
