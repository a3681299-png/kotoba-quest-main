import { describe, expect, it } from "vitest";

import { tokenizeCodeLine } from "./codeSyntax";

describe("tokenizeCodeLine", () => {
  it("classifies Japanese control keywords, combat commands, numbers, and stats", () => {
    expect(tokenizeCodeLine("もし 敵HP < 50 なら")).toEqual([
      { text: "もし", type: "keyword" },
      { text: " ", type: "plain" },
      { text: "敵HP", type: "stat" },
      { text: " ", type: "plain" },
      { text: "<", type: "operator" },
      { text: " ", type: "plain" },
      { text: "50", type: "number" },
      { text: " ", type: "plain" },
      { text: "なら", type: "keyword" },
    ]);
  });

  it("classifies command names before their argument parentheses", () => {
    expect(tokenizeCodeLine("  強攻撃(12)")).toEqual([
      { text: "  ", type: "plain" },
      { text: "強攻撃", type: "command" },
      { text: "(", type: "operator" },
      { text: "12", type: "number" },
      { text: ")", type: "operator" },
    ]);
  });
});
