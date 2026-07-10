import { describe, expect, it } from "vitest";
import type { PlayerActionSemanticId } from "../../readingLoop";
import { getLiveSentenceOutcomeCopy } from "./liveSentenceCopy";
import type { SentenceMotionOutcome } from "./sentenceMotion";

describe("live sentence result copy", () => {
  it.each<
    [
      SentenceMotionOutcome,
      PlayerActionSemanticId,
      { eyebrow: string; title: string; detail: string },
    ]
  >([
    [
      "success",
      "player.dodge_side",
      {
        eyebrow: "作戦が通った",
        title: "突進が空を切った",
        detail: "横のレーンへ外れたため、獣は残像を追って行き過ぎた。",
      },
    ],
    [
      "actionFail",
      "player.guard_front",
      {
        eyebrow: "行動で失敗",
        title: "防御ごと押し切られた",
        detail: "条件は働いたが、正面防御では突進を受け止めきれなかった。",
      },
    ],
    [
      "actionFail",
      "player.attack",
      {
        eyebrow: "行動で失敗",
        title: "攻撃が突進に潰された",
        detail: "条件は働いたが、正面からの攻撃では先に押し負けた。",
      },
    ],
    [
      "success",
      "player.guard_front",
      {
        eyebrow: "作戦が通った",
        title: "盾で突進を受け止めた",
        detail: "盾で正面の衝撃を受け止め、獣の突進を押し返した。",
      },
    ],
    [
      "success",
      "player.attack",
      {
        eyebrow: "作戦が通った",
        title: "斬撃が突進を押し返した",
        detail: "斬撃が突進とぶつかり、獣を正面から押し戻した。",
      },
    ],
    [
      "actionFail",
      "player.dodge_side",
      {
        eyebrow: "行動で失敗",
        title: "回避が突進に間に合わなかった",
        detail: "横へ動き始めたが、軸を外れる前に突進を受けた。",
      },
    ],
  ])("%s / %s", (outcome, action, expected) => {
    expect(getLiveSentenceOutcomeCopy(outcome, action)).toEqual(expected);
  });
});
