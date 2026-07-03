import { describe, expect, it } from "vitest";

import { buildPreparationBattlePlan } from "./preparationBattlePlan";
import { getPreparationSceneSetupKey } from "./PreparationScreenLifecycle";

describe("buildPreparationBattlePlan", () => {
  it("builds battle code from committed preparation cards in order", () => {
    const plan = buildPreparationBattlePlan(
      [
        { id: "attack", command: "攻撃する" },
        { id: "observe", command: "観察する" },
      ],
      { id: "heal", command: "回復する" },
    );

    expect(plan).toEqual({
      cardIds: ["attack", "observe"],
      code: "攻撃する\n観察する",
    });
  });

  it("falls back to the selected card when no card has been committed", () => {
    expect(
      buildPreparationBattlePlan([], { id: "attack", command: "攻撃する" }),
    ).toEqual({
      cardIds: ["attack"],
      code: "攻撃する",
    });
  });
});

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
