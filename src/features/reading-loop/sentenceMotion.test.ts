import { describe, expect, it } from "vitest";
import type { TraceEvent } from "../../readingLoop";
import {
  SENTENCE_MOTION_LABELS,
  getSentenceImpactTargetKeys,
  getSentenceMotionOutcome,
  getSentenceMotionSchedule,
} from "./sentenceMotion";

const successTrace: readonly TraceEvent[] = [
  { type: "omenShown" },
  { type: "conditionMatched", nodeId: "condition:red" },
  { type: "actionStarted", nodeId: "action:dodge" },
  { type: "collision", outcome: "dodged" },
  { type: "result", outcome: "success" },
];

describe("sentence motion schedule", () => {
  it("keeps every required label in causal order", () => {
    const schedule = getSentenceMotionSchedule("success", false);
    const times = SENTENCE_MOTION_LABELS.map(
      (label) => schedule.labels[label],
    );

    expect(times).toEqual([...times].sort((left, right) => left - right));
    expect(schedule.duration).toBeGreaterThan(schedule.labels.rewind);
  });

  it("reduced motion reaches the same final label without movement-length delays", () => {
    const full = getSentenceMotionSchedule("actionFail", false);
    const reduced = getSentenceMotionSchedule("actionFail", true);

    expect(reduced.labels.result).toBeGreaterThan(reduced.labels.action);
    expect(reduced.labels.rewind).toBeGreaterThan(reduced.labels.result);
    expect(reduced.duration).toBeLessThan(full.duration / 4);
  });

  it.each([
    [successTrace, "success"],
    [
      [
        { type: "omenShown" },
        { type: "conditionMissed", nodeId: "condition:red" },
        { type: "result", outcome: "conditionMiss" },
      ] satisfies readonly TraceEvent[],
      "conditionMiss",
    ],
    [
      [
        { type: "omenShown" },
        { type: "conditionMatched", nodeId: "condition:red" },
        { type: "actionStarted", nodeId: "action:guard" },
        { type: "collision", outcome: "blocked" },
        { type: "result", outcome: "actionFail" },
      ] satisfies readonly TraceEvent[],
      "actionFail",
    ],
  ])("reads %s from the battle trace", (trace, expected) => {
    expect(getSentenceMotionOutcome(trace)).toBe(expected);
  });
});

describe("sentence motion impact targets", () => {
  it.each([
    ["success", "player.dodge_side", ["playerAfterimage"]],
    ["success", "player.guard_front", ["shield"]],
    ["success", "player.attack", ["slash"]],
    ["actionFail", "player.dodge_side", ["playerAfterimage", "impact"]],
    ["actionFail", "player.guard_front", ["shield", "impact"]],
    ["actionFail", "player.attack", ["slash", "impact"]],
  ] as const)("%s / %s", (outcome, action, expected) => {
    expect(getSentenceImpactTargetKeys(outcome, action)).toEqual(expected);
  });
});
