import { describe, expect, it } from "vitest";
import type { BattleTurnEffects } from "../../wordQuest";
import { buildWordQuestBattlePresentation } from "./wordQuestBattlePresentation";

function turnEffects(
  overrides: Partial<BattleTurnEffects> = {},
): BattleTurnEffects {
  return {
    playerHpAfterActions: 28,
    playerHealing: 0,
    guardApplied: 0,
    damageBlocked: 0,
    playerDamageTaken: 0,
    ...overrides,
  };
}

describe("buildWordQuestBattlePresentation", () => {
  it("stages a direct attack before the enemy counter", () => {
    const plan = buildWordQuestBattlePresentation({
      enemyHpBefore: 30,
      enemyHpAfter: 21,
      playerHpBefore: 28,
      playerHpAfter: 24,
      effects: turnEffects({ playerDamageTaken: 4 }),
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
      effects: turnEffects({ guardApplied: 3 }),
      usedActions: ["guard"],
      reducedMotion: false,
    });

    expect(plan.hasPlayerStrike).toBe(false);
    expect(plan.hasEnemyStrike).toBe(false);
    expect(plan.hasPlayerGuard).toBe(true);
    expect(plan.enemyImpactMs).toBeNull();
    expect(plan.playerImpactMs).toBeNull();
  });

  it("keeps state changes legible while shortening reduced motion", () => {
    const full = buildWordQuestBattlePresentation({
      enemyHpBefore: 30,
      enemyHpAfter: 24,
      playerHpBefore: 28,
      playerHpAfter: 25,
      effects: turnEffects({ playerDamageTaken: 3 }),
      usedActions: ["counter"],
      reducedMotion: false,
    });
    const reduced = buildWordQuestBattlePresentation({
      enemyHpBefore: 30,
      enemyHpAfter: 24,
      playerHpBefore: 28,
      playerHpAfter: 25,
      effects: turnEffects({ playerDamageTaken: 3 }),
      usedActions: ["counter"],
      reducedMotion: true,
    });

    expect(reduced.enemyDamage).toBe(full.enemyDamage);
    expect(reduced.playerDamage).toBe(full.playerDamage);
    expect(reduced.totalMs).toBeLessThan(full.totalMs);
    expect(reduced.enemyImpactMs).not.toBeNull();
    expect(reduced.playerImpactMs).not.toBeNull();
  });

  it("shows healing before the enemy damage instead of hiding the net change", () => {
    const plan = buildWordQuestBattlePresentation({
      enemyHpBefore: 30,
      enemyHpAfter: 30,
      playerHpBefore: 10,
      playerHpAfter: 10,
      effects: turnEffects({
        playerHpAfterActions: 13,
        playerHealing: 3,
        playerDamageTaken: 3,
      }),
      usedActions: ["heal"],
      reducedMotion: false,
    });

    expect(plan).toMatchObject({
      playerHealing: 3,
      playerDamage: 3,
      hasPlayerRecovery: true,
      hasEnemyStrike: true,
    });
  });

  it("stages a blocked enemy hit even when no HP is lost", () => {
    const plan = buildWordQuestBattlePresentation({
      enemyHpBefore: 30,
      enemyHpAfter: 30,
      playerHpBefore: 10,
      playerHpAfter: 10,
      effects: turnEffects({
        playerHpAfterActions: 10,
        guardApplied: 6,
        damageBlocked: 6,
      }),
      usedActions: ["guard"],
      reducedMotion: false,
    });

    expect(plan).toMatchObject({
      playerDamage: 0,
      damageBlocked: 6,
      hasPlayerGuard: true,
      hasEnemyStrike: true,
    });
    expect(plan.playerImpactMs).not.toBeNull();
  });
});
