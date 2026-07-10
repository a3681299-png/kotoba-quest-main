import { describe, expect, it } from "vitest";

import {
  RED_ARMOR_ENCOUNTER,
  buildStrategySentence,
  validateStrategySentence,
} from "./index";
import type { PlayerActionSemanticId } from "./types";

function run(
  action: PlayerActionSemanticId,
  conditionActive = true,
) {
  return validateStrategySentence({
    encounter: RED_ARMOR_ENCOUNTER,
    sentence: buildStrategySentence("enemy.armor_glows_red", action),
    activeConditions: conditionActive ? ["enemy.armor_glows_red"] : [],
  });
}

function runWithSuccessfulCounters(
  action: PlayerActionSemanticId,
  successfulCounters: readonly PlayerActionSemanticId[],
) {
  return validateStrategySentence({
    encounter: {
      ...RED_ARMOR_ENCOUNTER,
      enemyRule: {
        ...RED_ARMOR_ENCOUNTER.enemyRule,
        successfulCounters,
      },
    },
    sentence: buildStrategySentence("enemy.armor_glows_red", action),
    activeConditions: ["enemy.armor_glows_red"],
  });
}

describe("deterministic reading-loop battle", () => {
  it("keeps grammar validity separate from tactical success", () => {
    const dodge = run("player.dodge_side");
    const guard = run("player.guard_front");
    const attack = run("player.attack");

    expect(dodge.validation).toMatchObject({
      syntaxState: "valid",
      executable: true,
      tacticalStatus: "success",
      success: true,
    });
    expect(guard.validation).toMatchObject({
      syntaxState: "valid",
      executable: true,
      tacticalStatus: "failure",
      success: false,
      reason: "guard_overwhelmed",
    });
    expect(attack.validation).toMatchObject({
      syntaxState: "valid",
      executable: true,
      tacticalStatus: "failure",
      success: false,
      reason: "attack_interrupted",
    });
  });

  it.each([
    ["player.guard_front", "blocked", "guard_held"],
    ["player.attack", "overpowered", "attack_prevailed"],
  ] as const)(
    "uses successfulCounters as the shared success rule for %s",
    (action, collisionOutcome, reason) => {
      const result = runWithSuccessfulCounters(action, [action]);
      const collision = result.traceEvents.find(
        (event) => event.type === "collision",
      );
      const traceResult = result.traceEvents.find(
        (event) => event.type === "result",
      );
      const battleResult = result.events.find(
        (event) => event.type === "battle_resolved",
      );

      expect(collision).toEqual({
        type: "collision",
        outcome: collisionOutcome,
      });
      expect(traceResult).toEqual({ type: "result", outcome: "success" });
      expect(battleResult).toMatchObject({
        type: "battle_resolved",
        success: true,
        reason,
      });
      expect(result.validation).toMatchObject({
        tacticalStatus: "success",
        success: true,
        reason,
      });
    },
  );

  it("reports a late dodge when dodge is not a successful counter", () => {
    const result = runWithSuccessfulCounters("player.dodge_side", []);
    const collision = result.traceEvents.find(
      (event) => event.type === "collision",
    );
    const traceResult = result.traceEvents.find(
      (event) => event.type === "result",
    );

    expect(collision).toEqual({ type: "collision", outcome: "overpowered" });
    expect(traceResult).toEqual({ type: "result", outcome: "actionFail" });
    expect(result.validation).toMatchObject({
      tacticalStatus: "failure",
      success: false,
      reason: "dodge_too_late",
    });
  });

  it("produces exactly the same event sequence for the same input", () => {
    const first = run("player.dodge_side");
    const second = run("player.dodge_side");

    expect(second.events).toEqual(first.events);
    expect(second.causalTrace).toEqual(first.causalTrace);
    expect(second.validation).toEqual(first.validation);
  });

  it("keeps events and validation stable when only semantic labels change", () => {
    const relabeledEncounter = {
      ...RED_ARMOR_ENCOUNTER,
      semanticLabels: RED_ARMOR_ENCOUNTER.semanticLabels.map((entry) => ({
        ...entry,
        label: `別表現の${entry.label}`,
      })),
    };
    const sentence = buildStrategySentence(
      "enemy.armor_glows_red",
      "player.dodge_side",
    );
    const original = validateStrategySentence({
      encounter: RED_ARMOR_ENCOUNTER,
      sentence,
      activeConditions: ["enemy.armor_glows_red"],
    });
    const relabeled = validateStrategySentence({
      encounter: relabeledEncounter,
      sentence,
      activeConditions: ["enemy.armor_glows_red"],
    });

    expect(relabeled.events).toEqual(original.events);
    expect(relabeled.validation).toEqual(original.validation);
  });

  it("triggers the selected action only while its condition is active", () => {
    const active = run("player.dodge_side", true);
    const inactive = run("player.dodge_side", false);

    expect(
      active.events.some((event) => event.type === "strategy_action_triggered"),
    ).toBe(true);
    expect(
      inactive.events.some(
        (event) => event.type === "strategy_action_triggered",
      ),
    ).toBe(false);
    expect(
      inactive.events.some((event) => event.type === "player_action_resolved"),
    ).toBe(false);
    expect(inactive.validation).toMatchObject({
      conditionMatched: false,
      strategyTriggered: false,
      tacticalStatus: "not_triggered",
      reason: "condition_not_met",
    });
  });

  it("resolves red armor, side dodge, missed charge, and a counter window in order", () => {
    const result = run("player.dodge_side");

    expect(result.events.map((event) => event.type)).toEqual([
      "enemy_signal_observed",
      "strategy_condition_evaluated",
      "strategy_action_triggered",
      "player_action_resolved",
      "enemy_action_resolved",
      "charge_evaded",
      "counter_opportunity_created",
      "battle_resolved",
    ]);
    expect(result.events[4]?.turn).toBe(2);
    expect(result.validation.reason).toBe("charge_evaded");
  });

  it.each([
    ["player.guard_front", "guard_overwhelmed"],
    ["player.attack", "attack_interrupted"],
  ] as const)(
    "records why the grammatically valid %s strategy failed",
    (action, reason) => {
      const result = run(action);

      expect(result.validation).toMatchObject({
        syntaxState: "valid",
        tacticalStatus: "failure",
        reason,
      });
      expect(result.causalTrace.steps).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "condition_evaluation",
            matched: true,
          }),
          expect.objectContaining({
            type: "action_activation",
            action,
            activated: true,
          }),
          expect.objectContaining({
            type: "outcome",
            success: false,
            reason,
          }),
        ]),
      );
    },
  );

  it.each([
    ["player.dodge_side", true, "success"],
    ["player.dodge_side", false, "conditionMiss"],
    ["player.guard_front", true, "actionFail"],
  ] as const)(
    "exposes the %s / condition=%s result as a director trace",
    (action, conditionActive, expectedOutcome) => {
      const result = run(action, conditionActive);
      const finalEvent = result.traceEvents[result.traceEvents.length - 1];

      expect(result.ruleGraph).not.toBeNull();
      expect(finalEvent).toEqual({
        type: "result",
        outcome: expectedOutcome,
      });
    },
  );

  it("refuses to execute a syntactically incomplete sentence", () => {
    const result = validateStrategySentence({
      encounter: RED_ARMOR_ENCOUNTER,
      sentence: {
        parts: [
          { kind: "condition", semanticId: "enemy.armor_glows_red" },
        ],
      },
      activeConditions: ["enemy.armor_glows_red"],
    });

    expect(result.events).toEqual([]);
    expect(result.ruleGraph).toBeNull();
    expect(result.traceEvents).toEqual([]);
    expect(result.validation).toMatchObject({
      syntaxState: "incomplete",
      executable: false,
      tacticalStatus: "not_evaluated",
    });
  });
});
