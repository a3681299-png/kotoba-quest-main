import { describe, expect, it } from "vitest";

import {
  buildCameraTransform,
  buildPlayerMeleeAttackPlan,
} from "./cameraMotion";

describe("buildCameraTransform", () => {
  it("keeps a focused world point at the requested screen anchor", () => {
    const transform = buildCameraTransform({
      focus: { x: 200, y: 300 },
      scale: 1.6,
      screenAnchor: { x: 320, y: 360 },
    });

    expect(transform).toEqual({
      x: 0,
      y: -120,
      scale: 1.6,
    });
  });
});

describe("buildPlayerMeleeAttackPlan", () => {
  it("zooms into the player before following them toward the enemy", () => {
    const plan = buildPlayerMeleeAttackPlan({
      viewport: { width: 800, height: 600 },
      player: { x: 200, y: 432 },
      enemy: { x: 600, y: 432 },
    });

    expect(plan.closeUp.scale).toBeGreaterThan(1);
    expect(plan.closeUp.x).toBeGreaterThan(plan.follow.x);
    expect(plan.approach.x).toBeLessThan(600);
    expect(plan.approach.x).toBeGreaterThan(200);
    expect(plan.strikeFocus.x).toBeGreaterThan(plan.approach.x);
    expect(plan.rest).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it("keeps follow-up attacks in the engaged camera stance", () => {
    const firstPlan = buildPlayerMeleeAttackPlan({
      viewport: { width: 800, height: 600 },
      player: { x: 200, y: 432 },
      enemy: { x: 600, y: 432 },
    });
    const followUpPlan = buildPlayerMeleeAttackPlan({
      viewport: { width: 800, height: 600 },
      player: firstPlan.approach,
      enemy: { x: 600, y: 432 },
      isEngaged: true,
    });

    expect(firstPlan.shouldEnter).toBe(true);
    expect(firstPlan.shouldReturnHomeAfterHit).toBe(false);
    expect(followUpPlan.shouldEnter).toBe(false);
    expect(followUpPlan.shouldReturnHomeAfterHit).toBe(false);
    expect(followUpPlan.approach).toEqual(firstPlan.approach);
    expect(followUpPlan.closeUp).toEqual(followUpPlan.strike);
    expect(followUpPlan.follow).toEqual(followUpPlan.strike);
  });
});
