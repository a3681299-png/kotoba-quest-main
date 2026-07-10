import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RED_ARMOR_ENCOUNTER,
  buildStrategySentence,
  createReadingLoopSession,
  getEncounterFragment,
  getSemanticLabel,
  parseStrategySentence,
  simulateBattle,
  transitionReadingLoopSession,
} from "../../readingLoop";
import type {
  PlayerActionSemanticId,
  ReadingLoopAction,
} from "../../readingLoop";
import { ChapterNav } from "./ChapterNav";
import { EvidenceReader } from "./EvidenceReader";
import {
  LiveSentenceStage,
  type LiveSentenceRun,
} from "./LiveSentenceStage";
import { ObservationStage } from "./ObservationStage";
import type { EvidenceSegment, ReadingChapter } from "./types";
import {
  OBSERVATION_EVENTS,
  OBSERVATION_MOMENTS,
  buildEvidencePassages,
  buildHypothesisFromSelection,
  formatHypothesis,
  fragmentFeedback,
  getExtractedFragmentViews,
  getSelectedAction,
  getStrategyChoices,
} from "./viewModel";
import "./reading-loop.css";
import "./live-sentence-motion.css";

interface ReadingLoopScreenProps {
  onExit?: () => void;
}

const AVAILABLE_CHAPTERS: Readonly<Record<ReadingChapter, readonly ReadingChapter[]>> = {
  observation: ["observation"],
  reading: ["observation", "reading"],
  strategy: ["observation", "reading", "strategy"],
  validation: ["observation", "reading", "strategy", "validation"],
};

