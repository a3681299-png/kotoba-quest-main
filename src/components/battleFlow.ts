import type { PreparationBattlePlan } from "./preparationBattlePlan";

export type ScreenMode = "intro" | "preparation" | "battle";

export type BattleFlowState = {
  screenMode: ScreenMode;
  stageIndex: number;
  preparedBattlePlan: PreparationBattlePlan | null;
};

export const initialBattleFlowState: BattleFlowState = {
  screenMode: "intro",
  stageIndex: 0,
  preparedBattlePlan: null,
};

export function openPreparation(
  state: BattleFlowState,
): BattleFlowState {
  return {
    ...state,
    screenMode: "preparation",
  };
}

export function startPreparedBattle(
  state: BattleFlowState,
  preparedBattlePlan: PreparationBattlePlan,
): BattleFlowState {
  return {
    ...state,
    screenMode: "battle",
    preparedBattlePlan,
  };
}

export function advanceToStageIntro(
  state: BattleFlowState,
  stageIndex: number,
): BattleFlowState {
  return {
    ...state,
    screenMode: "intro",
    stageIndex,
    preparedBattlePlan: null,
  };
}
export function returnToPreparation(
  state: BattleFlowState,
): BattleFlowState {
  return {
    ...state,
    screenMode: "preparation",
    preparedBattlePlan: null,
  };
}
