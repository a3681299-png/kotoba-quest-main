import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import * as PIXI from "pixi.js";
import {
  resetBattlefieldTargets,
  type BattlefieldMotionTargets,
} from "../reading-loop/LiveBattlefield";
import type {
  WordQuestBattleMotionPhase,
  WordQuestBattlePresentation,
} from "./wordQuestBattlePresentation";

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

interface WordQuestBattleMotionOptions {
  battlefield: BattlefieldMotionTargets;
  presentation: WordQuestBattlePresentation;
  onPhase: (phase: WordQuestBattleMotionPhase) => void;
  onComplete: () => void;
}

function seconds(milliseconds: number): number {
  return milliseconds / 1000;
}

function addReducedMotionCues(
  timeline: gsap.core.Timeline,
  battlefield: BattlefieldMotionTargets,
  presentation: WordQuestBattlePresentation,
  onPhase: (phase: WordQuestBattleMotionPhase) => void,
) {
  const { home } = battlefield;

  if (presentation.enemyImpactMs !== null) {
    const impactAt = seconds(presentation.enemyImpactMs);
    timeline
      .call(() => onPhase("strike"), [], Math.max(0, impactAt - 0.02))
      .call(() => onPhase("enemy-impact"), [], impactAt)
      .set(
        battlefield.impact,
        {
          pixi: {
            alpha: 0.72,
            scale: 0.72,
            x: home.enemyX - 54,
            y: home.enemyY - 142,
          },
        },
        impactAt,
      )
      .to(
        battlefield.impact,
        { pixi: { alpha: 0, scale: 1.12 }, duration: 0.05 },
        impactAt + 0.03,
      );
  }

  if (presentation.playerImpactMs !== null) {
    const impactAt = seconds(presentation.playerImpactMs);
    timeline
      .call(() => onPhase("counter"), [], Math.max(0, impactAt - 0.02))
      .call(() => onPhase("player-impact"), [], impactAt)
      .set(
        battlefield.impact,
        {
          pixi: {
            alpha: 0.68,
            scale: 0.65,
            x: home.playerX + 34,
            y: home.playerY - 112,
          },
        },
        impactAt,
      )
      .to(
        battlefield.impact,
        { pixi: { alpha: 0, scale: 1 }, duration: 0.05 },
        impactAt + 0.03,
      );
  }
}

