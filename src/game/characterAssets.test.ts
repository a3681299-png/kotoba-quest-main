import { describe, expect, it } from "vitest";

import {
  ENEMY_SHEETS,
  PLAYER_SHEETS,
  STAGE_PLAYER_SHEETS,
} from "./characterAssets";

describe("character asset definitions", () => {
  it("uses the new tutorial player portrait for every motion state", () => {
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
    expect(PLAYER_SHEETS.idle.src).toContain("Lotta_Rouge_dot.png");
    expect(PLAYER_SHEETS.attack.src).toContain("Lotta_Rouge_dot.png");
    expect(PLAYER_SHEETS.damage.src).toContain("Lotta_Rouge_dot.png");
  });

  it("uses each mentor's dot artwork in the six tutorial battles", () => {
    expect(
      Object.entries(STAGE_PLAYER_SHEETS).map(([stageId, sheets]) => [
        Number(stageId),
        decodeURIComponent(sheets.idle.src),
      ]),
    ).toEqual([
      [1, expect.stringContaining("/3/Edgar_Grey_dot.png")],
      [2, expect.stringContaining("/2/Lisette_Rosalia_dot.png")],
      [3, expect.stringContaining("/5/Shion_Yoizuki_dot.png")],
      [4, expect.stringContaining("/1/Cécile_Asteria_dot.png")],
      [5, expect.stringContaining("/4/Eleanor_Veil_dot.png")],
      [6, expect.stringContaining("/6/Lucien_Valmont_dot.png")],
    ]);
  });

  it("uses the fire-eating beast portrait for every enemy motion state", () => {
    expect(ENEMY_SHEETS.idle).toMatchObject({
      columns: 1,
      rows: 1,
    });
    expect(ENEMY_SHEETS.attack).toMatchObject({
      columns: 1,
      rows: 1,
    });
    expect(ENEMY_SHEETS.damage).toMatchObject({
      columns: 1,
      rows: 1,
    });
    expect(decodeURIComponent(ENEMY_SHEETS.idle.src)).toContain(
      "火喰らいの獣.png",
    );
    expect(decodeURIComponent(ENEMY_SHEETS.attack.src)).toContain(
      "火喰らいの獣.png",
    );
    expect(decodeURIComponent(ENEMY_SHEETS.damage.src)).toContain(
      "火喰らいの獣.png",
    );
  });
});
