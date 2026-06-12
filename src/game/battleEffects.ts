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
  damageFlight: {
    x: number;
    y: number;
    rotation: number;
    durationMs: number;
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

export interface ClashSparkPlan {
  freezeMs: number;
  flash: {
    radius: number;
    alpha: number;
    durationMs: number;
  };
  crossSlashes: {
    count: number;
    length: number;
    width: number;
    durationMs: number;
  };
  sparks: {
    count: number;
    radius: number;
    durationMs: number;
  };
  pushback: {
    distance: number;
    durationMs: number;
  };
}

// 剣戟スパーク: 攻撃同士（または防御成功）がぶつかった瞬間のX字閃光
export function buildClashSparkPlan({
  force,
}: {
  force: number;
}): ClashSparkPlan {
  const clamped = Math.max(8, force);

  return {
    freezeMs: 90,
    flash: {
      radius: roundToTwo(clamped * 2.2),
      alpha: 0.85,
      durationMs: 160,
    },
    crossSlashes: {
      count: 2,
      length: roundToTwo(clamped * 5.4),
      width: 5,
      durationMs: 210,
    },
    sparks: {
      count: Math.max(8, Math.round(clamped * 0.6)),
      radius: roundToTwo(clamped * 3.4),
      durationMs: 340,
    },
    pushback: {
      distance: roundToTwo(Math.max(24, clamped * 1.7)),
      durationMs: 240,
    },
  };
}

export interface DustPlan {
  count: number;
  radius: number;
  riseY: number;
  durationMs: number;
}

// 土埃: ノックバックで地面を滑る足元から舞い上がる
export function buildDustPlan({ force }: { force: number }): DustPlan {
  const clamped = Math.max(6, force);

  return {
    count: Math.max(4, Math.round(clamped * 0.4)),
    radius: roundToTwo(Math.max(30, clamped * 2.2)),
    riseY: roundToTwo(Math.max(10, clamped * 0.8)),
    durationMs: 460,
  };
}

export interface SpeedLinePlan {
  count: number;
  length: number;
  thickness: number;
  alpha: number;
  durationMs: number;
  spreadY: number;
}

// スピード線: ダッシュの軌跡に流れる細い線
export function buildSpeedLinePlan({
  distance,
}: {
  distance: number;
}): SpeedLinePlan {
  const magnitude = Math.abs(distance);

  return {
    count: Math.min(7, Math.max(3, Math.round(magnitude / 70))),
    length: roundToTwo(Math.min(150, Math.max(60, magnitude * 0.32))),
    thickness: 3,
    alpha: 0.5,
    durationMs: 190,
    spreadY: 34,
  };
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
      // LoR風: 大きく弾き飛ばし、recoverMsかけて滑りながら戻る
      x: roundToTwo(direction * Math.max(46, force * 2.6)),
      y: roundToTwo(-Math.max(2, force * 0.18)),
      impactMs: 110,
      recoverMs: Math.max(320, motion.targetShakeMs),
    },
    damageFlight: {
      x: roundToTwo(direction * 30),
      y: -72,
      rotation: roundToTwo(direction * 0.22),
      durationMs: 640,
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
