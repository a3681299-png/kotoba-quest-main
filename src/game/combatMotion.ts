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
  strikeFocusMs: number;
  animationSpeed: number;
  slowMotionMs: number;
  slowMotionAnimationSpeed: number;
  volleyCount: number;
  volleySpread: number;
  volleyDelayMs: number;
}

const PLAYER_ATTACK_MOTION: Record<
  PlayerAttackMotionType,
  CombatMotionProfile
> = {
  fire: {
    startupMs: 220,
    travelMs: 720,
    hitStopMs: 150,
    arcHeight: 64,
    anticipationX: -26,
    anticipationY: 0,
    trailCopies: 5,
    impactShake: 20,
    projectileRadius: 16,
    burstCount: 10,
    burstRadius: 42,
    impactFlashAlpha: 0.2,
    stageShakeMs: 320,
    targetShakeMs: 420,
    recoveryMs: 380,
    strikeFocusMs: 150,
    animationSpeed: 0.24,
    slowMotionMs: 210,
    slowMotionAnimationSpeed: 0.1,
    volleyCount: 1,
    volleySpread: 0,
    volleyDelayMs: 0,
  },
  ice: {
    startupMs: 210,
    travelMs: 760,
    hitStopMs: 135,
    arcHeight: 52,
    anticipationX: -22,
    anticipationY: -4,
    trailCopies: 6,
    impactShake: 16,
    projectileRadius: 14,
    burstCount: 8,
    burstRadius: 38,
    impactFlashAlpha: 0.18,
    stageShakeMs: 290,
    targetShakeMs: 380,
    recoveryMs: 360,
    strikeFocusMs: 145,
    animationSpeed: 0.24,
    slowMotionMs: 200,
    slowMotionAnimationSpeed: 0.1,
    volleyCount: 1,
    volleySpread: 0,
    volleyDelayMs: 0,
  },
  thunder: {
    startupMs: 160,
    travelMs: 580,
    hitStopMs: 145,
    arcHeight: 34,
    anticipationX: -28,
    anticipationY: 0,
    trailCopies: 5,
    impactShake: 22,
    projectileRadius: 13,
    burstCount: 12,
    burstRadius: 46,
    impactFlashAlpha: 0.24,
    stageShakeMs: 330,
    targetShakeMs: 430,
    recoveryMs: 340,
    strikeFocusMs: 125,
    animationSpeed: 0.27,
    slowMotionMs: 180,
    slowMotionAnimationSpeed: 0.12,
    volleyCount: 1,
    volleySpread: 0,
    volleyDelayMs: 0,
  },
  normal: {
    startupMs: 190,
    travelMs: 650,
    hitStopMs: 130,
    arcHeight: 46,
    anticipationX: -24,
    anticipationY: 0,
    trailCopies: 4,
    impactShake: 18,
    projectileRadius: 13,
    burstCount: 8,
    burstRadius: 36,
    impactFlashAlpha: 0.18,
    stageShakeMs: 290,
    targetShakeMs: 390,
    recoveryMs: 340,
    strikeFocusMs: 130,
    animationSpeed: 0.25,
    slowMotionMs: 190,
    slowMotionAnimationSpeed: 0.11,
    volleyCount: 1,
    volleySpread: 0,
    volleyDelayMs: 0,
  },
};

const ENEMY_ATTACK_MOTION: Record<EnemyAttackMotionType, CombatMotionProfile> = {
  normal: {
    startupMs: 170,
    travelMs: 590,
    hitStopMs: 115,
    arcHeight: 42,
    anticipationX: 24,
    anticipationY: 0,
    trailCopies: 4,
    impactShake: 15,
    projectileRadius: 15,
    burstCount: 8,
    burstRadius: 38,
    impactFlashAlpha: 0.16,
    stageShakeMs: 260,
    targetShakeMs: 360,
    recoveryMs: 330,
    strikeFocusMs: 120,
    animationSpeed: 0.26,
    slowMotionMs: 160,
    slowMotionAnimationSpeed: 0.12,
    volleyCount: 1,
    volleySpread: 0,
    volleyDelayMs: 0,
  },
  heavy: {
    startupMs: 260,
    travelMs: 840,
    hitStopMs: 180,
    arcHeight: 76,
    anticipationX: 36,
    anticipationY: -4,
    trailCopies: 6,
    impactShake: 30,
    projectileRadius: 24,
    burstCount: 12,
    burstRadius: 52,
    impactFlashAlpha: 0.24,
    stageShakeMs: 400,
    targetShakeMs: 520,
    recoveryMs: 450,
    strikeFocusMs: 170,
    animationSpeed: 0.22,
    slowMotionMs: 240,
    slowMotionAnimationSpeed: 0.09,
    volleyCount: 1,
    volleySpread: 0,
    volleyDelayMs: 0,
  },
  multi: {
    startupMs: 110,
    travelMs: 400,
    hitStopMs: 85,
    arcHeight: 34,
    anticipationX: 16,
    anticipationY: 0,
    trailCopies: 3,
    impactShake: 10,
    projectileRadius: 11,
    burstCount: 6,
    burstRadius: 30,
    impactFlashAlpha: 0.14,
    stageShakeMs: 180,
    targetShakeMs: 220,
    recoveryMs: 220,
    strikeFocusMs: 95,
    animationSpeed: 0.3,
    slowMotionMs: 120,
    slowMotionAnimationSpeed: 0.16,
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
