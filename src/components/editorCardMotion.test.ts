import { describe, expect, it } from "vitest";

import {
  editorCardVariants,
  getEditorCardClassName,
  isPreparationDeskOpen,
  shouldRunCodeAfterCardAnimation,
} from "./editorCardMotion";

describe("editorCardVariants", () => {
  it("plays the whole editor like a single battle card when submitted", () => {
    expect(editorCardVariants.submitting).toMatchObject({
      y: "-64vh",
      opacity: 0,
      scale: 0.26,
      rotateX: 10,
      rotateZ: -7,
      transformPerspective: 900,
      transition: {
        duration: 0.72,
        ease: [0.16, 1, 0.3, 1],
      },
    });
  });
});

describe("getEditorCardClassName", () => {
  it("marks only the ready editor as an active hand card", () => {
    expect(getEditorCardClassName("ready")).toBe(
      "code-area code-workbench battle-command-hud is-ready",
    );
    expect(getEditorCardClassName("entering")).toBe(
      "code-area code-workbench battle-command-hud",
    );
    expect(getEditorCardClassName("submitting")).toBe(
      "code-area code-workbench battle-command-hud",
    );
  });

  it("uses a desk surface class for the preparation card table", () => {
    expect(getEditorCardClassName("ready", "desk")).toBe(
      "code-area code-workbench preparation-desk is-ready",
    );
    expect(getEditorCardClassName("submitting", "desk")).toBe(
      "code-area code-workbench preparation-desk",
    );
  });
});

describe("isPreparationDeskOpen", () => {
  it("opens only during the visible player preparation phase", () => {
    expect(
      isPreparationDeskOpen({
        battlePhase: "player_turn",
        isIntroDialogueOpen: false,
        showVictory: false,
        showDefeat: false,
      }),
    ).toBe(true);
  });

  it("stays closed while dialogue, execution, or result screens own the view", () => {
    expect(
      isPreparationDeskOpen({
        battlePhase: "player_turn",
        isIntroDialogueOpen: true,
        showVictory: false,
        showDefeat: false,
      }),
    ).toBe(false);
    expect(
      isPreparationDeskOpen({
        battlePhase: "executing",
        isIntroDialogueOpen: false,
        showVictory: false,
        showDefeat: false,
      }),
    ).toBe(false);
    expect(
      isPreparationDeskOpen({
        battlePhase: "player_turn",
        isIntroDialogueOpen: false,
        showVictory: true,
        showDefeat: false,
      }),
    ).toBe(false);
    expect(
      isPreparationDeskOpen({
        battlePhase: "player_turn",
        isIntroDialogueOpen: false,
        showVictory: false,
        showDefeat: true,
      }),
    ).toBe(false);
  });
});

describe("shouldRunCodeAfterCardAnimation", () => {
  it("runs code only after the submit animation completes", () => {
    expect(shouldRunCodeAfterCardAnimation("submitting", "submitting")).toBe(
      true,
    );
  });

  it("does not run code for enter or ready animation completions", () => {
    expect(shouldRunCodeAfterCardAnimation("entering", "entering")).toBe(false);
    expect(shouldRunCodeAfterCardAnimation("ready", "ready")).toBe(false);
  });

  it("ignores stale animation completion callbacks", () => {
    expect(shouldRunCodeAfterCardAnimation("ready", "submitting")).toBe(false);
    expect(shouldRunCodeAfterCardAnimation("submitting", "ready")).toBe(false);
  });
});
