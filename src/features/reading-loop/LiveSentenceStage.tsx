import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type {
  BattleSimulationResult,
  PlayerActionSemanticId,
} from "../../readingLoop";
import type {
  ExtractedFragmentView,
  StrategyChoiceView,
} from "./types";
import {
  LiveBattlefield,
  type BattlefieldMotionTargets,
  type LiveBattlefieldHandle,
} from "./LiveBattlefield";
import { getLiveSentenceOutcomeCopy } from "./liveSentenceCopy";
import {
  getMotionStatusText,
  isPeriodEnabled,
} from "./liveSentenceState";
import {
  createSentenceMotionDirector,
  getSentenceMotionOutcome,
  playActionPreview,
  playConditionPreview,
  type SentenceMotionDirector,
  type SentenceMotionLabel,
  type SentenceMotionOutcome,
} from "./sentenceMotion";

gsap.registerPlugin(useGSAP);

export interface LiveSentenceRun {
  runId: string;
  result: BattleSimulationResult;
}

export interface LiveSentenceStageHandle {
  commit: () => boolean;
  play: () => void;
  pause: () => void;
  restart: () => void;
  seek: (seconds: number) => void;
  seekLabel: (label: SentenceMotionLabel) => void;
  setSpeed: (speed: number) => void;
  skip: () => void;
  reset: () => void;
  getTime: () => number;
  getDuration: () => number;
}

interface LiveSentenceStageProps {
  conditionLabel: string;
  choices: readonly StrategyChoiceView[];
  selectedAction: PlayerActionSemanticId | null;
  evidenceFragments: readonly ExtractedFragmentView[];
  executionStatus: "incomplete" | "complete" | "running";
  lastResult?: BattleSimulationResult | null;
  reviewMode?: boolean;
  debugStatic?: boolean;
  outcomeOverrideLabel?: string;
  onSelectAction: (action: PlayerActionSemanticId) => void;
  onBeginExecution: () => LiveSentenceRun | null;
  onExecutionComplete: (run: LiveSentenceRun) => void;
  onExecutionCancel: (runId: string) => void;
  onReturnToStrategy?: () => void;
  onDirectorReady?: (director: SentenceMotionDirector | null) => void;
}

function useReducedMotionPreference() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return reduced;
}

export const LiveSentenceStage = forwardRef<
  LiveSentenceStageHandle,
  LiveSentenceStageProps
