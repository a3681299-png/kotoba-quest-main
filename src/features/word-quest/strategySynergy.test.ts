import { describe, expect, it } from "vitest";
import type {
  SentenceValidation,
  StrategySentence,
} from "../../wordQuest";
import { analyzeStrategySynergy } from "./strategySynergy";

function validation(
  sentence: StrategySentence,
  valid = true,
): SentenceValidation {
  return {
    sentenceId: sentence.id,
    valid,
    issue: valid ? null : "未完成",
    missingSlot: valid ? null : "action",
  };
}

function attackSentence(index: number): StrategySentence {
  return {
    id: `sentence-${index}`,
    subject: "subject.enemy",
    condition: "condition.enemy_near",
    connector: "connector.then",
    action: "action.attack",
    target: "subject.enemy",
    modifier: "modifier.once",
  };
}

describe("strategy synergy view", () => {
  it("keeps a plain sentence at one represented action", () => {
    const sentence = attackSentence(0);
    expect(
      analyzeStrategySynergy([sentence], [validation(sentence)]),
    ).toMatchObject({
      validSentenceCount: 1,
      representedActionCount: 1,
      savedSentenceCount: 0,
      placedWordCount: 6,
      uniqueWordCount: 5,
    });
  });

  it("shows whenever and twice as three actions compressed into one sentence", () => {
    const sentence: StrategySentence = {
      ...attackSentence(0),
      connector: "connector.whenever",
      modifier: "modifier.twice",
    };
    const result = analyzeStrategySynergy(
      [sentence],
      [validation(sentence)],
    );

    expect(result).toMatchObject({
      validSentenceCount: 1,
      representedActionCount: 3,
      savedSentenceCount: 2,
    });
    expect(result.sentences[0]).toMatchObject({
      actionRuns: 3,
      savedSentences: 2,
      highlightedSlots: ["connector", "modifier"],
    });
  });

  it("connects status-producing actions to dependent conditions", () => {
    const stop: StrategySentence = {
      ...attackSentence(0),
      action: "action.stop",
    };
    const bind: StrategySentence = {
      ...attackSentence(1),
      condition: "condition.enemy_stopped",
      connector: "connector.after",
      action: "action.bind",
    };
    const attack: StrategySentence = {
      ...attackSentence(2),
      condition: "condition.enemy_bound",
      connector: "connector.after",
    };
    const result = analyzeStrategySynergy(
      [stop, bind, attack],
      [validation(stop), validation(bind), validation(attack)],
    );

    expect(result.links.map((link) => link.label)).toEqual([
      "止める → 止まっている",
      "拘束する → 拘束されている",
    ]);
  });

  it("does not advertise compression for an invalid sentence", () => {
    const sentence: StrategySentence = {
      ...attackSentence(0),
      connector: "connector.whenever",
      modifier: "modifier.twice",
    };
    const result = analyzeStrategySynergy(
      [sentence],
      [validation(sentence, false)],
    );

    expect(result).toMatchObject({
      validSentenceCount: 0,
      representedActionCount: 0,
      savedSentenceCount: 0,
    });
    expect(result.sentences[0]?.labels).toEqual([]);
  });
});
