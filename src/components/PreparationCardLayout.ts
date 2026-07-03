export type PreparationCardLayout = {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  rotationZ: number;
  zIndex: number;
};

export const PREPARATION_CARD_WIDTH = 0.68;
export const PREPARATION_CARD_HEIGHT = 0.91;

export const PREPARATION_CARD_LAYOUTS: Record<string, PreparationCardLayout> = {
  "condition-always": {
    x: -1.35,
    y: 0.66,
    z: 1.34,
    rotationY: -20,
    rotationZ: 13,
    zIndex: 1,
  },
  "condition-enemy-low": {
    x: -0.82,
    y: 0.72,
    z: 1.48,
    rotationY: -12,
    rotationZ: 7,
    zIndex: 2,
  },
  "condition-weakness-known": {
    x: -0.28,
    y: 0.78,
    z: 1.6,
    rotationY: -4,
    rotationZ: 2,
    zIndex: 4,
  },
  "action-observe": {
    x: 0.28,
    y: 0.78,
    z: 1.6,
    rotationY: 4,
    rotationZ: -2,
    zIndex: 5,
  },
  "action-attack": {
    x: 0.82,
    y: 0.72,
    z: 1.48,
    rotationY: 12,
    rotationZ: -7,
    zIndex: 3,
  },
  "action-heal": {
    x: 1.35,
    y: 0.66,
    z: 1.34,
    rotationY: 20,
    rotationZ: -13,
    zIndex: 2,
  },
};
