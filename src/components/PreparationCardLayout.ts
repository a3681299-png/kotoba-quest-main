export type PreparationCardLayout = {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  rotationZ: number;
  zIndex: number;
};

export const PREPARATION_CARD_WIDTH = 0.74;
export const PREPARATION_CARD_HEIGHT = 0.99;

export const PREPARATION_CARD_LAYOUTS: Record<string, PreparationCardLayout> = {
  record: {
    x: -1.12,
    y: 0.68,
    z: 1.36,
    rotationY: -18,
    rotationZ: 13,
    zIndex: 1,
  },
  branch: {
    x: -0.56,
    y: 0.74,
    z: 1.48,
    rotationY: -10,
    rotationZ: 6,
    zIndex: 2,
  },
  attack: {
    x: 0,
    y: 0.8,
    z: 1.62,
    rotationY: 0,
    rotationZ: -1,
    zIndex: 5,
  },
  observe: {
    x: 0.56,
    y: 0.74,
    z: 1.48,
    rotationY: 10,
    rotationZ: -7,
    zIndex: 4,
  },
  heal: {
    x: 1.12,
    y: 0.68,
    z: 1.36,
    rotationY: 18,
    rotationZ: -13,
    zIndex: 3,
  },
};
