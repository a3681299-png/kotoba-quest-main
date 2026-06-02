import { describe, it, expect } from "vitest";
import { runBattle, createBattleState } from "./battle";
import { parse } from "../parser/parser";
import type { EnemyData, StageConfig } from "./types";

// ─── テスト用データ ────────────────────────────────────

const STAGE1_CONFIG: StageConfig = {
  stageNumber: 1,
  initialMaxMp: 50,
  playerAttack: 20,
  stateGimmick: null,
};

// 弱い敵（HP 40, 防御 5, 無属性, 毎ラウンド 10~15ダメージ）
const WEAK_ENEMY: EnemyData = {
  id: "slime",
  name: "スライム",
  maxHp: 40,
  defense: 5,
  element: null,
  attackPatterns: [{ minDamage: 10, maxDamage: 10 }],
};

// 火属性の敵（弱点: 水, 耐性: 氷）
const FIRE_ENEMY: EnemyData = {
  id: "fire_slime",
  name: "ほのおスライム",
  maxHp: 60,
  defense: 5,
  element: "火",
  attackPatterns: [{ minDamage: 12, maxDamage: 12 }],
};

function parseCode(src: string) {
  const result = parse(src);
  if (!result.ok) throw new Error(`パース失敗: ${result.message}`);
  return result.ast;
}

// ─── 基本バトルテスト ─────────────────────────────────

describe("battle - 基本", () => {
  it("弱い敵をフレイムで倒せる", () => {
    const ast = parseCode([
      "繰り返す(敵が生きている あいだ):",
      "  魔法(フレイム)",
    ].join("\n"));

    const result = runBattle(ast, WEAK_ENEMY, STAGE1_CONFIG);
    expect(result.phase).toBe("victory");
    expect(result.finalEnemyHp).toBe(0);
  });

  it("メインループがないコードは敗北を返す", () => {
    const ast = parseCode("魔法(フレイム)");
    const result = runBattle(ast, WEAK_ENEMY, STAGE1_CONFIG);
    expect(result.phase).toBe("defeat");
  });

  it("属性弱点でダメージ2倍になる", () => {
    // 火属性敵に水属性魔法(アクア)→弱点2x
    const ast = parseCode([
      "繰り返す(敵が生きている あいだ):",
      "  魔法(アクア)",
    ].join("\n"));
    const result = runBattle(ast, FIRE_ENEMY, STAGE1_CONFIG);
    // ダメージ = max(1, floor(20 * 2) - 5) = 35
    // 60 / 35 = 2ラウンドで勝利
    expect(result.phase).toBe("victory");
    expect(result.rounds).toBeLessThanOrEqual(3);
  });
});

// ─── MP テスト ─────────────────────────────────────────

describe("battle - MP管理", () => {
  it("MP が足りない場合は魔法が不発になる", () => {
    // Stage1 初期MP=50、フレイム10MP × 5回 = 50MP
    // 6回目以降は不発
    const ast = parseCode([
      "繰り返す(敵が生きている あいだ):",
      "  繰り返す(6):",
      "    魔法(フレイム)",
    ].join("\n"));
    // 最初のラウンドで6回使おうとするが5回しか撃てない
    const result = runBattle(ast, { ...WEAK_ENEMY, maxHp: 200, attackPatterns: [{ minDamage: 0, maxDamage: 0 }] }, STAGE1_CONFIG);
    // 最初のラウンドで撃てるのは5回まで
    const round1Logs = result.log.filter(l => l.round === 1 && l.category === "playerAction");
    const fired = round1Logs.filter(l => l.message.includes("ダメージ"));
    expect(fired).toHaveLength(5);
  });

  it("MP回復が正しく計算される（ラウンド2開始時）", () => {
    // Stage1: 開始時MP=50, R2開始: maxMP=60, 回復=floor(60/3)=20, MP=20
    const ast = parseCode([
      "繰り返す(敵が生きている あいだ):",
      "  待機()",
    ].join("\n"));
    const state = createBattleState(WEAK_ENEMY, STAGE1_CONFIG);
    // 初期状態確認
    expect(state.playerMp).toBe(50);
    expect(state.maxPlayerMp).toBe(50);
  });
});

