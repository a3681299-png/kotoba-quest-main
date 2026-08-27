import { createStrategySentence } from "./grammar";
import type { WordQuestRunState } from "./types";

export const WORD_QUEST_SAVE_KEY = "kotoba-quest.word-run.v1";

export function serializeWordQuestRun(run: WordQuestRunState): string {
  return JSON.stringify(run);
}

function isRunState(value: unknown): value is WordQuestRunState {
  if (!value || typeof value !== "object") return false;
  const run = value as Partial<WordQuestRunState>;
  return (
    run.version === 1 &&
    typeof run.seed === "string" &&
    Array.isArray(run.encounterOrder) &&
    typeof run.battleIndex === "number" &&
    Boolean(run.player) &&
    typeof run.player?.actionPoints === "number" &&
    Boolean(run.inventory) &&
    Array.isArray(run.strategies) &&
    Boolean(run.currentBattle) &&
    typeof run.currentBattle?.emberStacks === "number" &&
    Array.isArray(run.history)
  );
}

export function restoreWordQuestRun(
  serialized: string | null,
): WordQuestRunState | null {
  if (!serialized) return null;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isRunState(parsed)) return null;
    return {
      ...parsed,
      strategies: [{ ...(parsed.strategies[0] ?? createStrategySentence(0)) }],
      currentBattle: {
        ...parsed.currentBattle,
        usedPlayerActions: Array.isArray(parsed.currentBattle.usedPlayerActions)
          ? [...parsed.currentBattle.usedPlayerActions]
          : [],
      },
    };
  } catch {
    return null;
  }
}
