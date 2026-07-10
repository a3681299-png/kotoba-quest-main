import type {
  ConditionSemanticId,
  ParsedCondition,
  ParsedPlayerAction,
  ParsedStrategy,
  PlayerActionSemanticId,
  StrategyAnalysis,
  StrategySentence,
  StrategySentencePart,
} from "./types";

const EXPECTED_PARTS: readonly StrategySentencePart["kind"][] = [
  "condition",
  "connector",
  "action",
];

function parsePlayerAction(
  semanticId: PlayerActionSemanticId,
): ParsedPlayerAction {
  switch (semanticId) {
    case "player.dodge_side":
      return {
        actor: "player",
        type: "dodge",
        direction: "side",
        semanticId,
      };
    case "player.guard_front":
      return {
        actor: "player",
        type: "guard",
        direction: "front",
        semanticId,
      };
    case "player.attack":
      return {
        actor: "player",
        type: "attack",
        semanticId,
      };
  }
}

function parseCondition(semanticId: ConditionSemanticId): ParsedCondition {
  switch (semanticId) {
    case "enemy.armor_glows_red":
      return {
        subject: "enemy",
        event: "armor_glows_red",
        semanticId,
      };
    case "enemy.eyes_glow_blue":
      return {
        subject: "enemy",
        event: "eyes_glow_blue",
        semanticId,
      };
  }
}

export function buildStrategySentence(
  condition: ConditionSemanticId,
  action: PlayerActionSemanticId,
  sourceFragmentId?: string,
): StrategySentence {
  return {
    parts: [
      {
        kind: "condition",
        semanticId: condition,
        ...(sourceFragmentId ? { sourceFragmentId } : {}),
      },
      { kind: "connector", semanticId: "syntax.if_then" },
      { kind: "action", semanticId: action },
    ],
  };
}

export function parseStrategySentence(
  sentence: StrategySentence,
): StrategyAnalysis {
  if (sentence.parts.length === 0) {
    return {
      state: "building",
      expectedNext: "condition",
    };
  }

  if (sentence.parts.length > EXPECTED_PARTS.length) {
    return {
      state: "invalid",
      expectedNext: null,
      issue: "作戦文に余分な断片があります。",
    };
  }

  const invalidIndex = sentence.parts.findIndex(
    (part, index) => part.kind !== EXPECTED_PARTS[index],
  );

  if (invalidIndex >= 0) {
    return {
      state: "invalid",
      expectedNext: null,
      issue: `${invalidIndex + 1}番目の断片が文の軌道と一致しません。`,
    };
  }

  if (sentence.parts.length < EXPECTED_PARTS.length) {
    return {
      state: "incomplete",
      expectedNext: EXPECTED_PARTS[sentence.parts.length] as
        | "connector"
        | "action",
    };
  }

  const conditionPart = sentence.parts[0];
  const connectorPart = sentence.parts[1];
  const actionPart = sentence.parts[2];

  if (
    conditionPart.kind !== "condition" ||
    connectorPart.kind !== "connector" ||
    actionPart.kind !== "action"
  ) {
    return {
      state: "invalid",
      expectedNext: null,
      issue: "条件、接続、行動の順に断片を置いてください。",
    };
  }

  const parsed: ParsedStrategy = {
    type: "conditional",
    condition: parseCondition(conditionPart.semanticId),
    action: parsePlayerAction(actionPart.semanticId),
  };

  return {
    state: "valid",
    expectedNext: null,
    parsed,
  };
}
