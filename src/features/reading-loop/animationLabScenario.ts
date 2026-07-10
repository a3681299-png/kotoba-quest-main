import {
  RED_ARMOR_ENCOUNTER,
  buildStrategySentence,
  getSemanticLabel,
  parseStrategySentence,
  simulateBattle,
  type BattleSimulationResult,
  type ConditionSemanticId,
  type EncounterDefinition,
  type PlayerActionSemanticId,
} from "../../readingLoop";
import type { SentenceMotionOutcome } from "./sentenceMotion";

export const ANIMATION_LAB_MISREAD_CONDITION =
  "enemy.eyes_glow_blue" as const;

export const ANIMATION_LAB_ENCOUNTER: EncounterDefinition = {
  ...RED_ARMOR_ENCOUNTER,
  semanticLabels: [
    ...RED_ARMOR_ENCOUNTER.semanticLabels,
    {
      semanticId: ANIMATION_LAB_MISREAD_CONDITION,
      label: "目が青く光る",
    },
  ],
};

export const ANIMATION_LAB_ACTIVE_CONDITIONS = [
  RED_ARMOR_ENCOUNTER.enemyRule.condition,
] as const;

export function getAnimationLabCondition(
  outcome: SentenceMotionOutcome,
): ConditionSemanticId {
  return outcome === "conditionMiss"
    ? ANIMATION_LAB_MISREAD_CONDITION
    : RED_ARMOR_ENCOUNTER.enemyRule.condition;
}

export function getAnimationLabConditionLabel(
  outcome: SentenceMotionOutcome,
): string {
  return getSemanticLabel(
    ANIMATION_LAB_ENCOUNTER,
    getAnimationLabCondition(outcome),
  );
}

export function simulateAnimationLabScenario(
  outcome: SentenceMotionOutcome,
  action: PlayerActionSemanticId,
): BattleSimulationResult {
  const analysis = parseStrategySentence(
    buildStrategySentence(getAnimationLabCondition(outcome), action),
  );

  if (analysis.state !== "valid") {
    throw new Error("Animation Lab scenario must produce a valid sentence.");
  }

  return simulateBattle({
    encounter: ANIMATION_LAB_ENCOUNTER,
    strategy: analysis.parsed,
    activeConditions: ANIMATION_LAB_ACTIVE_CONDITIONS,
  });
}
