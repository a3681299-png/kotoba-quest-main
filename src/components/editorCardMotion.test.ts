import { describe, expect, it } from "vitest";

import { shouldRunCodeAfterCardAnimation } from "./editorCardMotion";

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
  });
});
