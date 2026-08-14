import { describe, expect, it } from "vitest";
import {
  createStrategySentence,
  setSentenceSlot,
} from "../../wordQuest";
import { countUsedVocabularySlots } from "./wordQuestUiMeta";

describe("word quest UI resource counts", () => {
  it("starts with full vocabulary and counts each newly placed word", () => {
    const initial = createStrategySentence(0);
    const withCondition = setSentenceSlot(
      initial,
      "condition",
      "condition.always",
    );
    const withAction = setSentenceSlot(
      withCondition,
      "action",
      "action.attack",
    );

    expect(countUsedVocabularySlots([initial])).toBe(0);
    expect(countUsedVocabularySlots([withCondition])).toBe(1);
    expect(countUsedVocabularySlots([withAction])).toBe(2);
  });

  it("counts the same vocabulary once for each sentence that uses it", () => {
    const first = setSentenceSlot(
      createStrategySentence(0),
      "condition",
      "condition.always",
    );
    const second = setSentenceSlot(
      createStrategySentence(1),
      "condition",
      "condition.always",
    );

    expect(countUsedVocabularySlots([first, second])).toBe(2);
    expect(countUsedVocabularySlots([createStrategySentence(0)])).toBe(0);
  });
});
