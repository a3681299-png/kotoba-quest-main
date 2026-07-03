import { describe, expect, it } from "vitest";

import { getPreparationCardsForStage } from "./preparationCards";

describe("getPreparationCardsForStage", () => {
  it("uses stage-specific preparation cards instead of the same fixed hand", () => {
    expect(getPreparationCardsForStage(3).map((card) => card.id)).toContain(
      "repeat-attack",
    );
    expect(getPreparationCardsForStage(4).map((card) => card.id)).toContain(
      "record-words",
    );
    expect(getPreparationCardsForStage(5).map((card) => card.id)).toContain(
      "plan-a",
    );
  });

  it("keeps the preparation hand to the tabletop card count", () => {
    expect(getPreparationCardsForStage(3)).toHaveLength(5);
  });
});
