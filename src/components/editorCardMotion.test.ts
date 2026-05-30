import { describe, expect, it } from "vitest";

import {
  editorCardVariants,
  getEditorCardClassName,
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
      "code-area code-workbench is-ready",
    );
    expect(getEditorCardClassName("entering")).toBe("code-area code-workbench");
    expect(getEditorCardClassName("submitting")).toBe(
      "code-area code-workbench",
    );
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