function addPlayerStrike(
  timeline: gsap.core.Timeline,
  battlefield: BattlefieldMotionTargets,
  presentation: WordQuestBattlePresentation,
  onPhase: (phase: WordQuestBattleMotionPhase) => void,
) {
  if (presentation.enemyImpactMs === null) return;

  const { home } = battlefield;
  const impactAt = seconds(presentation.enemyImpactMs);
  const strikeAt = impactAt - 0.18;
  const releaseAt = impactAt + 0.09;
  const returnAt = impactAt + (presentation.hasEnemyStrike ? 0.3 : 0.38);
  const returnDuration = presentation.hasEnemyStrike ? 0.16 : 0.26;

  timeline
    .to(
      battlefield.player,
      {
        pixi: {
          x: home.playerX - 24,
          y: home.playerY + 8,
          scaleX: home.playerScale * 0.92,
          scaleY: home.playerScale * 1.06,
        },
        duration: 0.13,
        ease: "power2.in",
      },
      0,
    )
    .to(
      battlefield.playerShadow,
      {
        pixi: { x: home.playerX - 22, scaleX: 1.16, scaleY: 0.82 },
        duration: 0.13,
        ease: "power2.in",
      },
      0,
    )
    .call(() => onPhase("strike"), [], strikeAt)
    .to(
      battlefield.playerAfterimage,
      {
        pixi: {
          alpha: 0.34,
          x: home.playerX + 48,
          y: home.playerY - 6,
          scaleX: home.playerScale * 1.06,
          scaleY: home.playerScale * 0.96,
        },
        duration: 0.12,
        ease: "power3.in",
      },
      strikeAt,
    )
    .to(
      battlefield.player,
      {
        pixi: {
          alpha: 0.06,
          x: home.playerX + 108,
          y: home.playerY - 14,
          scaleX: home.playerScale * 1.1,
          scaleY: home.playerScale * 0.94,
        },
        duration: 0.17,
        ease: "power4.in",
      },
      strikeAt,
    )
    .to(
      battlefield.playerShadow,
      {
        pixi: { alpha: 0.14, x: home.playerX + 94, scaleX: 1.42 },
        duration: 0.17,
        ease: "power4.in",
      },
      strikeAt,
    )
    .call(() => onPhase("enemy-impact"), [], impactAt)
    .set(
      battlefield.slash,
      {
        pixi: {
          alpha: 0.96,
          x: home.enemyX - 104,
          y: home.enemyY - 156,
          scale: 1.82,
          rotation: 10,
        },
      },
      impactAt,
    )
    .set(
      battlefield.impact,
      {
        pixi: {
          alpha: 1,
          x: home.enemyX - 58,
          y: home.enemyY - 148,
          scale: 0.68,
        },
      },
      impactAt,
    )
    .to(
      battlefield.enemy,
      {
        pixi: {
          x: home.enemyX + 8,
          scaleX: home.enemyScale * 0.94,
          scaleY: home.enemyScale * 1.04,
          rotation: -2,
        },
        duration: 0.035,
        ease: "power4.out",
      },
      impactAt,
    )
    .to(
      battlefield.playerAfterimage,
      { pixi: { alpha: 0 }, duration: 0.11 },
      impactAt + 0.02,
    )
    .to(
      battlefield.enemy,
      {
        pixi: {
          x: home.enemyX + 118,
          scaleX: home.enemyScale * 0.92,
          scaleY: home.enemyScale * 1.05,
          rotation: 7,
        },
        duration: 0.14,
        ease: "power3.out",
      },
      releaseAt,
    )
    .to(
      battlefield.enemyShadow,
      {
        pixi: { x: home.enemyX + 92, scaleX: 1.18, alpha: 0.34 },
        duration: 0.16,
        ease: "power3.out",
      },
      releaseAt,
    )
    .to(
      battlefield.world,
      { pixi: { x: -12, y: 3 }, duration: 0.035, ease: "none" },
      releaseAt,
    )
    .to(
      battlefield.world,
      { pixi: { x: 8, y: -2 }, duration: 0.04, ease: "none" },
      ">",
    )
    .to(
      battlefield.world,
      { pixi: { x: -4, y: 1 }, duration: 0.045, ease: "none" },
      ">",
    )
    .to(
      battlefield.world,
      { pixi: { x: 0, y: 0 }, duration: 0.055, ease: "none" },
      ">",
    )
    .set(
      battlefield.dust,
      {
        pixi: {
          alpha: 0.72,
          x: home.enemyX + 44,
          y: home.enemyY - 10,
          scale: 0.84,
        },
      },
      releaseAt,
    )
    .to(
      battlefield.dust,
      { pixi: { alpha: 0, scale: 1.7 }, duration: 0.32 },
      releaseAt,
    )
    .to(
      battlefield.impact,
      { pixi: { alpha: 0, scale: 2.1 }, duration: 0.28 },
      releaseAt,
    )
    .to(
      battlefield.slash,
      { pixi: { alpha: 0, scale: 2.3 }, duration: 0.22 },
      releaseAt + 0.04,
    )
    .to(
      battlefield.enemy,
      {
        pixi: {
          x: home.enemyX,
          y: home.enemyY,
          scale: home.enemyScale,
          rotation: 0,
        },
        duration: returnDuration,
        ease: "power2.out",
      },
      returnAt,
    )
    .to(
      battlefield.enemyShadow,
      {
        pixi: { x: home.enemyX, scale: 1, alpha: 0.52 },
        duration: returnDuration,
        ease: "power2.out",
      },
      returnAt,
    )
    .to(
      battlefield.player,
      {
        pixi: {
          alpha: 1,
          x: home.playerX,
          y: home.playerY,
          scale: home.playerScale,
        },
        duration: returnDuration,
        ease: "power2.out",
      },
      returnAt,
    )
    .to(
      battlefield.playerShadow,
      {
        pixi: { alpha: 0.48, x: home.playerX, scale: 1 },
        duration: returnDuration,
      },
      returnAt,
    );
}

