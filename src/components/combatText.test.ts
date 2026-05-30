import { describe, expect, it } from "vitest";

import { parseCombatLogEntry } from "./combatText";

describe("parseCombatLogEntry", () => {
  it("turns damage logs into floating combat text", () => {
    expect(parseCombatLogEntry("[damage] スライムに合計7ダメージ！")).toEqual({
      type: "damage",
      message: "スライムに合計7ダメージ！",
    });
  });

  it("turns block logs into shield feedback", () => {
    expect(parseCombatLogEntry("[block] 防御成功！ 5ダメージを軽減！")).toEqual({
      type: "block",
      message: "防御成功！ 5ダメージを軽減！",
    });
  });

  it("keeps untagged logs readable as normal feedback", () => {
    expect(parseCombatLogEntry("コード待機中")).toEqual({
      type: "normal",
      message: "コード待機中",
    });
  });
});
