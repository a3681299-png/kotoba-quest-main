import { EncounterScene } from "./EncounterScene";
import type { TimelineMoment } from "./types";
import { useTimelinePlayback } from "./useTimelinePlayback";

interface ObservationStageProps {
  enemyName: string;
  moments: readonly TimelineMoment[];
  onContinue: () => void;
  isReview?: boolean;
}

export function ObservationStage({
  enemyName,
  moments,
  onContinue,
  isReview = false,
}: ObservationStageProps) {
  const playback = useTimelinePlayback({ itemCount: moments.length, intervalMs: 1450 });
  const activeMoment = moments[playback.activeIndex] ?? moments[0];
  const reachedLastMoment = playback.activeIndex >= moments.length - 1;

  if (!activeMoment) return null;

  return (
    <section className="reading-stage reading-observation" aria-labelledby="reading-observation-title">
      <header className="reading-stage__header">
        <div>
          <p className="reading-stage__eyebrow">
            {isReview ? "観察記録" : "第一章・観察"}
          </p>
          <h1 id="reading-observation-title" tabIndex={-1}>
            {isReview ? "重要な瞬間を見返す" : "兆しを見届ける"}
          </h1>
          <p>
            {isReview
              ? `${enemyName}の兆しと突進を、記録した瞬間から確かめる。`
              : `答えはまだ書かれていない。${enemyName}の動きだけを追う。`}
          </p>
        </div>
        <span className="reading-stage__objective">見るもの：光った後の動き</span>
      </header>

      <div className="reading-observation__layout">
        <div className="reading-observation__scene-column">
          <EncounterScene state={activeMoment.visualState} label={activeMoment.detail} />
          <div className="reading-playback" aria-label="観察記録の再生操作">
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
            <button
              type="button"
              onClick={() => playback.jumpTo(Math.max(0, moments.length - 1))}
            >
              最後へ
            </button>
          </div>
          <p className="reading-playback__status" aria-live="polite">
            <strong>{activeMoment.label}</strong>
            <span>{activeMoment.detail}</span>
          </p>
        </div>

        <aside className="reading-moment-log" aria-label="記録された重要な瞬間">
          <div className="reading-panel-heading">
            <span className="reading-panel-heading__seal" aria-hidden="true">録</span>
            <div>
              <h2>残った瞬間</h2>
              <p>選ぶと、その場面へ戻る</p>
            </div>
          </div>
          <ol>
            {moments.map((moment, index) => (
              <li key={moment.id}>
                <button
                  type="button"
                  className={playback.activeIndex === index ? "is-current" : ""}
                  aria-current={playback.activeIndex === index ? "true" : undefined}
                  onClick={() => playback.jumpTo(index)}
                >
                  <time>{moment.timeLabel}</time>
                  <span>
                    <strong>{moment.label}</strong>
                    <small>{moment.detail}</small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <button type="button" className="reading-primary-action" onClick={onContinue}>
            {isReview
              ? "推理へ戻る"
              : reachedLastMoment
                ? "記録を読む"
                : "観察を切り上げて記録を読む"}
            <span aria-hidden="true">→</span>
          </button>
        </aside>
      </div>
    </section>
  );
}
