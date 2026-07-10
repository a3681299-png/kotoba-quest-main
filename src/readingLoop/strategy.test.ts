import { describe, expect, it } from "vitest";

import {
  RED_ARMOR_ENCOUNTER,
  buildStrategySentence,
  parseStrategySentence,
  validateHypothesis,
} from "./index";
import type { Hypothesis, StrategySentence } from "./types";

describe("reading-loop strategy semantics", () => {
  it("builds a typed conditional strategy from sentence fragments", () => {
    const analysis = parseStrategySentence(
      buildStrategySentence(
        "enemy.armor_glows_red",
        "player.dodge_side",
        "record-red-seams",
      ),
    );

    expect(analysis.state).toBe("valid");
    if (analysis.state === "valid") {
      expect(analysis.parsed).toEqual({
        type: "conditional",
        condition: {
          subject: "enemy",
          event: "armor_glows_red",
          semanticId: "enemy.armor_glows_red",
        },
        action: {
          actor: "player",
          type: "dodge",
          direction: "side",
          semanticId: "player.dodge_side",
        },
      });
    }
  });

  it("distinguishes a fresh sentence, an incomplete prefix, and invalid order", () => {
    expect(parseStrategySentence({ parts: [] })).toMatchObject({
      state: "building",
      expectedNext: "condition",
    });

    const incomplete: StrategySentence = {
      parts: [
        { kind: "condition", semanticId: "enemy.armor_glows_red" },
        { kind: "connector", semanticId: "syntax.if_then" },
      ],
    };
    expect(parseStrategySentence(incomplete)).toMatchObject({
      state: "incomplete",
      expectedNext: "action",
    });

    const invalid: StrategySentence = {
      parts: [
        { kind: "action", semanticId: "player.attack" },
        { kind: "connector", semanticId: "syntax.if_then" },
        { kind: "condition", semanticId: "enemy.armor_glows_red" },
      ],
    };
    expect(parseStrategySentence(invalid)).toMatchObject({
      state: "invalid",
      expectedNext: null,
    });
  });

  it("accepts different source ranges when they resolve to the same semantic IDs", () => {
    const fullClauses: Hypothesis = {
      type: "enemy_rule",
      condition: "enemy.armor_glows_red",
      predictedAction: "enemy.charges_front",
      evidenceFragmentIds: ["record-red-seams", "record-front-lunge"],
    };
    const shortClauses: Hypothesis = {
      ...fullClauses,
      evidenceFragmentIds: [
        "record-red-pulse",
        "record-front-lunge-short",
      ],
    };

    expect(
      validateHypothesis(RED_ARMOR_ENCOUNTER, fullClauses).assessment,
    ).toBe("confirmed");
    expect(
      validateHypothesis(RED_ARMOR_ENCOUNTER, shortClauses).assessment,
    ).toBe("confirmed");
  });

  it("keeps every extractable range aligned with its continuous source text", () => {
    for (const evidence of RED_ARMOR_ENCOUNTER.evidenceTexts) {
      for (const fragment of evidence.fragments) {
        expect(evidence.text.slice(fragment.start, fragment.end)).toBe(
          fragment.quote,
        );
      }
    }
  });
});
