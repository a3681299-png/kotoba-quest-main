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
    Boolean(run.inventory) &&
    Array.isArray(run.strategies) &&
    Boolean(run.currentBattle) &&
    Array.isArray(run.history)
  );
}

export function restoreWordQuestRun(
  serialized: string | null,
): WordQuestRunState | null {
  if (!serialized) return null;
  try {
    const parsed: unknown = JSON.parse(serialized);
    return isRunState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
