import { describe, expect, it } from "vitest";

import {
  RED_ARMOR_ENCOUNTER,
  buildRuleGraph,
  buildRuleGraphFromSentence,
  buildStrategySentence,
  createRuleGraph,
  generateTraceEvents,
  parseStrategySentence,
} from "./index";
import type { PlayerActionSemanticId } from "./types";

function graphFor(actionId: PlayerActionSemanticId) {
  return createRuleGraph("enemy.armor_glows_red", actionId);
}

describe("reading-loop rule graph", () => {
  it("builds the same graph from semantic IDs, a parsed strategy, and a sentence", () => {
    const sentence = buildStrategySentence(
      "enemy.armor_glows_red",
      "player.dodge_side",
    );
    const analysis = parseStrategySentence(sentence);

    expect(analysis.state).toBe("valid");
    if (analysis.state !== "valid") {
      throw new Error("Expected a valid strategy");
    }

    const expected = graphFor("player.dodge_side");
    expect(buildRuleGraph(analysis.parsed)).toEqual(expected);
    expect(buildRuleGraphFromSentence(sentence)).toEqual(expected);
    expect(buildRuleGraphFromSentence({ parts: [] })).toBeNull();
    expect(expected).toEqual({
      conditionNode: {
        id: "condition:enemy.armor_glows_red",
        meaningId: "enemy.armor_glows_red",
      },
      connector: "then",
      actionNode: {
        id: "action:player.dodge_side",
        actionId: "player.dodge_side",
      },
    });
  });

  it("generates the exact successful trace deterministically", () => {
    const ruleGraph = graphFor("player.dodge_side");
    const input = {
      encounter: RED_ARMOR_ENCOUNTER,
      ruleGraph,
      activeConditions: ["enemy.armor_glows_red"] as const,
    };
    const expected = [
      { type: "omenShown" },
      {
        type: "conditionMatched",
        nodeId: ruleGraph.conditionNode.id,
      },
      { type: "actionStarted", nodeId: ruleGraph.actionNode.id },
      { type: "collision", outcome: "dodged" },
      { type: "result", outcome: "success" },
    ];

    expect(generateTraceEvents(input)).toEqual(expected);
    expect(generateTraceEvents(input)).toEqual(expected);
  });

  it("stops at the condition node when the omen does not match", () => {
    const ruleGraph = graphFor("player.dodge_side");

    expect(
      generateTraceEvents({
        encounter: RED_ARMOR_ENCOUNTER,
        ruleGraph,
        activeConditions: [],
      }),
    ).toEqual([
      { type: "omenShown" },
      {
        type: "conditionMissed",
        nodeId: ruleGraph.conditionNode.id,
      },
      { type: "result", outcome: "conditionMiss" },
    ]);
  });

  it.each([
    ["player.guard_front", "blocked"],
    ["player.attack", "overpowered"],
  ] as const)(
    "distinguishes the %s action failure at collision",
    (actionId, collision) => {
      const ruleGraph = graphFor(actionId);

      expect(
        generateTraceEvents({
          encounter: RED_ARMOR_ENCOUNTER,
          ruleGraph,
          activeConditions: ["enemy.armor_glows_red"],
        }),
      ).toEqual([
        { type: "omenShown" },
        {
          type: "conditionMatched",
          nodeId: ruleGraph.conditionNode.id,
        },
        { type: "actionStarted", nodeId: ruleGraph.actionNode.id },
        { type: "collision", outcome: collision },
        { type: "result", outcome: "actionFail" },
      ]);
    },
  );
});
