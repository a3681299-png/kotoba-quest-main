import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import * as PIXI from "pixi.js";
import type { PlayerActionSemanticId, TraceEvent } from "../../readingLoop";
import {
  resetBattlefieldTargets,
  type BattlefieldMotionTargets,
} from "./LiveBattlefield";
import { createSentenceTimelineControls } from "./sentenceMotionControls";

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

export const SENTENCE_MOTION_LABELS = [
  "lock",
  "omen",
  "condition",
  "connector",
  "action",
  "impact",
  "result",
  "rewind",
] as const;

export type SentenceMotionLabel = (typeof SENTENCE_MOTION_LABELS)[number];
export type SentenceMotionOutcome =
  | "success"
  | "conditionMiss"
  | "actionFail";

export interface SentenceMotionSchedule {
  outcome: SentenceMotionOutcome;
  reducedMotion: boolean;
  labels: Readonly<Record<SentenceMotionLabel, number>>;
  duration: number;
}

const FULL_LABEL_TIMES: Readonly<Record<SentenceMotionLabel, number>> = {
  lock: 0,
  omen: 0.24,
  condition: 0.8,
  connector: 1.28,
  action: 1.78,
  impact: 2.32,
  result: 3.28,
  rewind: 4.32,
};

const REDUCED_LABEL_TIMES: Readonly<Record<SentenceMotionLabel, number>> = {
  lock: 0,
  omen: 0.06,
  condition: 0.13,
  connector: 0.2,
  action: 0.27,
  impact: 0.34,
  result: 0.43,
  rewind: 0.6,
};

export function getSentenceMotionSchedule(
  outcome: SentenceMotionOutcome,
  reducedMotion: boolean,
): SentenceMotionSchedule {
  const labels = reducedMotion ? REDUCED_LABEL_TIMES : FULL_LABEL_TIMES;
  return {
    outcome,
    reducedMotion,
    labels,
    duration: labels.rewind + (reducedMotion ? 0.08 : 0.56),
  };
}

export function getSentenceMotionOutcome(
  traceEvents: readonly TraceEvent[],
): SentenceMotionOutcome {
  const result = [...traceEvents]
    .reverse()
    .find((event) => event.type === "result");
  if (!result || result.type !== "result") return "actionFail";
  return result.outcome;
}

export type SentenceImpactTargetKey =
  | "playerAfterimage"
  | "shield"
  | "slash"
  | "impact";

export function getSentenceImpactTargetKeys(
  outcome: SentenceMotionOutcome,
  action: PlayerActionSemanticId,
): readonly SentenceImpactTargetKey[] {
  if (outcome === "conditionMiss") return [];

  const actionTarget: SentenceImpactTargetKey =
    action === "player.dodge_side"
      ? "playerAfterimage"
      : action === "player.guard_front"
        ? "shield"
        : "slash";

  return outcome === "success"
    ? [actionTarget]
    : [actionTarget, "impact"];
}

interface SentenceDomTargets {
  root: HTMLElement;
  condition: HTMLElement;
  connector: HTMLElement;
  connectorPath: SVGPathElement;
  action: HTMLElement;
  period: HTMLElement;
  periodRing: HTMLElement;
  lockShade: HTMLElement;
  result: HTMLElement;
  breakMark: HTMLElement;
}

function queryRequired<T extends Element>(
  root: HTMLElement,
  motionId: string,
): T {
  const node = root.querySelector<T>(`[data-motion-id="${motionId}"]`);
  if (!node) throw new Error(`Motion target not found: ${motionId}`);
  return node;
}

export function collectSentenceDomTargets(root: HTMLElement): SentenceDomTargets {
  return {
    root,
    condition: queryRequired(root, "condition-text"),
    connector: queryRequired(root, "connector-text"),
    connectorPath: queryRequired(root, "connector-line"),
    action: queryRequired(root, "action-text"),
    period: queryRequired(root, "period-trigger"),
    periodRing: queryRequired(root, "period-ring"),
    lockShade: queryRequired(root, "battle-lock"),
    result: queryRequired(root, "motion-result"),
    breakMark: queryRequired(root, "connector-break"),
  };
}

