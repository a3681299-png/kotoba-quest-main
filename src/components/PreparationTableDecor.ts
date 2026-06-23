export type PreparationTableDecorItem = {
  id: "books" | "candle";
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  rotationZ: number;
  renderOrder: number;
  glow?: {
    intensity: number;
    distance: number;
  };
};

export const PREPARATION_TABLE_DECOR_ITEMS: PreparationTableDecorItem[] = [
  {
    id: "books",
    x: -2.38,
    y: 0.052,
    z: -1.18,
    width: 1.08,
    height: 0.94,
    rotationZ: -13,
    renderOrder: 2,
  },
  {
    id: "candle",
    x: 2.32,
    y: 0.056,
    z: -1.06,
    width: 0.66,
    height: 0.66,
    rotationZ: 8,
    renderOrder: 2,
    glow: {
      intensity: 1.35,
      distance: 1.8,
    },
  },
];
