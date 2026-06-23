import { describe, expect, it } from "vitest";

import {
  PREPARATION_CARD_HEIGHT,
  PREPARATION_CARD_LAYOUTS,
  PREPARATION_CARD_WIDTH,
} from "./PreparationCardLayout";
import { PREPARATION_TABLE_DECOR_ITEMS } from "./PreparationTableDecor";

describe("preparation card layout", () => {
  it("uses smaller cards than the first material pass", () => {
    expect(PREPARATION_CARD_WIDTH).toBeLessThan(0.82);
    expect(PREPARATION_CARD_HEIGHT).toBeLessThan(1.1);
  });

  it("moves the card fan in front of the table decor", () => {
    const frontMostDecorZ = Math.max(
      ...PREPARATION_TABLE_DECOR_ITEMS.map((item) => item.z),
    );
    const cardZValues = Object.values(PREPARATION_CARD_LAYOUTS).map(
      (layout) => layout.z,
    );

    expect(Math.min(...cardZValues)).toBeGreaterThan(frontMostDecorZ + 2.2);
    expect(Math.max(...cardZValues)).toBeGreaterThan(1.55);
  });

  it("keeps the fan low enough to reveal decor behind it", () => {
    const topEdge = Math.max(
      ...Object.values(PREPARATION_CARD_LAYOUTS).map(
        (layout) => layout.y + PREPARATION_CARD_HEIGHT / 2,
      ),
    );

    expect(topEdge).toBeLessThan(1.35);
  });
});
