import { describe, expect, it } from "vitest";
import {
  getMotionStatusText,
  isPeriodEnabled,
} from "./liveSentenceState";

describe("period availability", () => {
  it("enables execution only after the complete sentence and battlefield are ready", () => {
    expect(
      isPeriodEnabled({
        sentenceComplete: true,
        sceneReady: true,
        controlsLocked: false,
      }),
    ).toBe(true);
  });

  it.each([
    { sentenceComplete: false, sceneReady: true, controlsLocked: false },
    { sentenceComplete: true, sceneReady: false, controlsLocked: false },
    { sentenceComplete: true, sceneReady: true, controlsLocked: true },
  ])("rejects an unavailable execution state", (input) => {
    expect(isPeriodEnabled(input)).toBe(false);
  });
});
describe("motion status announcement", () => {
  const result = {
    resultTitle: "突進が空を切った",
    resultDetail: "横のレーンへ外れた。",
  };

  it("announces the causal result when the timeline reaches its result label", () => {
    expect(
      getMotionStatusText({
        isExecuting: true,
        activeLabel: "result",
        hasDisplayedOutcome: true,
        reviewMode: false,
        ...result,
      }),
    ).toBe("実行結果：突進が空を切った。横のレーンへ外れた。");
  });

  it("does not announce a result before the result label", () => {
    expect(
      getMotionStatusText({
        isExecuting: true,
        activeLabel: "impact",
        hasDisplayedOutcome: false,
        reviewMode: false,
        ...result,
      }),
    ).toBe("実行中：impact");
  });

  it("keeps the final title available in review mode", () => {
    expect(
      getMotionStatusText({
        isExecuting: false,
        activeLabel: "editing",
        hasDisplayedOutcome: true,
        reviewMode: true,
        ...result,
      }),
    ).toBe("突進が空を切った");
  });
});