export function ReadingLoopScreen({ onExit }: ReadingLoopScreenProps) {
  const encounter = RED_ARMOR_ENCOUNTER;
  const [session, setSession] = useState(() => createReadingLoopSession(encounter.id));
  const [evidenceFeedback, setEvidenceFeedback] = useState(
    "節へフォーカスすると、選べる範囲がわずかに光る。",
  );
  const [reviewChapter, setReviewChapter] = useState<ReadingChapter | null>(
    null,
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const runSequenceRef = useRef(0);

  const passages = useMemo(() => buildEvidencePassages(encounter), [encounter]);
  const extractedFragments = useMemo(
    () => getExtractedFragmentViews(encounter, session.extractedFragmentIds),
    [encounter, session.extractedFragmentIds],
  );
  const hypothesisDraft = useMemo(
    () => buildHypothesisFromSelection(encounter, session.extractedFragmentIds),
    [encounter, session.extractedFragmentIds],
  );
  const strategyChoices = useMemo(() => getStrategyChoices(encounter), [encounter]);
  const selectedAction = getSelectedAction(session.strategySentence);
  const currentChapter: ReadingChapter = reviewChapter ?? session.phase;
  const availableChapters =
    session.phase === "strategy" && session.lastBattle
      ? [...AVAILABLE_CHAPTERS.strategy, "validation" as const]
      : AVAILABLE_CHAPTERS[session.phase];
  const lastValidatedAction =
    session.lastBattle?.ruleGraph?.actionNode.actionId ?? selectedAction;
  const conditionLabel = getSemanticLabel(encounter, encounter.enemyRule.condition);
  const executionRunning = session.execution.status === "running";

  useEffect(() => {
    contentRef.current
      ?.querySelector<HTMLHeadingElement>("h1")
      ?.focus({ preventScroll: true });
  }, [currentChapter]);

  const dispatch = useCallback((action: ReadingLoopAction) => {
    setSession((current) => transitionReadingLoopSession(encounter, current, action));
  }, [encounter]);

  const handleObservationComplete = () => {
    setSession((current) => {
      const recorded = transitionReadingLoopSession(encounter, current, {
        type: "record_observation",
        events: OBSERVATION_EVENTS,
      });
      return transitionReadingLoopSession(encounter, recorded, {
        type: "advance_to_reading",
      });
    });
  };

  const handleEvidenceSegment = (segment: EvidenceSegment) => {
    if (!segment.fragmentId || !segment.semanticId) {
      setEvidenceFeedback(
        segment.hint ?? "その言葉だけでは、条件と行動のつながりが分からない。",
      );
      return;
    }

    if (session.extractedFragmentIds.includes(segment.fragmentId)) {
      dispatch({ type: "remove_fragment", fragmentId: segment.fragmentId });
      setEvidenceFeedback("写し取った言葉を原文へ戻した。");
      return;
    }

    dispatch({ type: "extract_fragment", fragmentId: segment.fragmentId });
    setEvidenceFeedback(fragmentFeedback(encounter, segment.semanticId));
  };

  const handleRemoveFragment = (fragmentId: string) => {
    dispatch({ type: "remove_fragment", fragmentId });
    setEvidenceFeedback("写し取った言葉を原文へ戻した。");
  };

  const handleAdvanceToStrategy = () => {
    const hypothesis = buildHypothesisFromSelection(
      encounter,
      session.extractedFragmentIds,
    );
    if (!hypothesis) return;

    setSession((current) => {
      const withHypothesis = transitionReadingLoopSession(encounter, current, {
        type: "set_hypothesis",
        hypothesis,
      });
      const strategySession = transitionReadingLoopSession(encounter, withHypothesis, {
        type: "advance_to_strategy",
      });
      return transitionReadingLoopSession(encounter, strategySession, {
        type: "set_strategy_sentence",
        sentence: {
          parts: [
            {
              kind: "condition",
              semanticId: hypothesis.condition,
              sourceFragmentId: hypothesis.evidenceFragmentIds[0],
            },
            { kind: "connector", semanticId: "syntax.if_then" },
          ],
        },
      });
    });
  };

  const handleSelectAction = (action: PlayerActionSemanticId) => {
    const sourceFragment = session.extractedFragmentIds
      .map((fragmentId) => getEncounterFragment(encounter, fragmentId))
      .find((fragment) => fragment?.kind === "condition");
    const sentence = buildStrategySentence(
      encounter.enemyRule.condition,
      action,
      sourceFragment?.id,
    );
    dispatch({ type: "set_strategy_sentence", sentence });
  };

  const handleBeginExecution = useCallback((): LiveSentenceRun | null => {
    const analysis = parseStrategySentence(session.strategySentence);
    if (
      analysis.state !== "valid" ||
      session.execution.status !== "complete"
    ) {
      return null;
    }

    const result = simulateBattle({
      encounter,
      strategy: analysis.parsed,
      activeConditions: [encounter.enemyRule.condition],
    });
    runSequenceRef.current += 1;
    const runId = `${encounter.id}-${Date.now()}-${runSequenceRef.current}`;
    dispatch({ type: "begin_execution", runId });
    return { runId, result };
  }, [dispatch, encounter, session.execution.status, session.strategySentence]);

  const handleExecutionComplete = useCallback(
    (run: LiveSentenceRun) => {
      setSession((current) => {
        const validated = transitionReadingLoopSession(encounter, current, {
          type: "record_validation",
          runId: run.runId,
          result: run.result,
        });
        return run.result.validation.success
          ? validated
          : transitionReadingLoopSession(encounter, validated, {
              type: "return_to_strategy",
            });
      });
    },
    [encounter],
  );

  const handleExecutionCancel = useCallback(
    (runId: string) => {
      dispatch({ type: "cancel_execution", runId });
    },
    [dispatch],
  );

  const handleReturnToStrategy = () => {
    setReviewChapter(null);
    if (session.phase === "validation") {
      dispatch({ type: "return_to_strategy" });
    }
  };

  const handleChapterSelect = (chapter: ReadingChapter) => {
    if (executionRunning) return;

    if (chapter === "observation" && session.phase !== "observation") {
      setReviewChapter("observation");
      return;
    }

    if (chapter === session.phase) {
      setReviewChapter(null);
      return;
    }

    if (session.phase === "validation" && chapter === "strategy") {
      setReviewChapter(null);
      dispatch({ type: "return_to_strategy" });
      return;
    }

    if (
      chapter === "reading" ||
      (chapter === "validation" && session.lastBattle !== null)
    ) {
      setReviewChapter(chapter);
    }
  };

  return (
    <main className="reading-loop">
      <div className="reading-loop__ambient" aria-hidden="true" />
      <header className="reading-loop__topbar">
        <div className="reading-loop__brand">
          <span aria-hidden="true">言</span>
          <div>
            <strong>ことばクエスト</strong>
            <small>裂鎧の獣・調査記録</small>
          </div>
        </div>
        <ChapterNav
          current={currentChapter}
          available={availableChapters}
          onSelect={handleChapterSelect}
        />
        {onExit && (
          <button
            type="button"
            className="reading-loop__exit"
            onClick={onExit}
            disabled={executionRunning}
          >
            元の冒険へ戻る
          </button>
        )}
      </header>

      <div ref={contentRef} className="reading-loop__content">
        {currentChapter === "observation" && (
          <ObservationStage
            enemyName={encounter.enemyName}
            moments={OBSERVATION_MOMENTS}
            isReview={session.phase !== "observation"}
            onContinue={
              session.phase === "observation"
                ? handleObservationComplete
                : () => setReviewChapter(null)
            }
          />
        )}

        {currentChapter === "reading" && (
          <EvidenceReader
            passages={passages}
            extractedFragments={extractedFragments}
            selectedFragmentIds={session.extractedFragmentIds}
            hypothesisText={formatHypothesis(encounter, hypothesisDraft)}
            hypothesisReady={hypothesisDraft !== null}
            feedback={evidenceFeedback}
            isReview={session.phase !== "reading"}
            onSelectSegment={handleEvidenceSegment}
            onRemoveFragment={handleRemoveFragment}
            onContinue={
              session.phase === "reading"
                ? handleAdvanceToStrategy
                : () => setReviewChapter(null)
            }
          />
        )}

        {(currentChapter === "strategy" || currentChapter === "validation") && (
          <LiveSentenceStage
            conditionLabel={conditionLabel}
            choices={strategyChoices}
            selectedAction={
              currentChapter === "validation"
                ? lastValidatedAction
                : selectedAction
            }
            evidenceFragments={extractedFragments}
            executionStatus={session.execution.status}
            lastResult={session.lastBattle}
            reviewMode={currentChapter === "validation"}
            onSelectAction={handleSelectAction}
            onBeginExecution={handleBeginExecution}
            onExecutionComplete={handleExecutionComplete}
            onExecutionCancel={handleExecutionCancel}
            onReturnToStrategy={handleReturnToStrategy}
          />
        )}
      </div>
    </main>
  );
}
