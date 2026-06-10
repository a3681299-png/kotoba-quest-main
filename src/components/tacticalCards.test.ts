import { describe, expect, it } from "vitest";

import {
  appendCardSelection,
  buildCodeFromCardSelection,
  getTacticalCardsForStage,
  removeCardSelection,
} from "./tacticalCards";

describe("tactical card code builder", () => {
  it("builds generated code from cards in selected order", () => {
    const cards = getTacticalCardsForStage(1);
    const selectedIds = ["attack", "heal", "attack"];

    expect(buildCodeFromCardSelection(cards, selectedIds)).toBe(`攻撃する
回復する
攻撃する`);
  });

  it("offers condition and else cards for the condition tutorial", () => {
    const cards = getTacticalCardsForStage(2);

    expect(cards.map((card) => card.id)).toEqual([
      "if-low-hp-attack",
      "else-observe",
      "observe",
      "attack",
    ]);
  });

  it("appends and removes selected card ids without mutating the input", () => {
    const original = ["attack", "heal"];

    expect(appendCardSelection(original, "attack")).toEqual([
      "attack",
      "heal",
      "attack",
    ]);
    expect(removeCardSelection(original, 0)).toEqual(["heal"]);
    expect(original).toEqual(["attack", "heal"]);
  });
});
