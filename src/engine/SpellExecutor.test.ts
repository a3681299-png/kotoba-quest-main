import { describe, expect, it } from "vitest";

import { parse } from "../parser/parser";
import { SpellExecutor } from "./SpellExecutor";

async function executeTutorialCode(
  code: string,
  enemyHp = 20,
  maxEnemyHp = enemyHp,
) {
  const parseResult = parse(code);

  expect(parseResult.success).toBe(true);
  if (!parseResult.success) {
    throw new Error(parseResult.error.message);
  }

  const executor = new SpellExecutor({
    playerHp: 60,
    enemyHp,
    maxEnemyHp,
    variables: new Map(),
  });

  return executor.execute(parseResult.ast);
}

describe("SpellExecutor tutorial commands", () => {
  it("maps bare attack and heal commands to existing actions", async () => {
    const result = await executeTutorialCode(`攻撃する
回復する`);

    expect(result.error).toBeUndefined();
    expect(result.actions).toEqual([
      { type: "attack", attackType: "normal", damage: 10 },
      { type: "heal", amount: 20 },
    ]);
  });

  it("emits meaning actions for observation and dialogue", async () => {
    const result = await executeTutorialCode(`観察する
話しかける`);

    expect(result.error).toBeUndefined();
    expect(result.actions).toEqual([
      { type: "meaning", method: "observe", amount: 5 },
      { type: "meaning", method: "talk", amount: 15 },
    ]);
  });

  it("records enemy words and uses them in a later condition", async () => {
    const result = await executeTutorialCode(`敵の言葉を 記録する
もし 敵の言葉 が 前と同じ なら 話しかける`);

    expect(result.error).toBeUndefined();
    expect(result.logs).toContain("敵の言葉を記録した");
    expect(result.actions).toEqual([
      { type: "meaning", method: "talk", amount: 15 },
    ]);
  });

  it("runs commands grouped in a named plan", async () => {
    const result = await executeTutorialCode(`作戦A は { 観察する 話しかける }
作戦A を 実行する`);

    expect(result.error).toBeUndefined();
    expect(result.logs).toContain("作戦A を実行");
    expect(result.actions).toEqual([
      { type: "meaning", method: "observe", amount: 5 },
      { type: "meaning", method: "talk", amount: 15 },
    ]);
  });

  it("uses the else branch when the condition is false", async () => {
    const result = await executeTutorialCode(`もし 敵HP が 多い なら 攻撃する
そうでなければ 観察する`, 10, 20);

    expect(result.error).toBeUndefined();
    expect(result.actions).toEqual([
      { type: "meaning", method: "observe", amount: 5 },
    ]);
  });
});
