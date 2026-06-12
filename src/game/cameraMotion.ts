import type { Point } from "./combatMotion";

export interface Size {
  width: number;
  height: number;
}

export interface CameraTransform {
  x: number;
  y: number;
  scale: number;
}

export interface PlayerMeleeAttackPlan {
  closeUp: CameraTransform;
  follow: CameraTransform;
  strike: CameraTransform;
  rest: CameraTransform;
  approach: Point;
  strikeFocus: Point;
  shouldEnter: boolean;
  shouldReturnHomeAfterHit: boolean;
}

function roundToTwo(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function buildCameraTransform({
  focus,
  scale,
  screenAnchor,
}: {
  focus: Point;
  scale: number;
  screenAnchor: Point;
}): CameraTransform {
  return {
    x: roundToTwo(screenAnchor.x - focus.x * scale),
    y: roundToTwo(screenAnchor.y - focus.y * scale),
    scale: roundToTwo(scale),
  };
}

export function buildPlayerMeleeAttackPlan({
  viewport,
  player,
  enemy,
  isEngaged = false,
}: {
  viewport: Size;
  player: Point;
  enemy: Point;
  isEngaged?: boolean;
}): PlayerMeleeAttackPlan {
  const direction = enemy.x >= player.x ? 1 : -1;
  const approach = {
    x: roundToTwo(enemy.x - direction * Math.max(92, viewport.width * 0.13)),
    y: roundToTwo(enemy.y + 4),
  };
  const strikeFocus = {
    x: roundToTwo(enemy.x - direction * Math.max(28, viewport.width * 0.04)),
    y: roundToTwo(enemy.y - 40),
  };
  const lowerFocus = {
    x: viewport.width * 0.44,
    y: viewport.height * 0.66,
  };

  const strike = buildCameraTransform({
    focus: strikeFocus,
    scale: 1.56,
    screenAnchor: {
      x: viewport.width * 0.5,
      y: viewport.height * 0.62,
    },
  });

  return {
    closeUp: isEngaged
      ? strike
      : buildCameraTransform({
          focus: player,
          scale: 1.72,
          screenAnchor: lowerFocus,
        }),
    follow: isEngaged
      ? strike
      : buildCameraTransform({
          focus: approach,
          scale: 1.48,
          screenAnchor: lowerFocus,
        }),
    strike,
    rest: { x: 0, y: 0, scale: 1 },
    approach,
    strikeFocus,
    shouldEnter: !isEngaged,
    shouldReturnHomeAfterHit: false,
  };
}
