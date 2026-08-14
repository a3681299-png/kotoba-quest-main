import { describe, expect, it } from "vitest";
import { buildWordQuestBattlePresentation } from "./wordQuestBattlePresentation";

describe("buildWordQuestBattlePresentation", () => {
  it("stages a direct attack before the enemy counter", () => {
    const plan = buildWordQuestBattlePresentation({
      enemyHpBefore: 30,
      enemyHpAfter: 21,
      playerHpBefore: 28,
      playerHpAfter: 24,
      usedActions: ["attack"],
      reducedMotion: false,
    });

    expect(plan).toMatchObject({
      enemyDamage: 9,
      playerDamage: 4,
      hasPlayerStrike: true,
      hasEnemyStrike: true,
    });
    expect(plan.enemyImpactMs).toBeLessThan(plan.playerImpactMs ?? 0);
    expect(plan.playerImpactMs).toBeLessThan(plan.totalMs);
  });

  it("does not show the attack illustration for a non-damaging action", () => {
    const plan = buildWordQuestBattlePresentation({
      enemyHpBefore: 30,
      enemyHpAfter: 30,
      playerHpBefore: 28,
      playerHpAfter: 28,
      usedActions: ["guard"],
      reducedMotion: false,
    });

    expect(plan.hasPlayerStrike).toBe(false);
    expect(plan.hasEnemyStrike).toBe(false);
    expect(plan.enemyImpactMs).toBeNull();
    expect(plan.playerImpactMs).toBeNull();
  });

  it("keeps state changes legible while shortening reduced motion", () => {
    const full = buildWordQuestBattlePresentation({
      enemyHpBefore: 30,
      enemyHpAfter: 24,
      playerHpBefore: 28,
      playerHpAfter: 25,
      usedActions: ["counter"],
      reducedMotion: false,
    });
    const reduced = buildWordQuestBattlePresentation({
      enemyHpBefore: 30,
      enemyHpAfter: 24,
      playerHpBefore: 28,
      playerHpAfter: 25,
      usedActions: ["counter"],
      reducedMotion: true,
    });

    expect(reduced.enemyDamage).toBe(full.enemyDamage);
    expect(reduced.playerDamage).toBe(full.playerDamage);
    expect(reduced.totalMs).toBeLessThan(full.totalMs);
    expect(reduced.enemyImpactMs).not.toBeNull();
    expect(reduced.playerImpactMs).not.toBeNull();
  });
});
