import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type BattleSimulationResult,
  type PlayerActionSemanticId,
} from "../../readingLoop";
import {
  ANIMATION_LAB_ENCOUNTER,
  getAnimationLabConditionLabel,
  simulateAnimationLabScenario,
} from "./animationLabScenario";
import {
  LiveSentenceStage,
  type LiveSentenceRun,
  type LiveSentenceStageHandle,
} from "./LiveSentenceStage";
import {
  SENTENCE_MOTION_LABELS,
  type SentenceMotionDirector,
  type SentenceMotionLabel,
  type SentenceMotionOutcome,
} from "./sentenceMotion";
import {
  getExtractedFragmentViews,
  getStrategyChoices,
} from "./viewModel";
import "./live-sentence-motion.css";
import "./animation-lab.css";

declare global {
  interface Window {
    __KQ_MOTION__?: {
      play: () => void;
      pause: () => void;
      restart: () => void;
      seek: (seconds: number) => void;
      seekLabel: (label: SentenceMotionLabel) => void;
      setOutcome: (outcome: SentenceMotionOutcome) => void;
      setSpeed: (speed: number) => void;
      reset: () => void;
    };
  }
}

function actionForOutcome(
  outcome: SentenceMotionOutcome,
): PlayerActionSemanticId {
  return outcome === "actionFail"
    ? "player.guard_front"
    : "player.dodge_side";
}

function outcomeLabel(outcome: SentenceMotionOutcome) {
  switch (outcome) {
    case "success":
      return "成功";
    case "conditionMiss":
      return "条件ミス";
    case "actionFail":
      return "行動ミス";
  }
}

