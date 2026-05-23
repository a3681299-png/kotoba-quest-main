import { describe, expect, it } from "vitest";

import { calculateLayerLayout } from "./backgroundLayout";

describe("calculateLayerLayout", () => {
  it("covers the viewport while keeping the image centered", () => {
    expect(
      calculateLayerLayout({
        viewport: { width: 800, height: 600 },
        texture: { width: 2560, height: 1080 },
        verticalAlign: "center",
      }),
    ).toEqual({
      x: -311.11,
      y: 0,
      width: 1422.22,
      height: 600,
      scale: 0.56,
    });
  });

  it("bottom-aligns transparent layers after scaling them to cover", () => {
    expect(
      calculateLayerLayout({
        viewport: { width: 800, height: 600 },
        texture: { width: 2400, height: 1013 },
        verticalAlign: "bottom",
      }),
    ).toEqual({
      x: -310.76,
      y: 0,
      width: 1421.52,
      height: 600,
      scale: 0.59,
    });
  });
});
