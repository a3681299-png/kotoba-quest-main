import { describe, expect, it } from "vitest";

import { getBattleFieldPresentation } from "./battlePresentation";

describe("getBattleFieldPresentation", () => {
  it("marks code execution as an active casting presentation", () => {
    expect(getBattleFieldPresentation("executing")).toEqual({
      className: "battle-field phase-executing",
      overlayLabel: "コード詠唱中",
    });
  });

  it("marks enemy turns as a danger presentation", () => {
    expect(getBattleFieldPresentation("enemy_turn")).toEqual({
      className: "battle-field phase-enemy-turn",
      overlayLabel: "敵行動中",
    });
  });

  it("keeps the player turn calm and readable", () => {
    expect(getBattleFieldPresentation("player_turn")).toEqual({
      className: "battle-field phase-player-turn",
      overlayLabel: "入力待機中",
    });
  });
});
