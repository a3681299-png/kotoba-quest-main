import { describe, it, expect } from "vitest";
import { parse } from "../parser/parser";
import { executeRoundBody } from "./executor";
import type { BattleState } from "./types";

function createDummyEnemy() {
  return {
    id: "dummy",
    name: "ダミー敵",
    maxHp: 50,
    defense: 0,
    element: null,
    attackPatterns: [{ minDamage: 0, maxDamage: 0 }],
  };
}

describe("executor - ターゲット指定魔法", () => {
  it("敵[2番目]へ 魔法(アクア) の targetIndex を保持する", () => {
    const source = "敵[2番目]へ 魔法(アクア)";
    const parsed = parse(source);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const state: BattleState = {
      playerHp: 100,
      maxPlayerHp: 100,
      playerMp: 80,
      maxPlayerMp: 80,
      playerAttack: 20,
      enemyHp: 50,
      maxEnemyHp: 50,
      enemy: createDummyEnemy(),
      stateGimmick: null,
      currentEnemyState: null,
      round: 1,
      enemyEffects: [],
      playerBuffs: [],
      playerDefending: false,
      phase: "battle",
      log: [],
    };

    const result = executeRoundBody(parsed.ast, state);
    expect(result.error).toBeNull();
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]).toMatchObject({ type: "MagicUse", magic: "アクア", targetIndex: 2 });
  });
});
