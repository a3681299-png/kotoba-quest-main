import type { ActionEffectId, BattleTurnEffects } from "../../wordQuest";

export type WordQuestBattleMotionPhase =
  "windup" | "strike" | "enemy-impact" | "counter" | "player-impact" | "settle";

export interface WordQuestBattlePresentation {
  enemyDamage: number;
  playerDamage: number;
  playerHealing: number;
  guardApplied: number;
  damageBlocked: number;
  hasPlayerStrike: boolean;
  hasEnemyStrike: boolean;
  hasPlayerRecovery: boolean;
  hasPlayerGuard: boolean;
  reducedMotion: boolean;
  enemyImpactMs: number | null;
  playerImpactMs: number | null;
  settleMs: number;
  totalMs: number;
}

const PLAYER_STRIKE_ACTIONS: ReadonlySet<ActionEffectId> = new Set([
  "attack",
  "counter",
]);

function damageBetween(before: number, after: number): number {
  return Math.max(0, Math.round(before - after));
}

export function buildWordQuestBattlePresentation({
  enemyHpBefore,
  enemyHpAfter,
  playerHpBefore,
  playerHpAfter,
  effects,
  usedActions,
  reducedMotion,
}: {
  enemyHpBefore: number;
  enemyHpAfter: number;
  playerHpBefore: number;
  playerHpAfter: number;
  effects: BattleTurnEffects;
  usedActions: readonly ActionEffectId[];
  reducedMotion: boolean;
}): WordQuestBattlePresentation {
  const enemyDamage = damageBetween(enemyHpBefore, enemyHpAfter);
  const playerDamage = Math.max(
    effects.playerDamageTaken,
    damageBetween(playerHpBefore, playerHpAfter),
  );
  const hasPlayerStrike =
    enemyDamage > 0 &&
    usedActions.some((action) => PLAYER_STRIKE_ACTIONS.has(action));
  const hasEnemyStrike = playerDamage > 0 || effects.damageBlocked > 0;
  const effectPresentation = {
    enemyDamage,
    playerDamage,
    playerHealing: effects.playerHealing,
    guardApplied: effects.guardApplied,
    damageBlocked: effects.damageBlocked,
    hasPlayerStrike,
    hasEnemyStrike,
    hasPlayerRecovery: effects.playerHealing > 0,
    hasPlayerGuard: effects.guardApplied > 0,
  };

  if (reducedMotion) {
    return {
      ...effectPresentation,
      reducedMotion: true,
      enemyImpactMs: hasPlayerStrike ? 36 : null,
      playerImpactMs: hasEnemyStrike ? (hasPlayerStrike ? 92 : 36) : null,
      settleMs: hasPlayerStrike || hasEnemyStrike ? 118 : 40,
      totalMs: hasPlayerStrike || hasEnemyStrike ? 180 : 100,
    };
  }

  if (hasPlayerStrike && hasEnemyStrike) {
    return {
      ...effectPresentation,
      reducedMotion: false,
      enemyImpactMs: 470,
      playerImpactMs: 1320,
      settleMs: 1540,
      totalMs: 1850,
    };
  }

  if (hasPlayerStrike) {
    return {
      ...effectPresentation,
      reducedMotion: false,
      enemyImpactMs: 470,
      playerImpactMs: null,
      settleMs: 860,
      totalMs: 1320,
    };
  }

  if (hasEnemyStrike) {
    return {
      ...effectPresentation,
      reducedMotion: false,
      enemyImpactMs: null,
      playerImpactMs: 500,
      settleMs: 730,
      totalMs: 1080,
    };
  }

  return {
    ...effectPresentation,
    reducedMotion: false,
    enemyImpactMs: null,
    playerImpactMs: null,
    settleMs: 210,
    totalMs: 520,
  };
}
