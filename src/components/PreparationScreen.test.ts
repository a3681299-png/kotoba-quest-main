import { describe, expect, it } from "vitest";

import { getPreparationSceneSetupKey } from "./PreparationScreenLifecycle";

describe("getPreparationSceneSetupKey", () => {
  it("keeps the scene setup stable when only the selected card changes", () => {
    const onCardSelect = () => undefined;

    expect(
      getPreparationSceneSetupKey({
        selectedCardId: "attack",
        onCardSelect,
      }),
    ).toBe(
      getPreparationSceneSetupKey({
        selectedCardId: "heal",
        onCardSelect,
      }),
    );
  });

  it("changes only when the scene callback identity changes", () => {
    const firstOnCardSelect = () => undefined;
    const nextOnCardSelect = () => undefined;

    expect(
      getPreparationSceneSetupKey({
        selectedCardId: "attack",
        onCardSelect: firstOnCardSelect,
      }),
    ).not.toBe(
      getPreparationSceneSetupKey({
        selectedCardId: "attack",
        onCardSelect: nextOnCardSelect,
      }),
    );
  });
});
