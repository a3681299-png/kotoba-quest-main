import { describe, expect, it } from "vitest";

import {
  appendCardSelection,
  buildCodeFromCardSelection,
  getAllTacticalCards,
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

  it("keeps every card visible while marking condition cards as contextual", () => {
    const cards = getTacticalCardsForStage(2);
    const allCards = getAllTacticalCards();

    expect(cards.map((card) => card.id).sort()).toEqual(
      allCards.map((card) => card.id).sort(),
    );
    expect(cards.filter((card) => card.isRecommended).map((card) => card.id)).toEqual([
      "if-low-hp-attack",
      "else-observe",
      "observe",
      "attack",
    ]);
    expect(cards.find((card) => card.id === "record-words")?.isRecommended).toBe(
      false,
    );
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
