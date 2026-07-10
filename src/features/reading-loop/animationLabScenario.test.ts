import { describe, expect, it } from "vitest";
import {
  RED_ARMOR_ENCOUNTER,
  buildStrategySentence,
  parseStrategySentence,
} from "../../readingLoop";
import {
  ANIMATION_LAB_ACTIVE_CONDITIONS,
  ANIMATION_LAB_ENCOUNTER,
  ANIMATION_LAB_MISREAD_CONDITION,
  getAnimationLabConditionLabel,
  simulateAnimationLabScenario,
} from "./animationLabScenario";

describe("Animation Lab condition-miss fixture", () => {
  it("keeps the live red omen while labeling only the miss sentence as a blue-eye misread", () => {
    expect(ANIMATION_LAB_ACTIVE_CONDITIONS).toEqual([
      "enemy.armor_glows_red",
    ]);
    expect(getAnimationLabConditionLabel("success")).toBe(
      "鎧の継ぎ目が赤く光る",
    );
    expect(getAnimationLabConditionLabel("actionFail")).toBe(
      "鎧の継ぎ目が赤く光る",
    );
    expect(getAnimationLabConditionLabel("conditionMiss")).toBe(
      "目が青く光る",
    );
    expect(
      ANIMATION_LAB_ENCOUNTER.semanticLabels.find(
        ({ semanticId }) => semanticId === ANIMATION_LAB_MISREAD_CONDITION,
      ),
    ).toEqual({
      semanticId: "enemy.eyes_glow_blue",
      label: "目が青く光る",
    });
    expect(
      RED_ARMOR_ENCOUNTER.semanticLabels.some(
        ({ semanticId }) => semanticId === ANIMATION_LAB_MISREAD_CONDITION,
      ),
    ).toBe(false);
  });

  it("parses the misread meaning into its matching domain event", () => {
    const analysis = parseStrategySentence(
      buildStrategySentence(
        ANIMATION_LAB_MISREAD_CONDITION,
        "player.dodge_side",
      ),
    );

    expect(analysis.state).toBe("valid");
    if (analysis.state === "valid") {
      expect(analysis.parsed.condition).toEqual({
        subject: "enemy",
        event: "eyes_glow_blue",
        semanticId: "enemy.eyes_glow_blue",
      });
    }
  });

  it("stops the trace at the blue-eye condition while the red omen is active", () => {
    const result = simulateAnimationLabScenario(
      "conditionMiss",
      "player.dodge_side",
    );

    expect(result.ruleGraph).toEqual({
      conditionNode: {
        id: "condition:enemy.eyes_glow_blue",
        meaningId: "enemy.eyes_glow_blue",
      },
      connector: "then",
      actionNode: {
        id: "action:player.dodge_side",
        actionId: "player.dodge_side",
      },
    });
    expect(result.traceEvents).toEqual([
      { type: "omenShown" },
      {
        type: "conditionMissed",
        nodeId: "condition:enemy.eyes_glow_blue",
      },
      { type: "result", outcome: "conditionMiss" },
    ]);
    expect(result.validation).toMatchObject({
      conditionMatched: false,
      strategyTriggered: false,
      reason: "condition_not_met",
    });
  });
});