export function AnimationLabPage() {
  const encounter = ANIMATION_LAB_ENCOUNTER;
  const stageRef = useRef<LiveSentenceStageHandle>(null);
  const seekRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLOutputElement>(null);
  const runCounterRef = useRef(0);
  const [outcome, setOutcome] = useState<SentenceMotionOutcome>("success");
  const [selectedAction, setSelectedAction] =
    useState<PlayerActionSemanticId | null>(null);
  const [lastResult, setLastResult] =
    useState<BattleSimulationResult | null>(null);
  const [hasDirector, setHasDirector] = useState(false);
  const choices = useMemo(() => getStrategyChoices(encounter), [encounter]);
  const evidenceFragments = useMemo(
    () =>
      getExtractedFragmentViews(encounter, [
        "record-red-seams",
        "record-front-lunge",
        "scout-side-dodge",
      ]),
    [encounter],
  );
  const conditionLabel = getAnimationLabConditionLabel(outcome);

  const selectOutcome = useCallback((nextOutcome: SentenceMotionOutcome) => {
    stageRef.current?.reset();
    setOutcome(nextOutcome);
    setSelectedAction(actionForOutcome(nextOutcome));
    setLastResult(null);
    setHasDirector(false);
  }, []);

  const handleSelectAction = (action: PlayerActionSemanticId) => {
    stageRef.current?.reset();
    setSelectedAction(action);
    setLastResult(null);
    if (outcome !== "conditionMiss") {
      setOutcome(action === "player.dodge_side" ? "success" : "actionFail");
    }
  };

  const beginExecution = useCallback((): LiveSentenceRun | null => {
    if (!selectedAction) return null;
    runCounterRef.current += 1;
    const result = simulateAnimationLabScenario(outcome, selectedAction);
    return {
      runId: `animation-lab-${runCounterRef.current}`,
      result,
    };
  }, [outcome, selectedAction]);

  const handleComplete = useCallback((run: LiveSentenceRun) => {
    setLastResult(run.result);
  }, []);

  const handleDirectorReady = useCallback(
    (director: SentenceMotionDirector | null) => {
      setHasDirector(Boolean(director));
      if (seekRef.current) {
        seekRef.current.max = String(director?.timeline.duration() ?? 1);
        seekRef.current.value = "0";
      }
    },
    [],
  );

  const reset = useCallback(() => {
    stageRef.current?.reset();
    setSelectedAction(null);
    setLastResult(null);
    setHasDirector(false);
    if (seekRef.current) seekRef.current.value = "0";
    if (timeRef.current) timeRef.current.value = "0.00 / 0.00";
  }, []);

  const playFromStart = useCallback(() => {
    if (hasDirector) stageRef.current?.restart();
    else stageRef.current?.commit();
  }, [hasDirector]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const time = stageRef.current?.getTime() ?? 0;
      const duration = stageRef.current?.getDuration() ?? 0;
      if (seekRef.current) {
        seekRef.current.max = String(Math.max(duration, 0.01));
        seekRef.current.value = String(time);
      }
      if (timeRef.current) {
        timeRef.current.value = `${time.toFixed(2)} / ${duration.toFixed(2)}`;
      }
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    window.__KQ_MOTION__ = {
      play: () => stageRef.current?.play(),
      pause: () => stageRef.current?.pause(),
      restart: playFromStart,
      seek: (seconds) => stageRef.current?.seek(seconds),
      seekLabel: (label) => stageRef.current?.seekLabel(label),
      setOutcome: selectOutcome,
      setSpeed: (speed) => stageRef.current?.setSpeed(speed),
      reset,
    };
    return () => {
      delete window.__KQ_MOTION__;
    };
  }, [playFromStart, reset, selectOutcome]);

  return (
    <main className="reading-animation-lab" data-motion-id="animation-lab">
      <header className="reading-animation-lab__toolbar">
        <div>
          <span>DEV / 1280×720基準</span>
          <h1>ことばクエスト Animation Lab</h1>
        </div>

        <div className="reading-animation-lab__controls" aria-label="タイムライン操作">
          <button type="button" onClick={playFromStart}>最初から再生</button>
          <button type="button" onClick={() => stageRef.current?.pause()}>一時停止</button>
          <button type="button" onClick={() => stageRef.current?.play()}>再開</button>
          {[0.25, 0.5, 1].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => stageRef.current?.setSpeed(speed)}
            >
              {speed}倍
            </button>
          ))}
          <button type="button" onClick={reset}>リセット</button>
        </div>

        <div className="reading-animation-lab__outcomes" aria-label="検証結果">
          {(["success", "conditionMiss", "actionFail"] as const).map(
            (item) => (
              <button
                key={item}
                type="button"
                className={outcome === item ? "is-selected" : ""}
                aria-pressed={outcome === item}
                onClick={() => selectOutcome(item)}
              >
                {outcomeLabel(item)}
              </button>
            ),
          )}
        </div>

        <div className="reading-animation-lab__seek">
          <label>
            <span>シーク</span>
            <input
              ref={seekRef}
              type="range"
              min="0"
              max="1"
              step="0.01"
              defaultValue="0"
              onInput={(event) =>
                stageRef.current?.seek(Number(event.currentTarget.value))
              }
            />
          </label>
          <output ref={timeRef}>0.00 / 0.00</output>
        </div>

        <nav className="reading-animation-lab__labels" aria-label="GSAPラベル">
          {SENTENCE_MOTION_LABELS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => stageRef.current?.seekLabel(label)}
              disabled={!hasDirector}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="reading-animation-lab__viewport">
        <LiveSentenceStage
          ref={stageRef}
          conditionLabel={conditionLabel}
          choices={choices}
          selectedAction={selectedAction}
          evidenceFragments={evidenceFragments}
          executionStatus={selectedAction ? "complete" : "incomplete"}
          lastResult={lastResult}
          debugStatic
          outcomeOverrideLabel={outcomeLabel(outcome)}
          onSelectAction={handleSelectAction}
          onBeginExecution={beginExecution}
          onExecutionComplete={handleComplete}
          onExecutionCancel={() => undefined}
          onDirectorReady={handleDirectorReady}
        />
      </div>
    </main>
  );
}
