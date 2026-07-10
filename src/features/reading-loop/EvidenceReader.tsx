import type {
  EvidencePassageView,
  EvidenceSegment,
  ExtractedFragmentView,
} from "./types";

interface EvidenceReaderProps {
  passages: readonly EvidencePassageView[];
  extractedFragments: readonly ExtractedFragmentView[];
  selectedFragmentIds: readonly string[];
  hypothesisText: string;
  hypothesisReady: boolean;
  feedback: string;
  isReview?: boolean;
  onSelectSegment: (segment: EvidenceSegment) => void;
  onRemoveFragment: (fragmentId: string) => void;
  onContinue: () => void;
}

export function EvidenceReader({
  passages,
  extractedFragments,
  selectedFragmentIds,
  hypothesisText,
  hypothesisReady,
  feedback,
  isReview = false,
  onSelectSegment,
  onRemoveFragment,
  onContinue,
}: EvidenceReaderProps) {
  return (
    <section className="reading-stage reading-evidence" aria-labelledby="reading-evidence-title">
      <header className="reading-stage__header">
        <div>
          <p className="reading-stage__eyebrow">
            {isReview ? "原文の再確認" : "第二章・読み解き"}
          </p>
          <h1 id="reading-evidence-title" tabIndex={-1}>
            {isReview ? "根拠を読み返す" : "原文から規則を写し取る"}
          </h1>
          <p>
            {isReview
              ? "抽出した節と、その前後の言葉を並べて確かめる。"
              : "光る兆しと、その後に起きる敵の行動を選ぶ。"}
          </p>
        </div>
        <span className="reading-stage__objective">選ぶもの：条件と敵の行動</span>
      </header>

      <div className="reading-evidence__layout">
        <div className="reading-evidence__book" aria-label="二つの記録">
          {passages.map((passage) => (
            <article key={passage.id} className="reading-evidence__page">
              <p className="reading-evidence__source">{passage.title}</p>
              <p className="reading-evidence__text">
                {passage.segments.map((segment) =>
                  segment.selectable ? (
                    <button
                      key={segment.id}
                      type="button"
                      className="reading-inline-fragment"
                      aria-pressed={
                        segment.fragmentId
                          ? selectedFragmentIds.includes(segment.fragmentId)
                          : false
                      }
                      disabled={isReview}
                      onClick={() => onSelectSegment(segment)}
                    >
                      {segment.text}
                    </button>
                  ) : (
                    <span key={segment.id}>{segment.text}</span>
                  ),
                )}
              </p>
              {passage.alternateSegments.length > 0 && (
                <div
                  className="reading-evidence__alternates"
                  aria-label="同じ原文の短い切り取り方"
                >
                  <span>短く写す</span>
                  {passage.alternateSegments.map((segment) => (
                    <button
                      key={segment.id}
                      type="button"
                      aria-pressed={
                        segment.fragmentId
                          ? selectedFragmentIds.includes(segment.fragmentId)
                          : false
                      }
                      disabled={isReview}
                      onClick={() => onSelectSegment(segment)}
                    >
                      {segment.text}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
          <p className="reading-evidence__feedback" aria-live="polite">
            {feedback}
          </p>
        </div>

        <aside className="reading-transcription" aria-label="写し取った言葉と仮説">
          <div className="reading-panel-heading">
            <span className="reading-panel-heading__seal" aria-hidden="true">写</span>
            <div>
              <h2>写し取った言葉</h2>
              <p>外すときは、もう一度選ぶ</p>
            </div>
          </div>
          <ul className="reading-transcription__fragments">
            {extractedFragments.length > 0 ? (
              extractedFragments.map((fragment) => (
                <li key={fragment.id}>
                  <button
                    type="button"
                    disabled={isReview}
                    onClick={() => onRemoveFragment(fragment.id)}
                  >
                    <span>{fragment.roleLabel}</span>
                    <strong>{fragment.text}</strong>
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))
            ) : (
              <li className="is-empty">原文の光る箇所から選ぶ</li>
            )}
          </ul>

          <div className={`reading-hypothesis ${hypothesisReady ? "is-ready" : ""}`}>
            <span className="reading-hypothesis__label">獣の規則についての仮説</span>
            <p>{hypothesisText}</p>
            <small>
              {hypothesisReady
                ? "文として検証できる。正しいかは戦闘で確かめる"
                : "条件と敵の行動がそろうと、文がつながる"}
            </small>
          </div>

          <button
            type="button"
            className="reading-primary-action"
            disabled={!isReview && !hypothesisReady}
            onClick={onContinue}
          >
            {isReview ? "推理へ戻る" : "この仮説で作戦を組む"}
            <span aria-hidden="true">→</span>
          </button>
        </aside>
      </div>
    </section>
  );
}
