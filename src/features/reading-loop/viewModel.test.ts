import { describe, expect, it } from "vitest";

import {
  RED_ARMOR_ENCOUNTER,
  buildStrategySentence,
  validateStrategySentence,
} from "../../readingLoop";
import {
  buildEvidencePassages,
  validationSummary,
  buildHypothesisFromSelection,
} from "./viewModel";

describe("reading-loop evidence view model", () => {
  it("keeps overlapping short interpretations selectable", () => {
    const battleRecord = buildEvidencePassages(RED_ARMOR_ENCOUNTER).find(
      (passage) => passage.id === "battle-record",
    );

    expect(
      battleRecord?.alternateSegments.map((segment) => segment.fragmentId),
    ).toEqual(["record-red-pulse", "record-front-lunge-short"]);
  });

  it("builds the same typed hypothesis from the short source ranges", () => {
    expect(
      buildHypothesisFromSelection(RED_ARMOR_ENCOUNTER, [
        "record-red-pulse",
        "record-front-lunge-short",
      ]),
    ).toEqual({
      type: "enemy_rule",
      condition: "enemy.armor_glows_red",
      predictedAction: "enemy.charges_front",
      evidenceFragmentIds: [
        "record-red-pulse",
        "record-front-lunge-short",
      ],
    });
  });

  it("keeps attack success and late-dodge details distinct", () => {
    const attackResult = validateStrategySentence({
      encounter: {
        ...RED_ARMOR_ENCOUNTER,
        enemyRule: {
          ...RED_ARMOR_ENCOUNTER.enemyRule,
          successfulCounters: ["player.attack"],
        },
      },
      sentence: buildStrategySentence(
        "enemy.armor_glows_red",
        "player.attack",
      ),
      activeConditions: ["enemy.armor_glows_red"],
    });
    const lateDodgeResult = validateStrategySentence({
      encounter: {
        ...RED_ARMOR_ENCOUNTER,
        enemyRule: {
          ...RED_ARMOR_ENCOUNTER.enemyRule,
          successfulCounters: [],
        },
      },
      sentence: buildStrategySentence(
        "enemy.armor_glows_red",
        "player.dodge_side",
      ),
      activeConditions: ["enemy.armor_glows_red"],
    });

    expect(validationSummary(attackResult)).toMatchObject({
      title: "攻撃で突進を押し返した",
      detail: "攻撃が突進を押し返し、反撃できる隙が生まれた。",
    });
    expect(validationSummary(lateDodgeResult)).toMatchObject({
      title: "回避が間に合わなかった",
      detail: "条件も行動も成立したが、回避が遅れて突進を受けた。",
    });
  });
});
