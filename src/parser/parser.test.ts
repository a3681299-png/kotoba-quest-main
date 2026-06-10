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

    it("する形の基本命令をパースできる", () => {
      const result = parse(`攻撃する
回復する`);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast).toHaveLength(2);
        expect(result.ast[0]).toMatchObject({
          type: "FunctionCall",
          name: "攻撃する",
          args: [],
        });
        expect(result.ast[1]).toMatchObject({
          type: "FunctionCall",
          name: "回復する",
          args: [],
        });
      }
    });

    it("日本語の回数指定くりかえしをパースできる", () => {
      const result = parse("3回 くりかえす 攻撃する");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast).toHaveLength(1);
        const loop = result.ast[0];
        expect(loop).toMatchObject({
          type: "Loop",
          count: 3,
        });
        if (loop.type === "Loop") {
          expect(loop.body[0]).toMatchObject({
            type: "FunctionCall",
            name: "攻撃する",
          });
        }
      }
    });

    it("自然文のもし/そうでなければをパースできる", () => {
      const result = parse(`もし 敵HP が 少ない なら 攻撃する
そうでなければ 観察する`);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast).toHaveLength(1);
        const ifStatement = result.ast[0];
        expect(ifStatement).toMatchObject({
          type: "If",
          condition: {
            left: "敵HP",
            op: "が",
            right: "少ない",
          },
        });
        if (ifStatement.type === "If") {
          expect(ifStatement.body[0]).toMatchObject({
            type: "FunctionCall",
            name: "攻撃する",
          });
          expect(ifStatement.elseBody?.[0]).toMatchObject({
            type: "FunctionCall",
            name: "観察する",
          });
        }
      }
    });

    it("作戦定義と作戦呼び出しをパースできる", () => {
      const result = parse(`作戦A は { 観察する 話しかける }
作戦A を 実行する`);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast).toHaveLength(2);
        const planDefinition = result.ast[0];
        expect(planDefinition).toMatchObject({
          type: "PlanDefinition",
          name: "作戦A",
        });
        if (planDefinition.type === "PlanDefinition") {
          expect(planDefinition.body).toHaveLength(2);
        }
        expect(result.ast[1]).toMatchObject({
          type: "FunctionCall",
          name: "作戦A",
          args: [],
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