>(function LiveSentenceStage(
  {
    conditionLabel,
    choices,
    selectedAction,
    evidenceFragments,
    executionStatus,
    lastResult = null,
    reviewMode = false,
    debugStatic = false,
    outcomeOverrideLabel,
    onSelectAction,
    onBeginExecution,
    onExecutionComplete,
    onExecutionCancel,
    onReturnToStrategy,
    onDirectorReady,
  },
  forwardedRef,
) {
  const rootRef = useRef<HTMLElement>(null);
  const battlefieldRef = useRef<LiveBattlefieldHandle>(null);
  const battlefieldTargetsRef = useRef<BattlefieldMotionTargets | null>(null);
  const directorRef = useRef<SentenceMotionDirector | null>(null);
  const previewRef = useRef<gsap.core.Timeline | null>(null);
  const conditionPreviewRef = useRef<gsap.core.Timeline | null>(null);
  const pendingRunRef = useRef<LiveSentenceRun | null>(null);
  const executionCancelCallbackRef = useRef(onExecutionCancel);
  const directorReadyCallbackRef = useRef(onDirectorReady);
  const [sceneReady, setSceneReady] = useState(false);
  const [activeLabel, setActiveLabel] = useState<SentenceMotionLabel | "editing">(
    "editing",
  );
  const [activeOutcome, setActiveOutcome] = useState<SentenceMotionOutcome | null>(
    null,
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [shakeEnabled, setShakeEnabled] = useState(true);
  const reducedMotion = useReducedMotionPreference();
  const selectedChoice =
    choices.find((choice) => choice.id === selectedAction) ?? null;
  const sentenceComplete = executionStatus !== "incomplete" && selectedAction !== null;
  const controlsLocked = isExecuting || executionStatus === "running" || reviewMode;
  const periodEnabled = isPeriodEnabled({
    sentenceComplete,
    sceneReady,
    controlsLocked,
  });
  const reviewOutcome = lastResult
    ? getSentenceMotionOutcome(lastResult.traceEvents)
    : null;
  const displayedOutcome = reviewMode ? reviewOutcome : activeOutcome;
  const resultCopy = getLiveSentenceOutcomeCopy(
    displayedOutcome,
    selectedAction,
  );

  useEffect(() => {
    const result = rootRef.current?.querySelector<HTMLElement>(
      '[data-motion-id="motion-result"]',
    );
    if (!result) return;

    gsap.set(result, {
      autoAlpha: reviewMode && reviewOutcome ? 1 : 0,
      y: reviewMode && reviewOutcome ? 0 : 8,
    });

    return () => {
      gsap.set(result, { autoAlpha: 0, y: 8 });
    };
  }, [reviewMode, reviewOutcome]);

  useEffect(() => {
    executionCancelCallbackRef.current = onExecutionCancel;
  }, [onExecutionCancel]);

  useEffect(() => {
    directorReadyCallbackRef.current = onDirectorReady;
  }, [onDirectorReady]);

  const handleBattlefieldReady = useCallback(
    (targets: BattlefieldMotionTargets | null) => {
      battlefieldTargetsRef.current = targets;
      setSceneReady(Boolean(targets));
    },
    [],
  );

  const clearDirector = useCallback(
    (cancelPending: boolean) => {
      previewRef.current?.kill();
      previewRef.current = null;
      conditionPreviewRef.current?.kill();
      conditionPreviewRef.current = null;
      directorRef.current?.kill();
      directorRef.current = null;
      directorReadyCallbackRef.current?.(null);

      const pending = pendingRunRef.current;
      pendingRunRef.current = null;
      if (cancelPending && pending) {
        executionCancelCallbackRef.current(pending.runId);
      }

      battlefieldRef.current?.reset();
      setIsExecuting(false);
      setIsPaused(false);
      setActiveLabel("editing");
      setActiveOutcome(null);
    },
    [],
  );

  const commit = useCallback(() => {
    const root = rootRef.current;
    const battlefield = battlefieldTargetsRef.current;
    if (
      !root ||
      !battlefield ||
      !selectedAction ||
      !sentenceComplete ||
      controlsLocked ||
      pendingRunRef.current
    ) {
      return false;
    }

    const run = onBeginExecution();
    if (!run) return false;

    previewRef.current?.kill();
    conditionPreviewRef.current?.kill();
    directorRef.current?.kill();
    pendingRunRef.current = run;
    setIsExecuting(true);
    setIsPaused(false);
    setActiveOutcome(null);

    const director = createSentenceMotionDirector({
      root,
      battlefield,
      traceEvents: run.result.traceEvents,
      action: selectedAction,
      reducedMotion,
      shakeEnabled: shakeEnabled && !reducedMotion,
      onLabel: (label) => {
        setActiveLabel(label);
        if (label === "result") {
          setActiveOutcome(getSentenceMotionOutcome(run.result.traceEvents));
        }
      },
      onComplete: () => {
        pendingRunRef.current = null;
        setIsExecuting(false);
        setIsPaused(false);
        onExecutionComplete(run);
      },
    });
    directorRef.current = director;
    onDirectorReady?.(director);
    director.play();
    return true;
  }, [
    controlsLocked,
    onBeginExecution,
    onDirectorReady,
    onExecutionComplete,
    reducedMotion,
    selectedAction,
    sentenceComplete,
    shakeEnabled,
  ]);

  useImperativeHandle(
    forwardedRef,
    () => ({
      commit,
      play: () => {
        directorRef.current?.play();
        setIsPaused(false);
      },
      pause: () => {
        directorRef.current?.pause();
        setIsPaused(true);
      },
      restart: () => {
        directorRef.current?.restart();
        setIsExecuting(true);
        setIsPaused(false);
      },
      seek: (seconds) => directorRef.current?.seek(seconds),
      seekLabel: (label) => directorRef.current?.seekLabel(label),
      setSpeed: (speed) => directorRef.current?.setSpeed(speed),
      skip: () => directorRef.current?.skip(),
      reset: () => clearDirector(true),
      getTime: () => directorRef.current?.timeline.time() ?? 0,
      getDuration: () => directorRef.current?.timeline.duration() ?? 0,
    }),
    [clearDirector, commit],
  );

  useGSAP(
    () => {
      if (!selectedAction || controlsLocked) return;
      const action = rootRef.current?.querySelector<HTMLElement>(
        '[data-motion-id="action-text"]',
      );
      const connector = rootRef.current?.querySelector<SVGPathElement>(
        '[data-motion-id="connector-line"]',
      );
      const sentence = rootRef.current?.querySelector<HTMLElement>(
        ".reading-live-sentence",
      );
      if (!action || !connector || !sentence) return;

      gsap.fromTo(
        action,
        { x: 24, autoAlpha: 0.52 },
        { x: 0, autoAlpha: 1, duration: 0.24, ease: "power2.out" },
      );
      gsap.fromTo(
        connector,
        { strokeDasharray: 1, strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 0.26, ease: "power1.out" },
      );
      gsap.fromTo(
        sentence,
        { scale: 0.992 },
        { scale: 1.012, duration: 0.12, yoyo: true, repeat: 1 },
      );
    },
    {
      scope: rootRef,
      dependencies: [selectedAction],
      revertOnUpdate: true,
    },
  );

  useEffect(() => {
    const battlefield = battlefieldTargetsRef.current;
    if (!battlefield || !selectedAction || controlsLocked) return;
    previewRef.current?.kill();
    previewRef.current = playActionPreview(
      battlefield,
      selectedAction,
      reducedMotion,
    );
    return () => {
      previewRef.current?.kill();
      previewRef.current = null;
    };
  }, [controlsLocked, reducedMotion, sceneReady, selectedAction]);

  useEffect(
    () => () => {
      previewRef.current?.kill();
      conditionPreviewRef.current?.kill();
      directorRef.current?.kill();
      const pending = pendingRunRef.current;
      if (pending) executionCancelCallbackRef.current(pending.runId);
      directorReadyCallbackRef.current?.(null);
    },
    [],
  );

  const previewCondition = () => {
    if (controlsLocked) return;
    const battlefield = battlefieldTargetsRef.current;
    if (!battlefield) return;
    conditionPreviewRef.current?.kill();
    conditionPreviewRef.current = playConditionPreview(
      battlefield,
      reducedMotion,
    );
  };

  const stopConditionPreview = () => {
    conditionPreviewRef.current?.kill();
    conditionPreviewRef.current = null;
    const battlefield = battlefieldTargetsRef.current;
    if (battlefield) {
      battlefield.enemyOmen.alpha = 0;
      battlefield.enemyOmen.scale.set(1);
    }
  };

  const togglePause = () => {
    if (isPaused) {
      directorRef.current?.play();
      setIsPaused(false);
    } else {
      directorRef.current?.pause();
      setIsPaused(true);
    }
  };

  return (
    <section
      ref={rootRef}
      className={`reading-stage reading-live-stage ${reviewMode ? "is-review" : ""} ${isExecuting ? "is-executing" : ""}`}
      data-motion-phase={activeLabel}
      aria-labelledby="reading-live-title"
    >
      <header className="reading-stage__header reading-live-stage__header">
        <div>
          <p className="reading-stage__eyebrow">
            {reviewMode ? "直前の検証" : "第三章・作戦と検証"}
          </p>
          <h1 id="reading-live-title" tabIndex={-1}>
            {reviewMode ? "戦場に残った因果を読む" : "言葉を結び、句点で動かす"}
          </h1>
          <p>
            {reviewMode
              ? "どこまで作戦が働いたかを、文章と戦場で見返す。"
              : "行動を選ぶ。句点を置くまでは、勝敗はまだ決まらない。"}
          </p>
        </div>
        <div className="reading-live-stage__tools">
          {outcomeOverrideLabel && <span>{outcomeOverrideLabel}</span>}
          <button
            type="button"
            aria-pressed={!shakeEnabled}
            onClick={() => setShakeEnabled((current) => !current)}
            disabled={isExecuting}
          >
            揺れ {shakeEnabled && !reducedMotion ? "あり" : "なし"}
          </button>
        </div>
      </header>

      <div className="reading-live-stage__arena">
        <LiveBattlefield
          ref={battlefieldRef}
          label="裂鎧の獣と主人公が左右に対峙する戦場"
          debugStatic={debugStatic}
          onReady={handleBattlefieldReady}
        />

        <div className="reading-live-stage__lock" data-motion-id="battle-lock" aria-hidden="true" />
        <div className="reading-live-stage__motion-status" role="status" aria-live="polite">
          {getMotionStatusText({
            isExecuting,
            activeLabel,
            hasDisplayedOutcome: Boolean(displayedOutcome),
            resultTitle: resultCopy.title,
            resultDetail: resultCopy.detail,
            reviewMode,
          })}
        </div>

        <div className="reading-live-sentence-wrap">
          <div
            className={`reading-live-sentence ${sentenceComplete ? "is-complete" : "is-incomplete"}`}
            aria-label="現在の作戦文"
          >
            <button
              type="button"
              className="reading-live-sentence__condition"
              data-motion-id="condition-text"
              onPointerEnter={previewCondition}
              onPointerLeave={stopConditionPreview}
              onFocus={previewCondition}
              onBlur={stopConditionPreview}
              disabled={controlsLocked}
              aria-label={`${conditionLabel}。敵の対応部位を確認`}
            >
              <span aria-hidden="true">［</span>
              {conditionLabel}
              <span aria-hidden="true">］</span>
            </button>

            <span className="reading-live-sentence__connector-wrap">
              <svg viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true">
                <path
                  data-motion-id="connector-line"
                  pathLength="1"
                  d="M4 15 C34 15 38 15 58 15 S88 15 116 15"
                />
              </svg>
              <span data-motion-id="connector-text">なら</span>
              <i data-motion-id="connector-break" aria-hidden="true">×</i>
            </span>

            <span
              className={`reading-live-sentence__action ${selectedChoice ? "is-filled" : "is-empty"}`}
              data-motion-id="action-text"
            >
              <span aria-hidden="true">［</span>
              {selectedChoice?.label ?? "行動を選ぶ"}
              <span aria-hidden="true">］</span>
            </span>

            <button
              type="button"
              className="reading-live-sentence__period"
              data-motion-id="period-trigger"
              aria-label="句点を置いて作戦文を実行"
              disabled={!periodEnabled}
              onClick={commit}
            >
              。
              <span data-motion-id="period-ring" aria-hidden="true" />
            </button>
          </div>
          <p className="reading-live-sentence__hint">
            {sentenceComplete
              ? "句点を押すと、文章を戦場で一度だけ実行する。"
              : "行動を選ぶと、文末の句点が使える。"}
          </p>
        </div>

        <div
          className={`reading-live-result ${displayedOutcome ? "has-result" : ""}`}
          data-motion-id="motion-result"
          data-outcome={displayedOutcome ?? "pending"}
        >
          <span>{resultCopy.eyebrow}</span>
          <strong>{resultCopy.title}</strong>
          <small>{resultCopy.detail}</small>
        </div>

        {isExecuting && (
          <div className="reading-live-stage__playback" aria-label="検証演出の操作">
            <button type="button" onClick={togglePause}>
              {isPaused ? "再開" : "一時停止"}
            </button>
            <button type="button" onClick={() => directorRef.current?.skip()}>
              演出を省略
            </button>
          </div>
        )}
      </div>

      <div className="reading-live-stage__action-tray">
        <fieldset disabled={controlsLocked}>
          <legend>文へ置く行動</legend>
          {choices.map((choice) => (
            <label
              key={choice.id}
              className={selectedAction === choice.id ? "is-selected" : ""}
            >
              <input
                type="radio"
                name="reading-live-action"
                value={choice.id}
                checked={selectedAction === choice.id}
                onChange={() => onSelectAction(choice.id)}
              />
              <span aria-hidden="true">
                {choice.id === "player.dodge_side"
                  ? "↗"
                  : choice.id === "player.guard_front"
                    ? "盾"
                    : "剣"}
              </span>
              <strong>{choice.label}</strong>
              <small>{choice.description}</small>
            </label>
          ))}
        </fieldset>

        <details className="reading-live-stage__evidence">
          <summary>根拠の原文</summary>
          <ul>
            {evidenceFragments.map((fragment) => (
              <li key={fragment.id}>
                <span>{fragment.roleLabel}</span>
                <q>{fragment.text}</q>
              </li>
            ))}
          </ul>
        </details>

        {reviewMode && onReturnToStrategy && (
          <button
            type="button"
            className="reading-live-stage__return"
            onClick={onReturnToStrategy}
          >
            作戦へ戻る
          </button>
        )}
      </div>
    </section>
  );
});
