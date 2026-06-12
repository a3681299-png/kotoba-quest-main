import { describe, expect, it } from "vitest";

import {
  buildDashPlan,
  buildRadialBurstPoints,
  buildVolleyOffsets,
  getEnemyAttackMotion,
  getPlayerAttackMotion,
  sampleAttackArc,
} from "./combatMotion";

describe("combat motion profiles", () => {
  it("stages player attacks as Ruina-style explosive dashes with a hard hit-stop", () => {
    const motion = getPlayerAttackMotion("fire");

    // 溜めは短く、ダッシュは爆発的に速い
    expect(motion.startupMs).toBeLessThanOrEqual(170);
    expect(motion.travelMs).toBeGreaterThanOrEqual(150);
    expect(motion.travelMs).toBeLessThanOrEqual(260);
    // 濃い残像とハードなヒットストップ
    expect(motion.trailCopies).toBeGreaterThanOrEqual(5);
    expect(motion.hitStopMs).toBeGreaterThanOrEqual(120);
    expect(motion.impactShake).toBeGreaterThanOrEqual(18);
    expect(motion.impactFlashAlpha).toBeGreaterThanOrEqual(0.18);
    expect(motion.targetShakeMs).toBeGreaterThanOrEqual(400);
    // 帰還も素早い
    expect(motion.recoveryMs).toBeLessThanOrEqual(320);
    expect(motion.strikeFocusMs).toBeLessThanOrEqual(120);
    // 振りは鋭く
    expect(motion.animationSpeed).toBeGreaterThanOrEqual(0.3);
    expect(motion.slowMotionAnimationSpeed).toBeLessThan(motion.animationSpeed);
  });

  it("makes heavy enemy attacks telegraphed and more forceful than normal attacks", () => {
    const normal = getEnemyAttackMotion("normal", false);
    const heavy = getEnemyAttackMotion("heavy", false);

    // 大技は溜め（テレグラフ）が長く、衝撃が重い
    expect(heavy.startupMs).toBeGreaterThan(normal.startupMs);
    expect(heavy.travelMs).toBeGreaterThan(normal.travelMs);
    expect(heavy.hitStopMs).toBeGreaterThan(normal.hitStopMs);
    expect(heavy.impactShake).toBeGreaterThan(normal.impactShake);
    expect(heavy.stageShakeMs).toBeGreaterThan(normal.stageShakeMs);
    expect(heavy.recoveryMs).toBeGreaterThan(normal.recoveryMs);
  });

  it("keeps multi attacks as a rapid strike rhythm", () => {
    const multi = getEnemyAttackMotion("multi", false);

    expect(multi.volleyCount).toBe(3);
    expect(multi.volleyDelayMs).toBeGreaterThanOrEqual(100);
    expect(multi.volleyDelayMs).toBeLessThanOrEqual(200);
    expect(multi.volleySpread).toBeGreaterThan(0);
    // 連撃の個々のヒットストップは短く、テンポを保つ
    expect(multi.hitStopMs).toBeLessThan(
      getEnemyAttackMotion("normal", false).hitStopMs,
    );
  });

  it("reduces impact shake for blocked enemy attacks", () => {
    const unblocked = getEnemyAttackMotion("normal", false);
    const blocked = getEnemyAttackMotion("normal", true);

    expect(blocked.impactShake).toBeLessThan(unblocked.impactShake);
    expect(blocked.hitStopMs).toBeGreaterThanOrEqual(unblocked.hitStopMs);
  });
});

describe("buildDashPlan", () => {
  it("keeps dashes explosive regardless of distance", () => {
    const short = buildDashPlan({ distance: 120 });
    const long = buildDashPlan({ distance: 520 });

    expect(short.durationMs).toBeGreaterThanOrEqual(140);
    expect(long.durationMs).toBeLessThanOrEqual(240);
    expect(long.durationMs).toBeGreaterThanOrEqual(short.durationMs);
  });

  it("leaves a dense afterimage trail synced to the dash duration", () => {
    const plan = buildDashPlan({ distance: 360 });

    expect(plan.afterimageCount).toBeGreaterThanOrEqual(4);
    expect(plan.afterimageSpacingMs * plan.afterimageCount).toBeLessThanOrEqual(
      plan.durationMs,
    );
  });

  it("stretches the runner along the dash direction", () => {
    const plan = buildDashPlan({ distance: -300 });

    expect(plan.stretchX).toBeGreaterThan(1);
    expect(plan.squashY).toBeLessThan(1);
    expect(plan.leanRotation).toBeGreaterThan(0);
  });
});

describe("buildVolleyOffsets", () => {
  it("centers staggered projectile lanes around the target", () => {
    expect(buildVolleyOffsets(3, 18)).toEqual([-18, 0, 18]);
    expect(buildVolleyOffsets(4, 12)).toEqual([-18, -6, 6, 18]);
  });

  it("returns a single centered lane for non-volley attacks", () => {
    expect(buildVolleyOffsets(1, 18)).toEqual([0]);
    expect(buildVolleyOffsets(0, 18)).toEqual([0]);
  });
});

describe("sampleAttackArc", () => {
  it("eases projectile travel along an upward battle arc", () => {
    const midPoint = sampleAttackArc({
      start: { x: 100, y: 240 },
      target: { x: 500, y: 200 },
      progress: 0.5,
      arcHeight: 70,
    });

    expect(midPoint.x).toBeCloseTo(300);
    expect(midPoint.y).toBeCloseTo(150);
  });
});

describe("buildRadialBurstPoints", () => {
  it("returns evenly distributed impact burst points", () => {
    const points = buildRadialBurstPoints(4, 32);

    expect(points).toEqual([
      { x: 32, y: 0 },
      { x: 0, y: 32 },
      { x: -32, y: 0 },
      { x: 0, y: -32 },
    ]);
  });
});
