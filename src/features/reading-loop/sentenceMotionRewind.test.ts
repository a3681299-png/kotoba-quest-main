import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TraceEvent } from "../../readingLoop";

const motionMocks = vi.hoisted(() => ({
  timelineCalls: [] as Array<{
    callback: () => void;
    position: string | number | undefined;
  }>,
  timelineTweens: [] as Array<{
    target: unknown;
    vars: unknown;
    position: string | number | undefined;
  }>,
  set: vi.fn(),
  resetBattlefieldTargets: vi.fn(),
}));

vi.mock("gsap", () => ({
  gsap: {
    registerPlugin: vi.fn(),
    set: motionMocks.set,
    timeline: () => {
      const timeline = {
        addLabel: vi.fn(() => timeline),
        call: vi.fn(
          (
            callback: () => void,
            _params: readonly unknown[],
            position?: string | number,
          ) => {
            motionMocks.timelineCalls.push({ callback, position });
            return timeline;
          },
        ),
        to: vi.fn(
          (target: unknown, vars: unknown, position?: string | number) => {
            motionMocks.timelineTweens.push({ target, vars, position });
            return timeline;
          },
        ),
        play: vi.fn(),
        pause: vi.fn(),
        restart: vi.fn(),
        seek: vi.fn(),
        timeScale: vi.fn(),
        progress: vi.fn(),
        kill: vi.fn(),
        duration: vi.fn(() => 5),
      };
      return timeline;
    },
  },
}));

vi.mock("gsap/PixiPlugin", () => ({
  PixiPlugin: {
    registerPIXI: vi.fn(),
  },
}));

vi.mock("pixi.js", () => ({}));

vi.mock("./LiveBattlefield", () => ({
  resetBattlefieldTargets: motionMocks.resetBattlefieldTargets,
}));

import { createSentenceMotionDirector } from "./sentenceMotion";

function createDomRoot() {
  const nodes = {
    condition: {},
    connector: {},
    connectorPath: {},
    action: {},
    period: {},
    periodRing: {},
    lockShade: {},
    result: {},
    breakMark: {},
  };
  const selectors = new Map<string, object>([
    ['[data-motion-id="condition-text"]', nodes.condition],
    ['[data-motion-id="connector-text"]', nodes.connector],
    ['[data-motion-id="connector-line"]', nodes.connectorPath],
    ['[data-motion-id="action-text"]', nodes.action],
    ['[data-motion-id="period-trigger"]', nodes.period],
    ['[data-motion-id="period-ring"]', nodes.periodRing],
    ['[data-motion-id="battle-lock"]', nodes.lockShade],
    ['[data-motion-id="motion-result"]', nodes.result],
    ['[data-motion-id="connector-break"]', nodes.breakMark],
  ]);
  const root = {
    querySelector: (selector: string) => selectors.get(selector) ?? null,
  };
  return { root, nodes };
}

function createBattlefield() {
  return {
    home: {
      playerX: 120,
      playerY: 240,
      playerScale: 1,
      enemyX: 520,
      enemyY: 240,
      enemyScale: 1,
    },
    world: {},
    player: {},
    playerAfterimage: {},
    playerShadow: {},
    enemy: {},
    enemyShadow: {},
    enemyOmen: {},
    shield: {},
    slash: {},
    impact: {},
    dust: {},
  };
}

function failureTrace(
  outcome: "conditionMiss" | "actionFail",
): readonly TraceEvent[] {
  if (outcome === "conditionMiss") {
    return [
      { type: "omenShown" },
      { type: "conditionMissed", nodeId: "condition:red" },
      { type: "result", outcome },
    ];
  }
  return [
    { type: "omenShown" },
    { type: "conditionMatched", nodeId: "condition:red" },
    { type: "actionStarted", nodeId: "action:guard" },
    { type: "collision", outcome: "blocked" },
    { type: "result", outcome },
  ];
}

const successTrace: readonly TraceEvent[] = [
  { type: "omenShown" },
  { type: "conditionMatched", nodeId: "condition:red" },
  { type: "actionStarted", nodeId: "action:dodge" },
  { type: "collision", outcome: "dodged" },
  { type: "result", outcome: "success" },
];

describe("sentence motion terminal state", () => {
  beforeEach(() => {
    motionMocks.timelineCalls.length = 0;
    motionMocks.timelineTweens.length = 0;
    motionMocks.set.mockClear();
    motionMocks.resetBattlefieldTargets.mockClear();
  });

  it.each(["conditionMiss", "actionFail"] as const)(
    "restores the editable sentence after %s",
    (outcome) => {
      const { root, nodes } = createDomRoot();
      const battlefield = createBattlefield();
      createSentenceMotionDirector({
        root: root as unknown as HTMLElement,
        battlefield: battlefield as never,
        traceEvents: failureTrace(outcome),
        action:
          outcome === "actionFail"
            ? "player.guard_front"
            : "player.dodge_side",
        reducedMotion: false,
        shakeEnabled: false,
      });
      const rewind = motionMocks.timelineCalls.find(
        (call) => call.position === "rewind+=0.2",
      );
      expect(rewind).toBeDefined();

      motionMocks.set.mockClear();
      motionMocks.resetBattlefieldTargets.mockClear();
      rewind?.callback();

      expect(motionMocks.resetBattlefieldTargets).toHaveBeenCalledWith(
        battlefield,
      );
      expect(motionMocks.set).toHaveBeenCalledWith(
        expect.arrayContaining([nodes.condition, nodes.action]),
        {
          clearProps: "transform,opacity,filter,color,visibility",
        },
      );
      expect(motionMocks.set).toHaveBeenLastCalledWith(nodes.connectorPath, {
        strokeDashoffset: 0,
      });
    },
  );

  it.each([
    [false, 0.18],
    [true, 0.03],
  ] as const)(
    "clears the enemy omen at the shared result label (reduced: %s)",
    (reducedMotion, duration) => {
      const { root } = createDomRoot();
      const battlefield = createBattlefield();
      createSentenceMotionDirector({
        root: root as unknown as HTMLElement,
        battlefield: battlefield as never,
        traceEvents: successTrace,
        action: "player.dodge_side",
        reducedMotion,
        shakeEnabled: false,
      });

      expect(motionMocks.timelineTweens).toContainEqual({
        target: battlefield.enemyOmen,
        vars: {
          pixi: { alpha: 0, scale: 1 },
          duration,
        },
        position: "result",
      });
    },
  );
});
