import { describe, expect, it } from "vitest";

import { getPlayerAttackMotion } from "./combatMotion";
import {
  buildClashSparkPlan,
  buildDustPlan,
  buildImpactEffectPlan,
  buildScatterOffsets,
  buildSpeedLinePlan,
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
    // LoR風：大きく弾き飛ばして滑走させる
    expect(plan.knockback.x).toBeGreaterThanOrEqual(44);
    expect(plan.knockback.recoverMs).toBeGreaterThan(plan.knockback.impactMs * 2);
    // ダメージ数字は被弾方向へ斜めに弾ける
    expect(Math.sign(plan.damageFlight.x)).toBe(1);
    expect(plan.damageFlight.y).toBeLessThan(0);
    expect(plan.damageFlight.rotation).not.toBe(0);
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

describe("buildClashSparkPlan", () => {
  it("builds an X-shaped parry spark with a hard freeze and mutual pushback", () => {
    const plan = buildClashSparkPlan({ force: 20 });

    expect(plan.freezeMs).toBeGreaterThanOrEqual(80);
    expect(plan.flash.radius).toBeGreaterThan(0);
    expect(plan.crossSlashes.count).toBeGreaterThanOrEqual(2);
    expect(plan.crossSlashes.length).toBeGreaterThan(plan.flash.radius);
    expect(plan.sparks.count).toBeGreaterThanOrEqual(8);
    expect(plan.pushback.distance).toBeGreaterThanOrEqual(24);
    expect(plan.flash.durationMs).toBeLessThan(plan.sparks.durationMs);
  });

  it("scales the spark with clash force", () => {
    const weak = buildClashSparkPlan({ force: 10 });
    const strong = buildClashSparkPlan({ force: 30 });

    expect(strong.sparks.count).toBeGreaterThanOrEqual(weak.sparks.count);
    expect(strong.pushback.distance).toBeGreaterThan(weak.pushback.distance);
  });
});

describe("buildDustPlan", () => {
  it("kicks up ground dust that scales with impact force", () => {
    const weak = buildDustPlan({ force: 8 });
    const strong = buildDustPlan({ force: 30 });

    expect(weak.count).toBeGreaterThanOrEqual(4);
    expect(strong.count).toBeGreaterThanOrEqual(weak.count);
    expect(strong.radius).toBeGreaterThan(weak.radius);
    expect(weak.durationMs).toBeGreaterThanOrEqual(300);
    expect(weak.riseY).toBeGreaterThan(0);
  });
});

describe("buildSpeedLinePlan", () => {
  it("trails short-lived speed lines behind a dash", () => {
    const plan = buildSpeedLinePlan({ distance: 350 });

    expect(plan.count).toBeGreaterThanOrEqual(3);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.alpha).toBeGreaterThan(0);
    expect(plan.alpha).toBeLessThan(1);
    expect(plan.durationMs).toBeLessThanOrEqual(220);
  });

  it("adds more lines for longer dashes", () => {
    const short = buildSpeedLinePlan({ distance: 120 });
    const long = buildSpeedLinePlan({ distance: 500 });

    expect(long.count).toBeGreaterThanOrEqual(short.count);
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
