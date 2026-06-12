import { describe, expect, it } from "vitest";

import { getPlayerAttackMotion } from "./combatMotion";
import {
  buildImpactEffectPlan,
  buildScatterOffsets,
} from "./battleEffects";

describe("buildImpactEffectPlan", () => {
  it("bundles the no-asset hit effects into a single impact plan", () => {
    const plan = buildImpactEffectPlan({
      motion: getPlayerAttackMotion("fire"),
      direction: 1,
      damage: 12,
    });

    expect(plan.damageLabel).toBe("12");
    expect(plan.flash.durationMs).toBeLessThan(plan.shockwave.durationMs);
    expect(plan.shockwave.outerRadius).toBeGreaterThan(plan.shockwave.innerRadius);
    expect(plan.ripple.outerRadius).toBeGreaterThan(plan.shockwave.outerRadius);
    expect(plan.knockback.x).toBeGreaterThan(0);
    expect(plan.knockback.recoverMs).toBeGreaterThan(plan.knockback.impactMs);
    expect(plan.enemyBlink.count).toBeGreaterThanOrEqual(3);
    expect(plan.textFragments.count).toBeGreaterThanOrEqual(8);
    expect(plan.paperFragments.count).toBeGreaterThanOrEqual(8);
    expect(plan.ashParticles.count).toBeGreaterThanOrEqual(10);
    expect(plan.slashLines.count).toBeGreaterThanOrEqual(2);
    expect(plan.afterimages.count).toBeGreaterThanOrEqual(2);
    expect(plan.darkFlash.alpha).toBeGreaterThan(0);
  });

  it("leaves a heavier impact tail after the hit-stop", () => {
    const plan = buildImpactEffectPlan({
      motion: getPlayerAttackMotion("fire"),
      direction: 1,
      damage: 12,
    });

    expect(plan.flash.durationMs).toBeGreaterThanOrEqual(150);
    expect(plan.shockwave.durationMs).toBeGreaterThanOrEqual(420);
    expect(plan.ripple.durationMs).toBeGreaterThanOrEqual(680);
    expect(plan.textFragments.durationMs).toBeGreaterThanOrEqual(680);
    expect(plan.paperFragments.durationMs).toBeGreaterThanOrEqual(760);
    expect(plan.ashParticles.durationMs).toBeGreaterThanOrEqual(900);
    expect(plan.slashLines.durationMs).toBeGreaterThanOrEqual(240);
    expect(plan.darkFlash.durationMs).toBeGreaterThanOrEqual(190);
  });
});

describe("buildScatterOffsets", () => {
  it("creates deterministic offsets around the hit point", () => {
    expect(buildScatterOffsets(4, 20)).toEqual([
      { x: 20, y: 0 },
      { x: 0, y: 20 },
      { x: -20, y: 0 },
      { x: 0, y: -20 },
    ]);
  });
});
