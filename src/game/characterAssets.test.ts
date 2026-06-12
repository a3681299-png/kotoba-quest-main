import { describe, expect, it } from "vitest";

import { PLAYER_SHEETS } from "./characterAssets";

describe("character asset definitions", () => {
  it("treats the updated tutorial player art as single-frame images", () => {
    expect(PLAYER_SHEETS.idle).toMatchObject({
      columns: 1,
      rows: 1,
    });
    expect(PLAYER_SHEETS.attack).toMatchObject({
      columns: 1,
      rows: 1,
    });
    expect(PLAYER_SHEETS.damage).toMatchObject({
      columns: 1,
      rows: 1,
    });
    expect(PLAYER_SHEETS.idle.src).toContain("idle.png");
    expect(PLAYER_SHEETS.attack.src).toContain("atk.png");
    expect(PLAYER_SHEETS.damage.src).toContain("dmg.png");
  });
});
