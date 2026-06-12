import type { Point, CombatMotionProfile } from "./combatMotion";

export interface ImpactEffectPlan {
  damageLabel: string;
  flash: {
    radius: number;
    durationMs: number;
    alpha: number;
  };
  shockwave: {
    innerRadius: number;
    outerRadius: number;
    durationMs: number;
    alpha: number;
  };
  ripple: {
    innerRadius: number;
    outerRadius: number;
    durationMs: number;
    alpha: number;
  };
  knockback: {
    x: number;
    y: number;
    impactMs: number;
    recoverMs: number;
  };
  enemyBlink: {
    count: number;
    durationMs: number;
    tint: number;
  };
  textFragments: {
    count: number;
    radius: number;
    durationMs: number;
  };
  paperFragments: {
    count: number;
    radius: number;
    durationMs: number;
  };
  ashParticles: {
    count: number;
    radius: number;
    durationMs: number;
  };
  slashLines: {
    count: number;
    length: number;
    durationMs: number;
  };
  afterimages: {
    count: number;
    durationMs: number;
    spacingMs: number;
  };
  darkFlash: {
    alpha: number;
    durationMs: number;
  };
}

function roundToTwo(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function buildScatterOffsets(count: number, radius: number): Point[] {
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

export function buildImpactEffectPlan({
  motion,
  direction,
  damage,
}: {
  motion: CombatMotionProfile;
  direction: 1 | -1;
  damage?: number;
}): ImpactEffectPlan {
  const force = Math.max(1, motion.impactShake);
  const burstRadius = Math.max(28, motion.burstRadius);

  return {
    damageLabel: damage == null ? "HIT" : String(damage),
    flash: {
      radius: roundToTwo(burstRadius * 0.64),
      durationMs: 150,
      alpha: Math.min(0.92, motion.impactFlashAlpha + 0.38),
    },
    shockwave: {
      innerRadius: roundToTwo(burstRadius * 0.52),
      outerRadius: roundToTwo(burstRadius * 1.72),
      durationMs: 420,
      alpha: 0.72,
    },
    ripple: {
      innerRadius: roundToTwo(burstRadius * 0.92),
      outerRadius: roundToTwo(burstRadius * 2.35),
      durationMs: 680,
      alpha: 0.32,
    },
    knockback: {
      x: roundToTwo(direction * Math.max(18, force * 1.45)),
      y: roundToTwo(-Math.max(3, force * 0.22)),
      impactMs: 80,
      recoverMs: Math.max(170, motion.targetShakeMs),
    },
    enemyBlink: {
      count: 3,
      durationMs: 330,
      tint: 0xffffff,
    },
    textFragments: {
      count: Math.max(8, motion.burstCount),
      radius: roundToTwo(burstRadius * 1.18),
      durationMs: 680,
    },
    paperFragments: {
      count: Math.max(8, Math.round(motion.burstCount * 0.8)),
      radius: roundToTwo(burstRadius * 1.42),
      durationMs: 760,
    },
    ashParticles: {
      count: Math.max(10, motion.burstCount + 2),
      radius: roundToTwo(burstRadius * 1.56),
      durationMs: 900,
    },
    slashLines: {
      count: Math.max(2, Math.round(motion.burstCount / 5)),
      length: roundToTwo(burstRadius * 2.2),
      durationMs: 240,
    },
    afterimages: {
      count: 3,
      durationMs: 340,
      spacingMs: 58,
    },
    darkFlash: {
      alpha: Math.min(0.28, motion.impactFlashAlpha * 0.72),
      durationMs: 190,
    },
  };
}
