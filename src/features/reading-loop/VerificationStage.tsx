import type { PlayerActionSemanticId } from "../../readingLoop/types";
import { EncounterScene } from "./EncounterScene";
import { MagicCirclePreview } from "./MagicCirclePreview";
import type {
  TimelineMoment,
  TraceStepView,
  ValidationSummaryView,
} from "./types";
import { useTimelinePlayback } from "./useTimelinePlayback";

interface VerificationStageProps {
  conditionLabel: string;
  actionLabel: string;
  selectedAction: PlayerActionSemanticId;
  moments: readonly TimelineMoment[];
  traceSteps: readonly TraceStepView[];
  summary: ValidationSummaryView;
  attempts: number;
  isReview?: boolean;
  onEditStrategy: () => void;
}

export function VerificationStage({
  conditionLabel,
  actionLabel,
  selectedAction,
  moments,
  traceSteps,
  summary,
  attempts,
  isReview = false,
  onEditStrategy,
}: VerificationStageProps) {
  const playback = useTimelinePlayback({ itemCount: moments.length, intervalMs: 1120 });
  const activeMoment = moments[playback.activeIndex] ?? moments[0];
  const resultVisible =
    moments.length > 0 && playback.activeIndex >= moments.length - 1 && !playback.isPlaying;

  if (!activeMoment) return null;

  return (
    <section className="reading-stage reading-validation" aria-labelledby="reading-validation-title">
      <header className="reading-stage__header">
        <div>
          <p className="reading-stage__eyebrow">
            {isReview ? "直前の検証" : "第四章・検証"}
          </p>
          <h1 id="reading-validation-title" tabIndex={-1}>
            {isReview ? "直前の因果を見返す" : "作戦文の働きを追う"}
          </h1>
          <p>条件が光り、行動へつながり、戦場で何が起きたかを順に見る。</p>
        </div>
        <span className="reading-stage__objective">検証 {attempts} 回目</span>
      </header>

      <div className="reading-validation__layout">
        <div className="reading-validation__battle">
          <EncounterScene
            state={activeMoment.visualState}
            selectedAction={selectedAction}
            label={activeMoment.detail}
          />
          <div className="reading-playback" aria-label="検証戦闘の再生操作">
            <button
              type="button"
              onClick={playback.isPlaying ? playback.pause : playback.play}
            >
              <span aria-hidden="true">{playback.isPlaying ? "Ⅱ" : "▶"}</span>
              {playback.isPlaying ? "一時停止" : "再生"}
            </button>
            <button type="button" onClick={playback.replay}>
              <span aria-hidden="true">↶</span>
              リプレイ
            </button>
          </div>
          <ol className="reading-validation__event-strip" aria-label="戦闘イベント">
            {moments.map((moment, index) => (
              <li key={moment.id}>
                <button
                  type="button"
                  className={playback.activeIndex === index ? "is-current" : ""}
                  aria-current={playback.activeIndex === index ? "true" : undefined}
                  onClick={() => playback.jumpTo(index)}
                >
                  <time>{moment.timeLabel}</time>
                  <span>{moment.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <aside className="reading-validation__trace" aria-label="作戦の因果関係">
          <MagicCirclePreview
            conditionLabel={conditionLabel}
            actionLabel={actionLabel}
            action={selectedAction}
            state={resultVisible ? (summary.success ? "confirmed" : "refuted") : "unverified"}
            activePart={activeMoment.activePart}
            compact
          />
          <div className="reading-panel-heading">
            <span className="reading-panel-heading__seal" aria-hidden="true">因</span>
            <div>
              <h2>因果の跡</h2>
              <p>今起きている箇所が光る</p>
            </div>
          </div>
          <ol className="reading-causal-trace">
            {traceSteps.map((step) => {
              const eventIndex = moments.findIndex((moment) => moment.id === step.id);
              const status =
                eventIndex > playback.activeIndex
                  ? "pending"
                  : eventIndex === playback.activeIndex
                    ? "active"
                    : step.status;
              return (
                <li key={step.id} className={`is-${status}`}>
                  <span className="reading-causal-trace__mark" aria-hidden="true" />
                  <div>
                    <strong>{step.label}</strong>
                    <small>{status === "pending" ? "まだ起きていない" : step.detail}</small>
                  </div>
                </li>
              );
            })}
          </ol>

          <div
            className={`reading-validation__result ${resultVisible ? "is-visible" : ""} ${summary.success ? "is-success" : "is-failure"}`}
            aria-live="polite"
          >
            {resultVisible ? (
              <>
                <span>{summary.success ? "確認" : "反証"}</span>
                <h2>{summary.title}</h2>
                <p>{summary.detail}</p>
                <button type="button" className="reading-primary-action" onClick={onEditStrategy}>
                  {isReview ? "作戦へ戻る" : "作戦を直す"}
                  <span aria-hidden="true">↶</span>
                </button>
              </>
            ) : (
              <p>戦闘の終わりまで追うと、結果と理由が残る。</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
