import { describe, expect, it } from "vitest";

import {
  RED_ARMOR_ENCOUNTER,
  buildStrategySentence,
  createReadingLoopSession,
  transitionReadingLoopSession,
  validateStrategySentence,
} from "./index";
import type {
  ReadingLoopAction,
  ReadingLoopSession,
} from "./types";

function transition(
  state: ReadingLoopSession,
  action: ReadingLoopAction,
): ReadingLoopSession {
  return transitionReadingLoopSession(RED_ARMOR_ENCOUNTER, state, action);
}

describe("reading-loop session transitions", () => {
  it("keeps observation, extraction, hypothesis, strategy, and trace when editing again", () => {
    const failedBattle = validateStrategySentence({
      encounter: RED_ARMOR_ENCOUNTER,
      sentence: buildStrategySentence(
        "enemy.armor_glows_red",
        "player.guard_front",
      ),
      activeConditions: ["enemy.armor_glows_red"],
    });

    let state = createReadingLoopSession(RED_ARMOR_ENCOUNTER.id);
    state = transition(state, {
      type: "record_observation",
      events: failedBattle.events,
    });
    state = transition(state, { type: "advance_to_reading" });
    state = transition(state, {
      type: "extract_fragment",
      fragmentId: "record-red-seams",
    });
    state = transition(state, {
      type: "extract_fragment",
      fragmentId: "record-front-lunge",
    });
    state = transition(state, {
      type: "set_hypothesis",
      hypothesis: {
        type: "enemy_rule",
        condition: "enemy.armor_glows_red",
        predictedAction: "enemy.charges_front",
        evidenceFragmentIds: ["record-red-seams", "record-front-lunge"],
      },
    });
    state = transition(state, { type: "advance_to_strategy" });
    state = transition(state, {
      type: "set_strategy_sentence",
      sentence: buildStrategySentence(
        "enemy.armor_glows_red",
        "player.guard_front",
      ),
    });
    state = transition(state, { type: "begin_execution", runId: "run-1" });
    state = transition(state, {
      type: "record_validation",
      runId: "run-1",
      result: failedBattle,
    });

    expect(state).toMatchObject({
      phase: "validation",
      hypothesisAssessment: "confirmed",
      strategyAssessment: "refuted",
      attempts: 1,
    });
    expect(state.lastBattle?.causalTrace).toEqual(failedBattle.causalTrace);

    state = transition(state, { type: "return_to_strategy" });

    expect(state.phase).toBe("strategy");
    expect(state.observedEvents).toEqual(failedBattle.events);
    expect(state.extractedFragmentIds).toEqual([
      "record-red-seams",
      "record-front-lunge",
    ]);
    expect(state.hypothesis).toMatchObject({
      condition: "enemy.armor_glows_red",
      predictedAction: "enemy.charges_front",
    });
    expect(state.strategySentence).toEqual(
      buildStrategySentence(
        "enemy.armor_glows_red",
        "player.guard_front",
      ),
    );
    expect(state.lastBattle).toEqual(failedBattle);

    state = transition(state, {
      type: "set_strategy_sentence",
      sentence: buildStrategySentence(
        "enemy.armor_glows_red",
        "player.dodge_side",
      ),
    });

    expect(state.syntaxState).toBe("valid");
    expect(state.strategyAssessment).toBe("unverified");
    expect(state.lastBattle).toEqual(failedBattle);
  });

  it("does not skip phases or execute a non-executable sentence", () => {
    const initial = createReadingLoopSession(RED_ARMOR_ENCOUNTER.id);
    const skipped = transition(initial, { type: "advance_to_strategy" });
    const incomplete = validateStrategySentence({
      encounter: RED_ARMOR_ENCOUNTER,
      sentence: { parts: [] },
      activeConditions: ["enemy.armor_glows_red"],
    });
    const executed = transition(skipped, {
      type: "record_validation",
      runId: "run-never-started",
      result: incomplete,
    });

    expect(skipped).toBe(initial);
    expect(executed).toBe(initial);
  });

  it("distinguishes incomplete, complete, and running strategy states", () => {
    let state: ReadingLoopSession = {
      ...createReadingLoopSession(RED_ARMOR_ENCOUNTER.id),
      phase: "strategy",
    };

    expect(state.execution.status).toBe("incomplete");

    state = transition(state, {
      type: "set_strategy_sentence",
      sentence: buildStrategySentence(
        "enemy.armor_glows_red",
        "player.dodge_side",
      ),
    });
    expect(state.execution.status).toBe("complete");

    state = transition(state, { type: "begin_execution", runId: "run-1" });
    expect(state.execution).toMatchObject({
      status: "running",
      activeRunId: "run-1",
    });

    const duplicate = transition(state, {
      type: "begin_execution",
      runId: "run-2",
    });
    const lockedEdit = transition(state, {
      type: "set_strategy_sentence",
      sentence: buildStrategySentence(
        "enemy.armor_glows_red",
        "player.guard_front",
      ),
    });

    expect(duplicate).toBe(state);
    expect(lockedEdit).toBe(state);
  });

  it("cancels one run and ignores stale results without losing the strategy", () => {
    const failedBattle = validateStrategySentence({
      encounter: RED_ARMOR_ENCOUNTER,
      sentence: buildStrategySentence(
        "enemy.armor_glows_red",
        "player.guard_front",
      ),
      activeConditions: ["enemy.armor_glows_red"],
    });
    let state: ReadingLoopSession = {
      ...createReadingLoopSession(RED_ARMOR_ENCOUNTER.id),
      phase: "strategy",
    };
    state = transition(state, {
      type: "set_strategy_sentence",
      sentence: buildStrategySentence(
        "enemy.armor_glows_red",
        "player.guard_front",
      ),
    });
    state = transition(state, { type: "begin_execution", runId: "run-1" });

    expect(
      transition(state, { type: "cancel_execution", runId: "other-run" }),
    ).toBe(state);

    const selectedSentence = state.strategySentence;
    state = transition(state, { type: "cancel_execution", runId: "run-1" });
    expect(state.execution).toMatchObject({
      status: "complete",
      activeRunId: null,
      cancelledRunId: "run-1",
    });
    expect(state.strategySentence).toBe(selectedSentence);

    const staleAfterCancel = transition(state, {
      type: "record_validation",
      runId: "run-1",
      result: failedBattle,
    });
    expect(staleAfterCancel).toBe(state);

    state = transition(state, { type: "begin_execution", runId: "run-2" });
    const wrongRun = transition(state, {
      type: "record_validation",
      runId: "run-1",
      result: failedBattle,
    });
    expect(wrongRun).toBe(state);

    state = transition(state, {
      type: "record_validation",
      runId: "run-2",
      result: failedBattle,
    });
    expect(state.phase).toBe("validation");

    state = transition(state, { type: "return_to_strategy" });
    expect(state.strategySentence).toBe(selectedSentence);
    expect(state.execution.status).toBe("complete");
    expect(state.lastBattle).toBe(failedBattle);
  });
});
