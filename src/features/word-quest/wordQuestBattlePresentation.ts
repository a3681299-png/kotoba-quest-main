import type { ActionEffectId } from "../../wordQuest";

export type WordQuestBattleMotionPhase =
  "windup" | "strike" | "enemy-impact" | "counter" | "player-impact" | "settle";

export interface WordQuestBattlePresentation {
  enemyDamage: number;
  playerDamage: number;
  hasPlayerStrike: boolean;
  hasEnemyStrike: boolean;
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
  usedActions,
  reducedMotion,
}: {
  enemyHpBefore: number;
  enemyHpAfter: number;
  playerHpBefore: number;
  playerHpAfter: number;
  usedActions: readonly ActionEffectId[];
  reducedMotion: boolean;
}): WordQuestBattlePresentation {
  const enemyDamage = damageBetween(enemyHpBefore, enemyHpAfter);
  const playerDamage = damageBetween(playerHpBefore, playerHpAfter);
  const hasPlayerStrike =
    enemyDamage > 0 &&
    usedActions.some((action) => PLAYER_STRIKE_ACTIONS.has(action));
  const hasEnemyStrike = playerDamage > 0;

  if (reducedMotion) {
    return {
      enemyDamage,
      playerDamage,
      hasPlayerStrike,
      hasEnemyStrike,
      reducedMotion: true,
      enemyImpactMs: hasPlayerStrike ? 36 : null,
      playerImpactMs: hasEnemyStrike ? (hasPlayerStrike ? 92 : 36) : null,
      settleMs: hasPlayerStrike || hasEnemyStrike ? 118 : 40,
      totalMs: hasPlayerStrike || hasEnemyStrike ? 180 : 100,
    };
  }

  if (hasPlayerStrike && hasEnemyStrike) {
    return {
      enemyDamage,
      playerDamage,
      hasPlayerStrike,
      hasEnemyStrike,
      reducedMotion: false,
      enemyImpactMs: 470,
      playerImpactMs: 1320,
      settleMs: 1540,
      totalMs: 1850,
    };
  }

  if (hasPlayerStrike) {
    return {
      enemyDamage,
      playerDamage,
      hasPlayerStrike,
      hasEnemyStrike,
      reducedMotion: false,
      enemyImpactMs: 470,
      playerImpactMs: null,
      settleMs: 860,
      totalMs: 1320,
    };
  }

  if (hasEnemyStrike) {
    return {
      enemyDamage,
      playerDamage,
      hasPlayerStrike,
      hasEnemyStrike,
      reducedMotion: false,
      enemyImpactMs: null,
      playerImpactMs: 500,
      settleMs: 730,
      totalMs: 1080,
    };
  }

  return {
    enemyDamage,
    playerDamage,
    hasPlayerStrike,
    hasEnemyStrike,
    reducedMotion: false,
    enemyImpactMs: null,
    playerImpactMs: null,
    settleMs: 210,
    totalMs: 520,
  };
}
