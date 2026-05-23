import { describe, it, expect } from "vitest";
import { parse } from "./parser";
import type { LoopWhileNode, LoopNNode, IfNode, MagicCmdNode, AssignNode } from "./ast";

// ─── プリプロセッサのみのテスト ──────────────────────────
describe("preprocessor", () => {
  it("インデントをブレースに変換する", async () => {
    const { preprocess } = await import("./preprocessor");
    const result = preprocess([
      "繰り返す(敵が生きている あいだ):",
      "  魔法(フレイム)",
    ].join("\n"));
    expect(result.errors).toHaveLength(0);
    expect(result.output).toContain("{");
    expect(result.output).toContain("}");
  });

  it("2段階インデントを正しく変換する", async () => {
    const { preprocess } = await import("./preprocessor");
    const result = preprocess([
      "繰り返す(敵が生きている あいだ):",
      "  もし 自分のMP が 10 以上 ならば:",
      "    魔法(フレイム)",
    ].join("\n"));
    expect(result.errors).toHaveLength(0);
    // 2つのブレースペアが必要
    const opens = (result.output.match(/\{/g) ?? []).length;
    expect(opens).toBe(2);
  });
});

// ─── パーサー基本テスト ───────────────────────────────────
describe("parse - 基本命令", () => {
  it("魔法コマンドをパースできる", () => {
    const r = parse("魔法(フレイム)");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const node = r.ast[0] as MagicCmdNode;
    expect(node.type).toBe("MagicCmd");
    expect(node.arg).toBe("フレイム");
  });

  it("防御コマンドをパースできる", () => {
    const r = parse("防御()");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ast[0].type).toBe("DefendCmd");
  });

  it("回復コマンドをパースできる", () => {
    const r = parse("回復()");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ast[0].type).toBe("HealCmd");
  });

  it("待機コマンドをパースできる", () => {
    const r = parse("待機()");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ast[0].type).toBe("WaitCmd");
  });
});

// ─── 変数代入 ─────────────────────────────────────────────
describe("parse - 変数代入", () => {
  it("数値の代入をパースできる", () => {
    const r = parse("こうげきかいすう = 3");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const node = r.ast[0] as AssignNode;
    expect(node.type).toBe("Assign");
    expect(node.name).toBe("こうげきかいすう");
    expect(node.value).toBe(3);
  });

  it("魔法名の代入をパースできる", () => {
    const r = parse("まほう = フレイム");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const node = r.ast[0] as AssignNode;
    expect(node.name).toBe("まほう");
    expect(node.value).toBe("フレイム");
  });
});

// ─── 繰り返し ─────────────────────────────────────────────
describe("parse - 繰り返し", () => {
  it("条件付きループをパースできる", () => {
    const src = [
      "繰り返す(敵が生きている あいだ):",
      "  魔法(フレイム)",
    ].join("\n");
    const r = parse(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const node = r.ast[0] as LoopWhileNode;
    expect(node.type).toBe("LoopWhile");
    expect(node.condition).toEqual({ type: "EnemyAlive" });
    expect(node.body).toHaveLength(1);
    expect(node.body[0].type).toBe("MagicCmd");
  });

  it("回数指定ループをパースできる", () => {
    const src = [
      "繰り返す(3):",
      "  魔法(アクア)",
    ].join("\n");
    const r = parse(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const node = r.ast[0] as LoopNNode;
    expect(node.type).toBe("LoopN");
    expect(node.count).toBe(3);
  });
});

// ─── 条件分岐 ─────────────────────────────────────────────
describe("parse - 条件分岐", () => {
  it("もし〜ならばをパースできる", () => {
    const src = [
      "もし 自分のMP が 80 以上 ならば:",
      "  魔法(フレイム)",
      "そうでなければ:",
      "  防御()",
    ].join("\n");
    const r = parse(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const node = r.ast[0] as IfNode;
    expect(node.type).toBe("If");
    expect(node.condition).toMatchObject({ type: "Comp", op: "以上" });
    expect(node.then).toHaveLength(1);
    expect(node.else).toHaveLength(1);
  });

  it("そうでなければ もし（elif）をパースできる", () => {
    const src = [
      "もし 敵が火状態 ならば:",
      "  魔法(フレイム)",
      "そうでなければ もし 敵が水状態 ならば:",
      "  魔法(アクア)",
      "そうでなければ:",
      "  魔法(スパーク)",
    ].join("\n");
    const r = parse(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const node = r.ast[0] as IfNode;
    expect(node.elseIfs).toHaveLength(1);
    expect(node.elseIfs[0].condition).toMatchObject({
      type: "EnemyState",
      element: "水",
    });
  });

  it("かつ で連結した条件をパースできる", () => {
    const src = [
      "もし 自分のMP が 80 以上 かつ 敵のHP が 30 より小さい ならば:",
      "  魔法(フレイム)",
    ].join("\n");
    const r = parse(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const node = r.ast[0] as IfNode;
    expect(node.condition.type).toBe("Logic");
  });
});

// ─── 相互参照（MemberRef）─────────────────────────────────
describe("parse - 相互参照", () => {
  it("プレイヤー.変数名 を条件に使える（比較演算子は最後）", () => {
    const src = [
      "もし プレイヤー.あいず が 1 と等しい ならば:",
      "  魔法(ゲイル)",
    ].join("\n");
    const r = parse(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const node = r.ast[0] as IfNode;
    expect(node.condition.type).toBe("Comp");
  });

  it("なかま.変数名 を条件に使える", () => {
    const src = [
      "もし なかま.じゅんび が 1 と等しい ならば:",
      "  魔法(フレイム)",
    ].join("\n");
    const r = parse(src);
    expect(r.ok).toBe(true);
  });
});

// ─── ステージ1 完全コード ─────────────────────────────────
describe("parse - ステージ1 想定コード", () => {
  it("基本的なメインループをパースできる", () => {
    const src = [
      "繰り返す(敵が生きている あいだ):",
      "  魔法(フレイム)",
    ].join("\n");
    const r = parse(src);
    expect(r.ok).toBe(true);
  });

  it("MP判定つきのコードをパースできる", () => {
    const src = [
      "繰り返す(敵が生きている あいだ):",
      "  もし 自分のMP が 10 以上 ならば:",
      "    魔法(アクア)",
      "  そうでなければ:",
      "    待機()",
    ].join("\n");
    const r = parse(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const loop = r.ast[0] as LoopWhileNode;
    expect(loop.body[0].type).toBe("If");
  });
});