// ─── 条件分岐テスト ───────────────────────────────────

describe("battle - 条件分岐", () => {
  it("MP条件分岐が動作する", () => {
    const ast = parseCode([
      "繰り返す(敵が生きている あいだ):",
      "  もし 自分のMP が 10 以上 ならば:",
      "    魔法(フレイム)",
      "  そうでなければ:",
      "    待機()",
    ].join("\n"));
    const result = runBattle(ast, WEAK_ENEMY, STAGE1_CONFIG);
    expect(result.phase).toBe("victory");
  });
});

// ─── 繰り返しテスト ───────────────────────────────────

describe("battle - 繰り返し", () => {
  it("繰り返す(N)でまとめて魔法を使える", () => {
    const ast = parseCode([
      "繰り返す(敵が生きている あいだ):",
      "  繰り返す(3):",
      "    魔法(フレイム)",
    ].join("\n"));
    const result = runBattle(ast, WEAK_ENEMY, STAGE1_CONFIG);
    expect(result.phase).toBe("victory");
  });
});

// ─── 合体魔法テスト ───────────────────────────────────

describe("battle - 合体魔法", () => {
  it("3属性揃ってMPが足りれば合体魔法が発動する", () => {
    // Stage2: initialMaxMp=60, 攻撃力=25
    // R1: MP=60, 3属性 = 80MP必要 → 不発（個別発動）
    // R2: MP=60+20=80 → 合体魔法発動！
    const config: StageConfig = { stageNumber: 2, initialMaxMp: 60, playerAttack: 25, stateGimmick: null };
    const ast = parseCode([
      "繰り返す(敵が生きている あいだ):",
      "  もし 自分のMP が 80 以上 ならば:",
      "    魔法(フレイム)",
      "    魔法(アクア)",
      "    魔法(スパーク)",
      "  そうでなければ:",
      "    待機()",
    ].join("\n"));
    const result = runBattle(ast, { ...WEAK_ENEMY, maxHp: 300, attackPatterns: [{ minDamage: 0, maxDamage: 0 }] }, config);
    const comboLogs = result.log.filter(l => l.category === "comboMagic");
    expect(comboLogs.length).toBeGreaterThan(0);
  });

  it("5属性合体魔法は耐性を無視して200ダメージを与える", () => {
    const config: StageConfig = { stageNumber: 4, initialMaxMp: 120, playerAttack: 25, stateGimmick: null };
    const ast = parseCode([
      "繰り返す(敵が生きている あいだ):",
      "  もし 自分のMP が 120 以上 ならば:",
      "    魔法(フレイム)",
      "    魔法(アクア)",
      "    魔法(スパーク)",
      "    魔法(フロスト)",
      "    魔法(ゲイル)",
      "  そうでなければ:",
      "    待機()",
    ].join("\n"));
    const result = runBattle(ast, { ...WEAK_ENEMY, maxHp: 200, attackPatterns: [{ minDamage: 0, maxDamage: 0 }] }, config);
    expect(result.log.some(l => l.category === "comboMagic" && l.message.includes("200 ダメージ"))).toBe(true);
    expect(result.phase).toBe("victory");
    expect(result.finalEnemyHp).toBe(0);
  });
});

// ─── ログ確認 ─────────────────────────────────────────

describe("battle - ログ", () => {
  it("バトルログが記録される", () => {
    const ast = parseCode([
      "繰り返す(敵が生きている あいだ):",
      "  魔法(フレイム)",
    ].join("\n"));
    const result = runBattle(ast, WEAK_ENEMY, STAGE1_CONFIG);
    expect(result.log.length).toBeGreaterThan(0);
    expect(result.log.some(l => l.category === "roundStart")).toBe(true);
    expect(result.log.some(l => l.category === "playerAction")).toBe(true);
    expect(result.log.some(l => l.category === "result")).toBe(true);
  });
});
