import { gsap } from "gsap";
import { describe, expect, it, vi } from "vitest";
import { createSentenceTimelineControls } from "./sentenceMotionControls";

describe("sentence timeline cancellation", () => {
  it("kills an active timeline and runs cleanup once", () => {
    const value = { x: 0 };
    const cleanup = vi.fn();
    const timeline = gsap.timeline({ paused: true }).to(value, {
      x: 100,
      duration: 1,
    });
    const controls = createSentenceTimelineControls(timeline, cleanup);

    controls.play();
    expect(timeline.paused()).toBe(false);

    controls.kill();
    controls.kill();

    expect(controls.isKilled()).toBe(true);
    expect(timeline.isActive()).toBe(false);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
