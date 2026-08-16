import { describe, expect, it } from "vitest";

import {
  ENEMY_SHEETS,
  ENEMY_SHEETS_BY_ID,
  PLAYER_SHEETS,
  STAGE_PLAYER_SHEETS,
  getEnemySheets,
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
    expect(decodeURIComponent(PLAYER_SHEETS.idle.src)).toContain(
      "/1/1-1/プレイヤー/Lotta_Rouge_dot.png",
    );
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
      [1, expect.stringContaining("/4/Edgar_Grey_dot.png")],
      [2, expect.stringContaining("/3/Lisette_Rosalia_dot.png")],
      [3, expect.stringContaining("/6/Shion_Yoizuki_dot.png")],
      [4, expect.stringContaining("/2/Cécile_Asteria_dot.png")],
      [5, expect.stringContaining("/5/Eleanor_Veil_dot.png")],
      [6, expect.stringContaining("/7/Lucien_Valmont_dot.png")],
    ]);
  });

  it("uses the fire-eating beast as the legacy enemy portrait", () => {
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
      "/1/1-3/敵/火喰らいの獣.png",
    );
  });

  it("maps each Word Quest enemy to its stage artwork", () => {
    expect(
      Object.entries(ENEMY_SHEETS_BY_ID).map(([enemyId, sheets]) => [
        enemyId,
        decodeURIComponent(sheets.idle.src),
      ]),
    ).toEqual([
      ["gaze-idol", expect.stringContaining("/1/1-1/敵/見張りの石像.png")],
      ["echo-moth", expect.stringContaining("/1/1-2/敵/反響の翅.png")],
      ["ember-maw", expect.stringContaining("/1/1-3/敵/火喰らいの獣.png")],
      ["forgotten-king", expect.stringContaining("/1/1-4/敵/亡名神.png")],
    ]);
  });

  it("falls back to the legacy enemy artwork for an unknown enemy", () => {
    expect(getEnemySheets("unknown-enemy")).toBe(ENEMY_SHEETS);
  });
});
