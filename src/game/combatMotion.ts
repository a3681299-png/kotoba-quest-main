export type Point = {
  x: number;
  y: number;
};

export type PlayerAttackMotionType = "fire" | "ice" | "thunder" | "normal";
export type EnemyAttackMotionType = "normal" | "heavy" | "multi";

export interface CombatMotionProfile {
  startupMs: number;
  travelMs: number;
  hitStopMs: number;
  arcHeight: number;
  anticipationX: number;
  anticipationY: number;
  trailCopies: number;
  impactShake: number;
  projectileRadius: number;
  burstCount: number;
  burstRadius: number;
  impactFlashAlpha: number;
  stageShakeMs: number;
  targetShakeMs: number;
  recoveryMs: number;
  volleyCount: number;
  volleySpread: number;
  volleyDelayMs: number;
}

const PLAYER_ATTACK_MOTION: Record<
  PlayerAttackMotionType,
  CombatMotionProfile
> = {
  fire: {
    startupMs: 140,
    travelMs: 540,
    hitStopMs: 90,
    arcHeight: 64,
    anticipationX: -20,
    anticipationY: 0,
    trailCopies: 5,
    impactShake: 16,
    projectileRadius: 16,
    burstCount: 10,
    burstRadius: 42,
    impactFlashAlpha: 0.2,
    stageShakeMs: 220,
    targetShakeMs: 320,
    recoveryMs: 220,
    volleyCount: 1,
    volleySpread: 0,
    volleyDelayMs: 0,
  },
  ice: {
    startupMs: 120,
    travelMs: 600,
    hitStopMs: 80,
    arcHeight: 52,
    anticipationX: -16,
    anticipationY: -4,
    trailCopies: 6,
    impactShake: 12,
    projectileRadius: 14,
    burstCount: 8,
    burstRadius: 38,
    impactFlashAlpha: 0.18,
    stageShakeMs: 200,
    targetShakeMs: 300,
    recoveryMs: 210,
    volleyCount: 1,
    volleySpread: 0,
    volleyDelayMs: 0,
  },
  thunder: {
    startupMs: 90,
    travelMs: 430,
    hitStopMs: 100,
    arcHeight: 34,
    anticipationX: -24,
    anticipationY: 0,
    trailCopies: 5,
    impactShake: 18,
    projectileRadius: 13,
    burstCount: 12,
    burstRadius: 46,
    impactFlashAlpha: 0.24,
    stageShakeMs: 240,
    targetShakeMs: 340,
    recoveryMs: 230,
    volleyCount: 1,
    volleySpread: 0,
    volleyDelayMs: 0,
  },
  normal: {
    startupMs: 130,
    travelMs: 500,
    hitStopMs: 80,
    arcHeight: 46,
    anticipationX: -18,
    anticipationY: 0,
    trailCopies: 4,
    impactShake: 14,
    projectileRadius: 13,
    burstCount: 8,
    burstRadius: 36,
    impactFlashAlpha: 0.18,
    stageShakeMs: 210,
    targetShakeMs: 300,
    recoveryMs: 210,
    volleyCount: 1,
    volleySpread: 0,
    volleyDelayMs: 0,
  },
};

const ENEMY_ATTACK_MOTION: Record<EnemyAttackMotionType, CombatMotionProfile> = {
  normal: {
    startupMs: 120,
    travelMs: 450,
    hitStopMs: 80,
    arcHeight: 42,
    anticipationX: 18,
    anticipationY: 0,
    trailCopies: 4,
    impactShake: 12,
    projectileRadius: 15,
    burstCount: 8,
    burstRadius: 38,
    impactFlashAlpha: 0.16,
    stageShakeMs: 200,
    targetShakeMs: 300,
    recoveryMs: 250,
    volleyCount: 1,
    volleySpread: 0,
    volleyDelayMs: 0,
  },
  heavy: {
    startupMs: 180,
    travelMs: 660,
    hitStopMs: 130,
    arcHeight: 76,
    anticipationX: 30,
    anticipationY: -4,
    trailCopies: 6,
    impactShake: 24,
    projectileRadius: 24,
    burstCount: 12,
    burstRadius: 52,
    impactFlashAlpha: 0.24,
    stageShakeMs: 280,
    targetShakeMs: 420,
    recoveryMs: 330,
    volleyCount: 1,
    volleySpread: 0,
    volleyDelayMs: 0,
  },
  multi: {
    startupMs: 80,
    travelMs: 340,
    hitStopMs: 70,
    arcHeight: 34,
    anticipationX: 12,
    anticipationY: 0,
    trailCopies: 3,
    impactShake: 9,
    projectileRadius: 11,
    burstCount: 6,
    burstRadius: 30,
    impactFlashAlpha: 0.14,
    stageShakeMs: 150,
    targetShakeMs: 180,
    recoveryMs: 170,
    volleyCount: 3,
    volleySpread: 18,
    volleyDelayMs: 70,
  },
};

function clampProgress(progress: number): number {
  return Math.max(0, Math.min(progress, 1));
}

function roundToTwo(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function easeOutCubic(progress: number): number {
  const clamped = clampProgress(progress);
  return 1 - Math.pow(1 - clamped, 3);
}

export function getPlayerAttackMotion(
  attackType: PlayerAttackMotionType,
): CombatMotionProfile {
  return { ...PLAYER_ATTACK_MOTION[attackType] };
}

export function getEnemyAttackMotion(
  attackType: EnemyAttackMotionType,
  isBlocked: boolean,
): CombatMotionProfile {
  const motion = ENEMY_ATTACK_MOTION[attackType];

  if (!isBlocked) {
    return { ...motion };
  }

  return {
    ...motion,
    hitStopMs: motion.hitStopMs + 30,
    impactShake: Math.max(4, Math.round(motion.impactShake * 0.35)),
    impactFlashAlpha: Math.max(0.1, motion.impactFlashAlpha * 0.8),
  };
}

export function sampleAttackArc({
  start,
  target,
  progress,
  arcHeight,
}: {
  start: Point;
  target: Point;
  progress: number;
  arcHeight: number;
}): Point {
  const clamped = clampProgress(progress);
  const x = start.x + (target.x - start.x) * clamped;
  const linearY = start.y + (target.y - start.y) * clamped;
  const y = linearY - Math.sin(clamped * Math.PI) * arcHeight;

  return {
    x: roundToTwo(x),
    y: roundToTwo(y),
  };
}

export function buildRadialBurstPoints(count: number, radius: number): Point[] {
  if (count <= 0 || radius <= 0) {
    return [];
  }

  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return {
      x: roundToTwo(Math.cos(angle) * radius),
      y: roundToTwo(Math.sin(angle) * radius),
    };
  });
}

export function buildVolleyOffsets(count: number, spread: number): number[] {
  if (count <= 1 || spread <= 0) {
    return [0];
  }

  const center = (count - 1) / 2;
  return Array.from({ length: count }, (_, index) =>
    roundToTwo((index - center) * spread),
  );
}