export interface SentenceMotionDirectorOptions {
  root: HTMLElement;
  battlefield: BattlefieldMotionTargets;
  traceEvents: readonly TraceEvent[];
  action: PlayerActionSemanticId;
  reducedMotion: boolean;
  shakeEnabled: boolean;
  onLabel?: (label: SentenceMotionLabel) => void;
  onComplete?: () => void;
}

export interface SentenceMotionDirector {
  timeline: gsap.core.Timeline;
  schedule: SentenceMotionSchedule;
  play: () => void;
  pause: () => void;
  restart: () => void;
  seek: (seconds: number) => void;
  seekLabel: (label: SentenceMotionLabel) => void;
  setSpeed: (speed: number) => void;
  skip: () => void;
  kill: () => void;
}

function resetDomTargets(dom: SentenceDomTargets) {
  gsap.set(
    [dom.condition, dom.connector, dom.action, dom.period, dom.root],
    { clearProps: "transform,opacity,filter,color,visibility" },
  );
  gsap.set(dom.connectorPath, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set(dom.periodRing, { scale: 0.35, autoAlpha: 0 });
  gsap.set(dom.lockShade, { autoAlpha: 0 });
  gsap.set(dom.result, { autoAlpha: 0, y: 8 });
  gsap.set(dom.breakMark, { autoAlpha: 0, scale: 0.65 });
}

function addLabel(
  timeline: gsap.core.Timeline,
  schedule: SentenceMotionSchedule,
  label: SentenceMotionLabel,
  onLabel?: (label: SentenceMotionLabel) => void,
) {
  timeline.addLabel(label, schedule.labels[label]);
  if (onLabel) timeline.call(() => onLabel(label), [], label);
}

function addDodgeSuccessImpact(
  timeline: gsap.core.Timeline,
  battlefield: BattlefieldMotionTargets,
  impactAt: number,
  durationScale: number,
) {
  const { home } = battlefield;
  const moveDuration = 0.28 * durationScale;
  timeline
    .to(
      battlefield.playerAfterimage,
      { pixi: { alpha: 0.42 }, duration: 0.05 * durationScale },
      impactAt,
    )
    .to(
      battlefield.player,
      {
        pixi: {
          x: home.playerX - 16,
          y: home.playerY - 58,
          scale: home.playerScale * 0.96,
        },
        duration: moveDuration,
        ease: "power2.out",
      },
      impactAt,
    )
    .to(
      battlefield.playerShadow,
      {
        pixi: { scaleX: 0.72, scaleY: 0.76, alpha: 0.28 },
        duration: moveDuration,
      },
      impactAt,
    )
    .to(
      battlefield.enemy,
      {
        pixi: { x: home.playerX - 96, rotation: -5 },
        duration: 0.52 * durationScale,
        ease: "power3.in",
      },
      impactAt + 0.05 * durationScale,
    )
    .to(
      battlefield.enemyShadow,
      {
        pixi: { x: home.playerX - 96 },
        duration: 0.52 * durationScale,
        ease: "power3.in",
      },
      impactAt + 0.05 * durationScale,
    )
    .to(
      battlefield.dust,
      { pixi: { alpha: 0.72, x: home.playerX - 70 }, duration: 0.1 * durationScale },
      impactAt + 0.36 * durationScale,
    )
    .to(
      battlefield.dust,
      { pixi: { alpha: 0, scale: 1.45 }, duration: 0.3 * durationScale },
      ">",
    )
    .to(
      battlefield.playerAfterimage,
      { pixi: { alpha: 0 }, duration: 0.3 * durationScale },
      impactAt + 0.34 * durationScale,
    );
}

function addCounterSuccessImpact(
  timeline: gsap.core.Timeline,
  battlefield: BattlefieldMotionTargets,
  action: Exclude<PlayerActionSemanticId, "player.dodge_side">,
  impactAt: number,
  durationScale: number,
) {
  const { home } = battlefield;
  const isGuard = action === "player.guard_front";
  const actionEffect = isGuard ? battlefield.shield : battlefield.slash;
  const contactX = home.playerX + (isGuard ? 88 : 104);
  const counterX = home.enemyX + (isGuard ? 28 : 52);

  timeline
    .to(
      actionEffect,
      { pixi: { alpha: 0.92, scale: 1.08 }, duration: 0.12 * durationScale },
      impactAt,
    )
    .to(
      battlefield.player,
      {
        pixi: { x: home.playerX + (isGuard ? 8 : 38) },
        duration: 0.22 * durationScale,
      },
      impactAt,
    )
    .to(
      battlefield.enemy,
      {
        pixi: { x: contactX, rotation: -3 },
        duration: 0.3 * durationScale,
        ease: "power3.in",
      },
      impactAt,
    )
    .to(
      battlefield.enemyShadow,
      {
        pixi: { x: contactX },
        duration: 0.3 * durationScale,
        ease: "power3.in",
      },
      impactAt,
    )
    .to(
      battlefield.impact,
      {
        pixi: {
          alpha: 0.92,
          scale: 0.9,
          x: contactX - 18,
          y: home.playerY - 92,
        },
        duration: 0.08 * durationScale,
      },
      impactAt + 0.28 * durationScale,
    )
    .to(
      battlefield.enemy,
      {
        pixi: { x: counterX, rotation: isGuard ? 4 : 7 },
        duration: 0.34 * durationScale,
        ease: "power2.out",
      },
      impactAt + 0.34 * durationScale,
    )
    .to(
      battlefield.enemyShadow,
      {
        pixi: { x: counterX },
        duration: 0.34 * durationScale,
        ease: "power2.out",
      },
      impactAt + 0.34 * durationScale,
    )
    .to(
      [actionEffect, battlefield.impact],
      { pixi: { alpha: 0 }, duration: 0.2 * durationScale },
      impactAt + 0.54 * durationScale,
    );
}

function addDodgeFailureImpact(
  timeline: gsap.core.Timeline,
  battlefield: BattlefieldMotionTargets,
  impactAt: number,
  durationScale: number,
) {
  const { home } = battlefield;
  const contactX = home.playerX + 62;

  timeline
    .to(
      battlefield.playerAfterimage,
      {
        pixi: {
          alpha: 0.4,
          x: home.playerX - 6,
          y: home.playerY - 24,
        },
        duration: 0.4 * durationScale,
        ease: "power1.out",
      },
      impactAt,
    )
    .to(
      battlefield.player,
      {
        pixi: {
          x: home.playerX - 10,
          y: home.playerY - 30,
          scale: home.playerScale * 0.98,
        },
        duration: 0.4 * durationScale,
        ease: "power1.inOut",
      },
      impactAt,
    )
    .to(
      battlefield.playerShadow,
      {
        pixi: { x: home.playerX - 10, scaleX: 0.8, alpha: 0.3 },
        duration: 0.4 * durationScale,
      },
      impactAt,
    )
    .to(
      battlefield.enemy,
      {
        pixi: { x: contactX, rotation: -4 },
        duration: 0.38 * durationScale,
        ease: "power3.in",
      },
      impactAt + 0.08 * durationScale,
    )
    .to(
      battlefield.enemyShadow,
      {
        pixi: { x: contactX },
        duration: 0.38 * durationScale,
        ease: "power3.in",
      },
      impactAt + 0.08 * durationScale,
    )
    .to(
      battlefield.impact,
      {
        pixi: {
          alpha: 1,
          scale: 1,
          x: home.playerX + 12,
          y: home.playerY - 88,
        },
        duration: 0.07 * durationScale,
      },
      impactAt + 0.42 * durationScale,
    )
    .to(
      battlefield.player,
      {
        pixi: {
          x: home.playerX - 68,
          y: home.playerY + 4,
          rotation: -7,
        },
        duration: 0.28 * durationScale,
        ease: "power2.out",
      },
      impactAt + 0.46 * durationScale,
    )
    .to(
      battlefield.playerShadow,
      {
        pixi: { x: home.playerX - 68 },
        duration: 0.28 * durationScale,
      },
      impactAt + 0.46 * durationScale,
    )
    .to(
      [battlefield.playerAfterimage, battlefield.impact],
      { pixi: { alpha: 0 }, duration: 0.22 * durationScale },
      impactAt + 0.58 * durationScale,
    );
}

function addActionFailureImpact(
  timeline: gsap.core.Timeline,
  battlefield: BattlefieldMotionTargets,
  action: PlayerActionSemanticId,
  impactAt: number,
  durationScale: number,
) {
  const { home } = battlefield;
  const isGuard = action === "player.guard_front";
  const actionEffect = isGuard ? battlefield.shield : battlefield.slash;
  timeline
    .to(
      actionEffect,
      { pixi: { alpha: 0.9, scale: 1.04 }, duration: 0.12 * durationScale },
      impactAt,
    )
    .to(
      battlefield.enemy,
      {
        pixi: { x: home.playerX + 84, rotation: -4 },
        duration: 0.34 * durationScale,
        ease: "power3.in",
      },
      impactAt,
    )
    .to(
      battlefield.enemyShadow,
      {
        pixi: { x: home.playerX + 84 },
        duration: 0.34 * durationScale,
        ease: "power3.in",
      },
      impactAt,
    )
    .to(
      battlefield.impact,
      { pixi: { alpha: 1, scale: 1 }, duration: 0.07 * durationScale },
      impactAt + 0.32 * durationScale,
    )
    .to(
      battlefield.player,
      {
        pixi: {
          x: home.playerX - (isGuard ? 56 : 82),
          rotation: isGuard ? -4 : -10,
        },
        duration: 0.3 * durationScale,
        ease: "power2.out",
      },
      impactAt + 0.36 * durationScale,
    )
    .to(
      battlefield.playerShadow,
      {
        pixi: { x: home.playerX - (isGuard ? 56 : 82) },
        duration: 0.3 * durationScale,
      },
      impactAt + 0.36 * durationScale,
    )
    .to(
      [actionEffect, battlefield.impact],
      { pixi: { alpha: 0 }, duration: 0.22 * durationScale },
      impactAt + 0.48 * durationScale,
    );
}

export function createSentenceMotionDirector({
  root,
  battlefield,
  traceEvents,
  action,
  reducedMotion,
  shakeEnabled,
  onLabel,
  onComplete,
}: SentenceMotionDirectorOptions): SentenceMotionDirector {
  const dom = collectSentenceDomTargets(root);
  const outcome = getSentenceMotionOutcome(traceEvents);
  const schedule = getSentenceMotionSchedule(outcome, reducedMotion);
  const conditionMatched = traceEvents.some(
    (event) => event.type === "conditionMatched",
  );
  const actionStarted = traceEvents.some(
    (event) => event.type === "actionStarted",
  );
  const durationScale = reducedMotion ? 0.08 : 1;

  resetBattlefieldTargets(battlefield);
  resetDomTargets(dom);

  const timeline = gsap.timeline({
    paused: true,
    defaults: { ease: "power2.out" },
    onComplete,
  });

  SENTENCE_MOTION_LABELS.forEach((label) =>
    addLabel(timeline, schedule, label, onLabel),
  );

  timeline
    .to(
      dom.lockShade,
      { autoAlpha: 1, duration: reducedMotion ? 0.01 : 0.18 },
      "lock",
    )
    .to(
      dom.period,
      { scale: 0.78, duration: reducedMotion ? 0.01 : 0.11, yoyo: true, repeat: 1 },
      "lock",
    )
    .to(
      dom.periodRing,
      {
        autoAlpha: reducedMotion ? 0.5 : 0.9,
        scale: 1.45,
        duration: reducedMotion ? 0.04 : 0.32,
        ease: "power2.out",
      },
      "lock+=0.04",
    )
    .to(dom.periodRing, { autoAlpha: 0, duration: reducedMotion ? 0.02 : 0.16 }, ">")
    .to(
      battlefield.enemy,
      {
        pixi: {
          x: battlefield.home.enemyX + (reducedMotion ? 0 : 16),
          scaleX: battlefield.home.enemyScale * (reducedMotion ? 1 : 0.98),
        },
        duration: 0.24 * durationScale,
      },
      "omen",
    )
    .to(
      battlefield.enemyOmen,
      {
        pixi: { alpha: 0.92, scale: 1.05 },
        duration: 0.22 * durationScale,
      },
      "omen",
    );

  if (conditionMatched) {
    timeline
      .to(
        dom.condition,
        {
          color: "#fff0bd",
          filter: "drop-shadow(0 0 9px rgba(246, 90, 72, 0.9))",
          y: reducedMotion ? 0 : -3,
          duration: 0.2 * durationScale,
        },
        "condition",
      )
      .to(
        battlefield.enemyOmen,
        { pixi: { alpha: 1, scale: 1.14 }, duration: 0.16 * durationScale },
        "condition",
      )
      .to(
        dom.connectorPath,
        { strokeDashoffset: 0, duration: 0.34 * durationScale, ease: "none" },
        "connector",
      )
      .to(
        dom.connector,
        {
          color: "#ffe3a0",
          filter: "drop-shadow(0 0 8px rgba(245, 196, 94, 0.85))",
          duration: 0.22 * durationScale,
        },
        "connector+=0.1",
      );
  } else {
    timeline
      .to(
        dom.condition,
        {
          x: reducedMotion ? 0 : -4,
          autoAlpha: 0.48,
          duration: 0.12 * durationScale,
          yoyo: true,
          repeat: reducedMotion ? 0 : 2,
        },
        "condition",
      )
      .to(
        dom.connectorPath,
        { strokeDashoffset: 0.58, duration: 0.2 * durationScale },
        "connector",
      )
      .to(
        dom.breakMark,
        { autoAlpha: 1, scale: 1, duration: 0.14 * durationScale },
        "connector+=0.12",
      );
  }

  if (actionStarted) {
    timeline.to(
      dom.action,
      {
        color: "#fff1bd",
        filter: "drop-shadow(0 0 9px rgba(242, 194, 92, 0.86))",
        y: reducedMotion ? 0 : -3,
        duration: 0.22 * durationScale,
      },
      "action",
    );
  } else {
    timeline.to(
      dom.action,
      { autoAlpha: 0.36, duration: 0.16 * durationScale },
      "action",
    );
  }

  if (!reducedMotion && outcome === "success") {
    if (action === "player.dodge_side") {
      addDodgeSuccessImpact(
        timeline,
        battlefield,
        schedule.labels.impact,
        durationScale,
      );
    } else {
      addCounterSuccessImpact(
        timeline,
        battlefield,
        action,
        schedule.labels.impact,
        durationScale,
      );
    }
  } else if (!reducedMotion && outcome === "actionFail") {
    if (action === "player.dodge_side") {
      addDodgeFailureImpact(
        timeline,
        battlefield,
        schedule.labels.impact,
        durationScale,
      );
    } else {
      addActionFailureImpact(
        timeline,
        battlefield,
        action,
        schedule.labels.impact,
        durationScale,
      );
    }
  } else if (outcome === "conditionMiss") {
    timeline
      .to(
        battlefield.enemyOmen,
        { pixi: { alpha: 1, scale: 1.18 }, duration: 0.16 * durationScale },
        "impact",
      )
      .to(
        battlefield.enemyOmen,
        { pixi: { alpha: 0.24, scale: 1 }, duration: 0.18 * durationScale },
        ">",
      );
  } else {
    const impactTargets = getSentenceImpactTargetKeys(outcome, action).map(
      (target) => battlefield[target],
    );
    timeline.to(
      impactTargets,
      {
        pixi: { alpha: 0.75 },
        duration: 0.06,
        yoyo: true,
        repeat: 1,
      },
      "impact",
    );
  }

  if (!reducedMotion && shakeEnabled && outcome === "actionFail") {
    timeline
      .to(dom.root, { x: -3, duration: 0.04, ease: "none" }, "impact+=0.33")
      .to(dom.root, { x: 3, duration: 0.04, ease: "none" })
      .to(dom.root, { x: 0, duration: 0.04, ease: "none" });
  }

  timeline
    .to(
      battlefield.enemyOmen,
      {
        pixi: { alpha: 0, scale: 1 },
        duration: reducedMotion ? 0.03 : 0.18,
      },
      "result",
    )
    .to(
      dom.result,
      { autoAlpha: 1, y: 0, duration: reducedMotion ? 0.04 : 0.24 },
      "result",
    )
    .to(
      dom.lockShade,
      { autoAlpha: 0, duration: reducedMotion ? 0.03 : 0.28 },
      "rewind",
    );

  if (outcome !== "success") {
    timeline.call(
      () => {
        resetBattlefieldTargets(battlefield);
        resetDomTargets(dom);
        gsap.set(dom.connectorPath, { strokeDashoffset: 0 });
      },
      [],
      "rewind+=0.2",
    );
    timeline.to(
      [dom.result, dom.breakMark],
      { autoAlpha: 0, duration: reducedMotion ? 0.03 : 0.24 },
      "rewind+=0.2",
    );
  } else {
    timeline.to(
      battlefield.player,
      {
        pixi: {
          x: battlefield.home.playerX,
          y: battlefield.home.playerY,
          scale: battlefield.home.playerScale,
        },
        duration: reducedMotion ? 0.03 : 0.34,
      },
      "rewind",
    );
  }

  timeline.call(() => undefined, [], schedule.duration);

  const controls = createSentenceTimelineControls(timeline, () => {
    resetBattlefieldTargets(battlefield);
    resetDomTargets(dom);
  });

  return {
    timeline,
    schedule,
    play: controls.play,
    pause: controls.pause,
    restart: controls.restart,
    seek: controls.seek,
    seekLabel: (label) => {
      if (!controls.isKilled()) timeline.seek(label, false);
    },
    setSpeed: controls.setSpeed,
    skip: controls.skip,
    kill: controls.kill,
  };
}

export function playConditionPreview(
  battlefield: BattlefieldMotionTargets,
  reducedMotion: boolean,
): gsap.core.Timeline {
  const timeline = gsap.timeline();
  const duration = reducedMotion ? 0.01 : 0.16;
  timeline
    .to(battlefield.enemyOmen, { pixi: { alpha: 0.54, scale: 1.06 }, duration })
    .to(battlefield.enemyOmen, { pixi: { alpha: 0, scale: 1 }, duration });
  return timeline;
}

export function playActionPreview(
  battlefield: BattlefieldMotionTargets,
  action: PlayerActionSemanticId,
  reducedMotion: boolean,
): gsap.core.Timeline {
  resetBattlefieldTargets(battlefield);
  const timeline = gsap.timeline();
  const duration = reducedMotion ? 0.02 : 0.24;
  const { home } = battlefield;

  if (action === "player.dodge_side") {
    timeline
      .to(battlefield.playerAfterimage, { pixi: { alpha: 0.38 }, duration: duration * 0.25 })
      .to(
        battlefield.player,
        {
          pixi: {
            x: home.playerX - (reducedMotion ? 0 : 12),
            y: home.playerY - (reducedMotion ? 0 : 54),
            scale: home.playerScale * (reducedMotion ? 1 : 0.96),
          },
          duration,
        },
        0,
      )
      .to(
        battlefield.playerShadow,
        { pixi: { scaleX: 0.76, alpha: 0.3 }, duration },
        0,
      );
  } else if (action === "player.guard_front") {
    timeline
      .to(battlefield.player, { pixi: { x: home.playerX + (reducedMotion ? 0 : 8) }, duration }, 0)
      .to(battlefield.shield, { pixi: { alpha: 0.82, scale: 1.04 }, duration }, 0);
  } else {
    timeline
      .to(battlefield.player, { pixi: { x: home.playerX + (reducedMotion ? 0 : 44) }, duration }, 0)
      .to(battlefield.slash, { pixi: { alpha: 0.9, scale: 1.08 }, duration }, 0);
  }

  timeline.call(() => resetBattlefieldTargets(battlefield), [], "+=0.18");
  return timeline;
}
