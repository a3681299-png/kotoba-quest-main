import { describe, it, expect } from "vitest";
import {
  calcAdaptation,
  COMBO_HEAVY_RATIO,
  DEFENSIVE_RATIO,
  COMBO_REDUCED_MULTIPLIER,
  CHARGE_INTERVAL_DEFAULT,
  CHARGE_INTERVAL_SHORTENED,
} from "./adaptation";
import type { ActionHistory } from "../store/useGameStore";

function emptyHistory(): ActionHistory {
  return {
    magicUsage: {},
    comboCount: 0,
    defendCount: 0,
    healCount: 0,
    totalRounds: 0,
    totalBattles: 0,
  };
}

describe("calcAdaptation", () => {
  it("履歴が空ならどの適応も発動しない", () => {
    const config = calcAdaptation(emptyHistory());
    expect(config.resistMagics).toEqual([]);
    expect(config.comboDamageMultiplier).toBe(1.0);
    expect(config.chargeInterval).toBe(CHARGE_INTERVAL_DEFAULT);
  });

  it("最多使用属性の上位2種が耐性に登録される", () => {
    const history: ActionHistory = {
      ...emptyHistory(),
      magicUsage: { フレイム: 50, アクア: 30, スパーク: 10 },
      totalRounds: 100,
    };
    const config = calcAdaptation(history);
    expect(config.resistMagics).toEqual(["フレイム", "アクア"]);
  });

  it("合体魔法依存度が閾値以上で減衰係数が適用される", () => {
    const history: ActionHistory = {
      ...emptyHistory(),
      comboCount: 20,
      totalRounds: 100,  // 20/100 = 0.20 ≥ 0.15
    };
    const config = calcAdaptation(history);
    expect(history.comboCount / history.totalRounds).toBeGreaterThanOrEqual(COMBO_HEAVY_RATIO);
    expect(config.comboDamageMultiplier).toBe(COMBO_REDUCED_MULTIPLIER);
  });

  it("合体魔法依存度が閾値未満なら減衰なし", () => {
    const history: ActionHistory = {
      ...emptyHistory(),
      comboCount: 5,
      totalRounds: 100,  // 5/100 = 0.05 < 0.15
    };
    const config = calcAdaptation(history);
    expect(config.comboDamageMultiplier).toBe(1.0);
  });

  it("防御・回復依存度が閾値以上でチャージ間隔が短縮される", () => {
    const history: ActionHistory = {
      ...emptyHistory(),
      defendCount: 20,
      healCount: 15,
      totalRounds: 100,  // 35/100 = 0.35 ≥ 0.30
    };
    const config = calcAdaptation(history);
    expect((history.defendCount + history.healCount) / history.totalRounds)
      .toBeGreaterThanOrEqual(DEFENSIVE_RATIO);
    expect(config.chargeInterval).toBe(CHARGE_INTERVAL_SHORTENED);
  });

  it("防御・回復依存度が閾値未満ならチャージ間隔は通常", () => {
    const history: ActionHistory = {
      ...emptyHistory(),
      defendCount: 5,
      healCount: 5,
      totalRounds: 100,  // 10/100 = 0.10 < 0.30
    };
    const config = calcAdaptation(history);
    expect(config.chargeInterval).toBe(CHARGE_INTERVAL_DEFAULT);
  });

  it("3つの適応が同時に発動する", () => {
    const history: ActionHistory = {
      magicUsage: { フレイム: 100, アクア: 80, スパーク: 40 },
      comboCount: 30,
      defendCount: 25,
      healCount: 15,
      totalRounds: 100,
      totalBattles: 20,
    };
    const config = calcAdaptation(history);
    expect(config.resistMagics).toEqual(["フレイム", "アクア"]);
    expect(config.comboDamageMultiplier).toBe(COMBO_REDUCED_MULTIPLIER);
    expect(config.chargeInterval).toBe(CHARGE_INTERVAL_SHORTENED);
    expect(config.reasons.length).toBeGreaterThanOrEqual(4); // resist×2 + combo + charge
  });

  it("使用回数 0 の属性は耐性に登録されない", () => {
    const history: ActionHistory = {
      ...emptyHistory(),
      magicUsage: { フレイム: 5 },
    };
    const config = calcAdaptation(history);
    expect(config.resistMagics).toEqual(["フレイム"]); // 1種類のみ
  });
});
