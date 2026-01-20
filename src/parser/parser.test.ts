import { describe, it, expect } from "vitest";
import { parse } from "./parser";

describe("Parser", () => {
  describe("成功ケース", () => {
    it("シンプルな関数呼び出しをパースできる", () => {
      const result = parse('攻撃("ファイア")');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast).toHaveLength(1);
        expect(result.ast[0].type).toBe("FunctionCall");
        expect(result.ast[0]).toMatchObject({
          type: "FunctionCall",
          name: "攻撃",
          args: ["ファイア"],
        });
        // 位置情報が含まれていることを確認
        expect(result.ast[0].location).toBeDefined();
        expect(result.ast[0].location.start.line).toBe(1);
      }
    });

    it("変数宣言をパースできる", () => {
      const result = parse("変数 威力 = 20");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast).toHaveLength(1);
        expect(result.ast[0]).toMatchObject({
          type: "VariableDecl",
          name: "威力",
          value: 20,
        });
      }
    });

    it("ループ文をパースできる", () => {
      const result = parse('繰り返す(3) { 攻撃("ファイア") }');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast).toHaveLength(1);
        expect(result.ast[0].type).toBe("Loop");
        if (result.ast[0].type === "Loop") {
          expect(result.ast[0].count).toBe(3);
          expect(result.ast[0].body).toHaveLength(1);
        }
      }
    });

    it("条件分岐をパースできる", () => {
      const result = parse('もし(敵の体力 < 50) { 攻撃("サンダー") }');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast).toHaveLength(1);
        expect(result.ast[0].type).toBe("If");
        if (result.ast[0].type === "If") {
          expect(result.ast[0].condition.op).toBe("<");
          expect(result.ast[0].body).toHaveLength(1);
        }
      }
    });

    it("複数行のコードをパースできる", () => {
      const code = `変数 威力 = 20
攻撃("ファイア")`;
      const result = parse(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast).toHaveLength(2);
        // 各行の位置情報を確認
        expect(result.ast[0].location.start.line).toBe(1);
        expect(result.ast[1].location.start.line).toBe(2);
      }
    });

    it("全角カッコも受け付ける", () => {
      const result = parse('攻撃（"ファイア"）');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast[0]).toMatchObject({
          type: "FunctionCall",
          name: "攻撃",
          args: ["ファイア"],
        });
      }
    });
  });

  describe("エラーケース", () => {
    it("閉じカッコがない場合エラーを返す", () => {
      const result = parse('攻撃("ファイア"');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.location).not.toBeNull();
        expect(result.error.message).toContain("Expected");
      }
    });

    it("不正な構文でエラーを返す", () => {
      const result = parse("これは変なコード!!!");

      expect(result.success).toBe(false);
    });

    it("エラー位置情報が含まれる", () => {
      const code = `攻撃("ファイア")
攻撃("アイス"`;
      const result = parse(code);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.location?.start.line).toBe(2);
      }
    });
  });
});
