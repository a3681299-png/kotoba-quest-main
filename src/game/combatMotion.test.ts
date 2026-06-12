import { describe, expect, it } from "vitest";

import {
  buildRadialBurstPoints,
  buildVolleyOffsets,
  getEnemyAttackMotion,
  getPlayerAttackMotion,
  sampleAttackArc,
} from "./combatMotion";

describe("combat motion profiles", () => {
  it("stages player attacks with anticipation, smear trails, and hit-stop", () => {
    const motion = getPlayerAttackMotion("fire");

    expect(motion.startupMs).toBeGreaterThanOrEqual(200);
    expect(motion.travelMs).toBeGreaterThanOrEqual(680);
    expect(motion.trailCopies).toBeGreaterThanOrEqual(4);
    expect(motion.hitStopMs).toBeGreaterThanOrEqual(130);
    expect(motion.impactShake).toBeGreaterThanOrEqual(18);
    expect(motion.impactFlashAlpha).toBeGreaterThanOrEqual(0.18);
    expect(motion.targetShakeMs).toBeGreaterThanOrEqual(400);
    expect(motion.recoveryMs).toBeGreaterThanOrEqual(340);
    expect(motion.strikeFocusMs).toBeGreaterThanOrEqual(120);
    expect(motion.animationSpeed).toBeLessThanOrEqual(0.26);
    expect(motion.slowMotionMs).toBeGreaterThanOrEqual(180);
    expect(motion.slowMotionAnimationSpeed).toBeLessThan(motion.animationSpeed);
  });

  it("makes heavy enemy attacks slower and more forceful than normal attacks", () => {
    const normal = getEnemyAttackMotion("normal", false);
    const heavy = getEnemyAttackMotion("heavy", false);

    expect(heavy.travelMs).toBeGreaterThan(normal.travelMs);
    expect(heavy.impactShake).toBeGreaterThan(normal.impactShake);
    expect(heavy.arcHeight).toBeGreaterThan(normal.arcHeight);
    expect(heavy.stageShakeMs).toBeGreaterThan(normal.stageShakeMs);
    expect(heavy.recoveryMs).toBeGreaterThan(normal.recoveryMs);
  });

  it("keeps multi attacks as quick staggered volleys", () => {
    const multi = getEnemyAttackMotion("multi", false);

    expect(multi.volleyCount).toBe(3);
    expect(multi.volleyDelayMs).toBeLessThan(multi.travelMs);
    expect(multi.volleySpread).toBeGreaterThan(0);
  });

  it("reduces impact shake for blocked enemy attacks", () => {
    const unblocked = getEnemyAttackMotion("normal", false);
    const blocked = getEnemyAttackMotion("normal", true);

    expect(blocked.impactShake).toBeLessThan(unblocked.impactShake);
    expect(blocked.hitStopMs).toBeGreaterThanOrEqual(unblocked.hitStopMs);
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
