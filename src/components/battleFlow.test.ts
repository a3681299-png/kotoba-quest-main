import { describe, expect, it } from "vitest";

import {
  advanceToStageIntro,
  initialBattleFlowState,
  openPreparation,
  returnToPreparation,
  startPreparedBattle,
  type BattleFlowState,
} from "./battleFlow";

const preparedPlan = {
  cardIds: ["attack"],
  code: "攻撃する",
};

describe("battle flow", () => {
  it("opens preparation after the stage intro", () => {
    expect(openPreparation(initialBattleFlowState)).toEqual({
      screenMode: "preparation",
      stageIndex: 0,
      preparedBattlePlan: null,
    });
  });

  it("starts battle with the prepared plan for the current stage", () => {
    expect(startPreparedBattle(initialBattleFlowState, preparedPlan)).toEqual({
      screenMode: "battle",
      stageIndex: 0,
      preparedBattlePlan: preparedPlan,
    });
  });

  it("returns to preparation and clears the old plan after an unfinished battle turn", () => {
    const currentState: BattleFlowState = {
      screenMode: "battle",
      stageIndex: 2,
      preparedBattlePlan: preparedPlan,
    };

    expect(returnToPreparation(currentState)).toEqual({
      screenMode: "preparation",
      stageIndex: 2,
      preparedBattlePlan: null,
    });
  });

  it("clears the old plan and returns to intro when advancing stages", () => {
    const currentState: BattleFlowState = {
      screenMode: "battle",
      stageIndex: 0,
      preparedBattlePlan: preparedPlan,
    };

    expect(advanceToStageIntro(currentState, 1)).toEqual({
      screenMode: "intro",
      stageIndex: 1,
      preparedBattlePlan: null,
    });
  });
});
