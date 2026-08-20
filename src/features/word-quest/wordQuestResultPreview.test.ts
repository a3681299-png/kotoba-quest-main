import { describe, expect, it } from "vitest";
import {
  createBattleState,
  createStarterInventory,
  createStrategySentence,
  type StrategySentence,
} from "../../wordQuest";
import { buildWordQuestResultPreview } from "./wordQuestResultPreview";

const player = {
  hp: 50,
  maxHp: 50,
  statuses: [],
  actionPoints: 6,
} as const;

function attackSentence(overrides: Partial<StrategySentence> = {}) {
  return {
    ...createStrategySentence(0),
    subject: "subject.enemy",
    condition: "condition.enemy_near",
    action: "action.attack",
    ...overrides,
  };
}

describe("word quest result preview", () => {
  it("shows the exact condition, damage, and one-shot cadence", () => {
    const sentence = attackSentence();
    const preview = buildWordQuestResultPreview({
      enemyName: "見張りの石像",
      player,
      battle: createBattleState("gaze-idol"),
      strategies: [{ sentence, sentenceIndex: 0 }],
      inventory: createStarterInventory(),
    });

    expect(preview).toHaveLength(1);
    expect(preview[0]).toMatchObject({
      sentenceIndex: 0,
      conditionState: "passed",
      conditionLabel: "条件成立",
      conditionDetail: "敵が近くにいる",
      outcomeLabel: "見張りの石像に6ダメージ",
      outcomeTone: "damage",
      cadenceLabel: "この行動は一度だけ発動",
    });
  });

  it("makes a false condition and skipped action explicit", () => {
    const sentence = attackSentence({
      subject: "subject.self",
      condition: "condition.player_hurt",
      action: "action.heal",
      target: "subject.self",
    });
    const preview = buildWordQuestResultPreview({
      enemyName: "見張りの石像",
      player,
      battle: createBattleState("gaze-idol"),
      strategies: [{ sentence, sentenceIndex: 1 }],
      inventory: createStarterInventory(),
    });

    expect(preview[0]).toMatchObject({
      sentenceIndex: 1,
      conditionState: "failed",
      conditionLabel: "条件不成立",
      conditionDetail: "自分が傷ついている",
      outcomeLabel: "「回復する」は発動しません",
      cadenceLabel: "条件成立時、この行動は一度だけ発動",
    });
  });

  it("shows a partial repeat when the enemy blocks the second action", () => {
    const sentence = attackSentence({ modifier: "modifier.twice" });
    const inventory = {
      ...createStarterInventory(),
      "modifier.twice": { count: 1, rank: 1 },
    };
    const preview = buildWordQuestResultPreview({
      enemyName: "反響の翅",
      player,
      battle: createBattleState("echo-moth"),
      strategies: [{ sentence, sentenceIndex: 0 }],
      inventory,
    });

    expect(preview[0]).toMatchObject({
      conditionState: "passed",
      outcomeLabel: "反響の翅に6ダメージ",
      cadenceLabel: "2回を予定し、1回発動",
    });
    expect(preview[0]?.notes[0]?.label).toContain("同じ言葉を続けて使う");
  });
});