function addEnemyStrike(
  timeline: gsap.core.Timeline,
  battlefield: BattlefieldMotionTargets,
  presentation: WordQuestBattlePresentation,
  onPhase: (phase: WordQuestBattleMotionPhase) => void,
) {
  if (presentation.playerImpactMs === null) return;

  const { home } = battlefield;
  const impactAt = seconds(presentation.playerImpactMs);
  const counterAt = impactAt - 0.26;
  const travelAt = impactAt - 0.14;
  const releaseAt = impactAt + 0.07;

  timeline
    .call(() => onPhase("counter"), [], counterAt)
    .to(
      battlefield.enemy,
      {
        pixi: {
          x: home.enemyX + 28,
          y: home.enemyY + 5,
          scaleX: home.enemyScale * 0.96,
          scaleY: home.enemyScale * 1.04,
          rotation: 2,
        },
        duration: 0.12,
        ease: "power2.in",
      },
      counterAt,
    )
    .to(
      battlefield.enemyShadow,
      { pixi: { x: home.enemyX + 24, scaleX: 1.14 }, duration: 0.12 },
      counterAt,
    )
    .to(
      battlefield.enemy,
      {
        pixi: {
          x: home.playerX + 118,
          y: home.enemyY - 6,
          scaleX: home.enemyScale * 1.05,
          scaleY: home.enemyScale * 0.96,
          rotation: -5,
        },
        duration: 0.14,
        ease: "power4.in",
      },
      travelAt,
    )
    .to(
      battlefield.enemyShadow,
      {
        pixi: { x: home.playerX + 112, scaleX: 1.36, alpha: 0.36 },
        duration: 0.14,
        ease: "power4.in",
      },
      travelAt,
    )
    .call(() => onPhase("player-impact"), [], impactAt)
    .set(
      battlefield.impact,
      {
        pixi: {
          alpha: 1,
          x: home.playerX + 42,
          y: home.playerY - 112,
          scale: 0.72,
        },
      },
      impactAt,
    )
    .to(
      battlefield.player,
      {
        pixi: {
          x: home.playerX - 72,
          y: home.playerY + 4,
          rotation: -7,
          scaleX: home.playerScale * 0.95,
          scaleY: home.playerScale * 1.03,
        },
        duration: 0.17,
        ease: "power3.out",
      },
      releaseAt,
    )
    .to(
      battlefield.playerShadow,
      {
        pixi: { x: home.playerX - 58, scaleX: 1.2, alpha: 0.32 },
        duration: 0.17,
      },
      releaseAt,
    )
    .to(
      battlefield.world,
      { pixi: { x: 8, y: -2 }, duration: 0.035, ease: "none" },
      releaseAt,
    )
    .to(
      battlefield.world,
      { pixi: { x: -5, y: 2 }, duration: 0.045, ease: "none" },
      ">",
    )
    .to(
      battlefield.world,
      { pixi: { x: 0, y: 0 }, duration: 0.055, ease: "none" },
      ">",
    )
    .to(
      battlefield.impact,
      { pixi: { alpha: 0, scale: 1.7 }, duration: 0.22 },
      releaseAt,
    )
    .to(
      battlefield.enemy,
      {
        pixi: {
          x: home.enemyX,
          y: home.enemyY,
          scale: home.enemyScale,
          rotation: 0,
        },
        duration: 0.28,
        ease: "power3.out",
      },
      releaseAt + 0.04,
    )
    .to(
      battlefield.enemyShadow,
      {
        pixi: { x: home.enemyX, scale: 1, alpha: 0.52 },
        duration: 0.28,
      },
      releaseAt + 0.04,
    )
    .to(
      battlefield.player,
      {
        pixi: {
          x: home.playerX,
          y: home.playerY,
          scale: home.playerScale,
          rotation: 0,
        },
        duration: 0.25,
        ease: "power2.out",
      },
      seconds(presentation.settleMs),
    )
    .to(
      battlefield.playerShadow,
      {
        pixi: { x: home.playerX, scale: 1, alpha: 0.48 },
        duration: 0.25,
      },
      seconds(presentation.settleMs),
    );
}

export function createWordQuestBattleTimeline({
  battlefield,
  presentation,
  onPhase,
  onComplete,
}: WordQuestBattleMotionOptions): gsap.core.Timeline {
  resetBattlefieldTargets(battlefield);

  const timeline = gsap.timeline({
    paused: true,
    defaults: { overwrite: "auto" },
    onComplete: () => {
      resetBattlefieldTargets(battlefield);
      onComplete();
    },
  });

  timeline.call(() => onPhase("windup"), [], 0);

  if (presentation.reducedMotion) {
    addReducedMotionCues(timeline, battlefield, presentation, onPhase);
  } else {
    if (presentation.hasPlayerStrike) {
      addPlayerStrike(timeline, battlefield, presentation, onPhase);
    }
    if (presentation.hasEnemyStrike) {
      addEnemyStrike(timeline, battlefield, presentation, onPhase);
    }
  }

  timeline.call(() => onPhase("settle"), [], seconds(presentation.settleMs));
  timeline.call(() => undefined, [], seconds(presentation.totalMs));
  return timeline;
}
