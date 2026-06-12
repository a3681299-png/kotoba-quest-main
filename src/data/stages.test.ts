import { describe, expect, it } from "vitest";

import { parse } from "../parser/parser";
import { STAGES } from "./stages";

describe("tutorial stage data", () => {
  it("follows the six tutorial lessons from the overview spec", () => {
    expect(
      STAGES.map((stage) => ({
        name: stage.name,
        mentor: stage.mentorName,
        concept: stage.concept,
      })),
    ).toEqual([
      { name: "命令の糸", mentor: "人形師", concept: "順次実行" },
      { name: "契約の一文", mentor: "契約者", concept: "条件分岐" },
      { name: "めぐる庭", mentor: "植物の魔女", concept: "くりかえし" },
      { name: "忘れ名の書庫", mentor: "司書", concept: "変数" },
      { name: "塔からの作戦", mentor: "幽閉の姫", concept: "関数" },
      { name: "敵ではない影", mentor: "道化師", concept: "そうでなければ" },
    ]);
  });

  it("keeps every tutorial sample parseable", () => {
    for (const stage of STAGES) {
      const result = parse(stage.sampleCode);

      expect(result.success, `stage ${stage.id}: ${stage.name}`).toBe(true);
    }
  });

  it("starts each stage with a player and enemy dialogue intro", () => {
    for (const stage of STAGES) {
      expect(stage.introDialogue.length, `stage ${stage.id}`).toBeGreaterThan(1);
      expect(stage.introDialogue.some((line) => line.speaker === "player")).toBe(
        true,
      );
      expect(stage.introDialogue.some((line) => line.speaker === "enemy")).toBe(
        true,
      );
    }
  });

  it("assigns the new mentor portraits to the tutorial stages", () => {
    expect(
      STAGES.map((stage) => ({
        mentor: stage.mentorName,
        portrait: stage.mentorPortraitUrl,
      })),
    ).toEqual([
      expect.objectContaining({ mentor: "人形師", portrait: expect.stringContaining("/4/2.png") }),
      expect.objectContaining({ mentor: "契約者", portrait: expect.stringContaining("/2/1.png") }),
      expect.objectContaining({ mentor: "植物の魔女", portrait: expect.stringContaining("/1/2.png") }),
      expect.objectContaining({ mentor: "司書", portrait: expect.stringContaining("/6/2.png") }),
      expect.objectContaining({ mentor: "幽閉の姫", portrait: expect.stringContaining("/2/3.png") }),
      expect.objectContaining({ mentor: "道化師", portrait: expect.stringContaining("/5/2.png") }),
    ]);
  });
});
