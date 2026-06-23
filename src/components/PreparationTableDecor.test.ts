import { describe, expect, it } from "vitest";

import { PREPARATION_TABLE_DECOR_ITEMS } from "./PreparationTableDecor";

describe("PREPARATION_TABLE_DECOR_ITEMS", () => {
  it("places the book and candle away from the card fan center", () => {
    expect(PREPARATION_TABLE_DECOR_ITEMS.map((item) => item.id)).toEqual([
      "books",
      "candle",
    ]);

    const books = PREPARATION_TABLE_DECOR_ITEMS.find((item) => item.id === "books");
    const candle = PREPARATION_TABLE_DECOR_ITEMS.find((item) => item.id === "candle");

    expect(books?.x).toBeLessThan(-1.8);
    expect(candle?.x).toBeGreaterThan(1.8);
    expect(books?.z).toBeLessThan(-0.7);
    expect(candle?.z).toBeLessThan(-0.7);
  });

  it("keeps every decor plane just above the tabletop", () => {
    PREPARATION_TABLE_DECOR_ITEMS.forEach((item) => {
      expect(item.y).toBeGreaterThan(0.03);
      expect(item.y).toBeLessThan(0.09);
      expect(item.renderOrder).toBeLessThan(10);
    });
  });
});
