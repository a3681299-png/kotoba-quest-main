import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type PointerEvent,
} from "react";
import {
  SENTENCE_SLOT_LABELS,
  type SentenceSlot,
  type VocabularyWord,
  type WordCategory,
  type WordId,
  type WordQuestRunState,
  wordFitsSlot,
} from "../../wordQuest";
import wordCardUrl from "../../assets/UI/card/card.png";
import { CATEGORY_META } from "./wordQuestUiMeta";

interface LexiconDrawerProps {
  activeCategory: WordCategory;
  activeSentenceIndex: number;
  activeSlot: SentenceSlot;
  draggedWordId: WordId | null;
  handCycle: number;
  isOpen: boolean;
  focusRequestId: number;
  ownedWords: readonly VocabularyWord[];
  phase: WordQuestRunState["phase"];
  rejectedWordId: WordId | null;
  onBeginWordDrag: (
    event: DragEvent<HTMLButtonElement>,
    wordId: WordId,
  ) => void;
  onEndWordDrag: () => void;
  onPlaceWord: (wordId: WordId) => void;
}

export function LexiconDrawer({
  activeCategory,
  activeSentenceIndex,
  activeSlot,
  draggedWordId,
  handCycle,
  isOpen,
  focusRequestId,
  ownedWords,
  phase,
  rejectedWordId,
  onBeginWordDrag,
  onEndWordDrag,
  onPlaceWord,
}: LexiconDrawerProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const detailContextKey = `${activeSentenceIndex}:${activeSlot}:${handCycle}`;
  const [detailRequest, setDetailRequest] = useState<{
    wordId: WordId;
    contextKey: string;
  } | null>(null);
  const activeMeta = CATEGORY_META[activeCategory];
  const matchingWords = useMemo(
    () =>
      ownedWords.filter(
        (word) =>
          word.category === activeCategory && wordFitsSlot(word, activeSlot),
      ),
    [activeCategory, activeSlot, ownedWords],
  );
  const visibleWords = useMemo(() => {
    if (matchingWords.length < 2) return matchingWords;
    const offset = handCycle % matchingWords.length;
    return [...matchingWords.slice(offset), ...matchingWords.slice(0, offset)];
  }, [handCycle, matchingWords]);
  const detailWord =
    detailRequest?.contextKey === detailContextKey
      ? visibleWords.find((word) => word.id === detailRequest.wordId) ?? null
      : null;
  const trayId = "word-lexicon-stage";

  useEffect(() => {
    if (!isOpen || focusRequestId === 0) return;
    stageRef.current
      ?.querySelector<HTMLButtonElement>(".strategy-dock__card:not(:disabled)")
      ?.focus({ preventScroll: true });
  }, [focusRequestId, isOpen]);

  useEffect(
    () => () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
      }
    },
    [],
  );

  const beginLongPress = (
    event: PointerEvent<HTMLButtonElement>,
    wordId: WordId,
  ) => {
    if (event.pointerType === "mouse") return;
    suppressClickRef.current = false;
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = true;
      setDetailRequest({ wordId, contextKey: detailContextKey });
      longPressTimerRef.current = null;
    }, 460);
  };

  const endLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const cancelLongPress = () => {
    endLongPress();
    suppressClickRef.current = false;
  };

  return (
    <section
      className={`strategy-dock__tray is-${activeCategory} ${
        isOpen ? "is-open" : "is-exchanging"
      }`}
      aria-labelledby="word-tray-title"
    >
      <h3 id="word-tray-title" className="strategy-dock__sr-only">
        第{activeSentenceIndex + 1}文・{SENTENCE_SLOT_LABELS[activeSlot]}・
        {activeMeta.label}カード
      </h3>

      <div className="strategy-dock__cards-frame">
        <div
          id={trayId}
          ref={stageRef}
          className="strategy-dock__hand-stage"
          role="region"
          aria-labelledby="word-tray-title"
          aria-busy={!isOpen}
        >
          <div className="strategy-dock__cards-track">
            {visibleWords.length === 0 ? (
              <p className="strategy-dock__empty">
                この枠に置ける語彙は、まだ見つかっていません。
              </p>
            ) : (
              visibleWords.map((word, index) => {
                const fanIndex = index - (visibleWords.length - 1) / 2;
                const fanAngle = Math.max(-11, Math.min(11, fanIndex * 4));
                const fanDrop = Math.min(20, Math.abs(fanIndex) * 8);
                const entryOffset = fanIndex * -88;
                const stackOrder = 50 - Math.round(Math.abs(fanIndex) * 2);

                return (
                  <button
                    key={`${handCycle}-${word.id}`}
                    type="button"
                    draggable={phase === "battle" && isOpen}
                    tabIndex={isOpen ? 0 : -1}
                    className={[
                      "strategy-dock__card",
                      `is-${word.category}`,
                      draggedWordId === word.id ? "is-dragging" : "",
                      rejectedWordId === word.id ? "is-rejected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={
                      {
                        "--card-delay": `${Math.min(index, 9) * 42}ms`,
                        "--card-angle": `${fanAngle}deg`,
                        "--card-drop": `${fanDrop}px`,
                        "--card-entry-x": `${entryOffset}px`,
                        "--card-stack": stackOrder,
                      } as CSSProperties
                    }
                    onClick={() => {
                      if (suppressClickRef.current) {
                        suppressClickRef.current = false;
                        return;
                      }
                      setDetailRequest(null);
                      onPlaceWord(word.id);
                    }}
                    onDragStart={(event) => onBeginWordDrag(event, word.id)}
                    onDragEnd={onEndWordDrag}
                    onFocus={() =>
                      setDetailRequest({
                        wordId: word.id,
                        contextKey: detailContextKey,
                      })
                    }
                    onBlur={() => setDetailRequest(null)}
                    onMouseEnter={() =>
                      setDetailRequest({
                        wordId: word.id,
                        contextKey: detailContextKey,
                      })
                    }
                    onMouseLeave={() => setDetailRequest(null)}
                    onPointerDown={(event) => beginLongPress(event, word.id)}
                    onPointerUp={endLongPress}
                    onPointerCancel={cancelLongPress}
                    disabled={phase !== "battle" || !isOpen}
                    aria-describedby={`strategy-word-detail-${word.id}`}
                  >
                    <img
                      className="strategy-dock__card-art"
                      src={wordCardUrl}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                    />
                    <span
                      className="strategy-dock__card-tint"
                      aria-hidden="true"
                    />
                    <span className="strategy-dock__card-head">
                      <span
                        className="strategy-dock__card-mark"
                        aria-hidden="true"
                      >
                        {CATEGORY_META[word.category].mark}
                      </span>
                      <small>{CATEGORY_META[word.category].label}</small>
                    </span>
                    <span className="strategy-dock__card-copy">
                      <strong>{word.label}</strong>
                    </span>
                    <span
                      id={`strategy-word-detail-${word.id}`}
                      className="strategy-dock__sr-only"
                    >
                      {word.tooltip} 例：{word.example}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {detailWord && isOpen && (
          <aside className="strategy-dock__card-detail" role="tooltip">
            <div className="strategy-dock__card-detail-preview" aria-hidden="true">
              <img src={wordCardUrl} alt="" />
              <span>{CATEGORY_META[detailWord.category].mark}</span>
              <small>{CATEGORY_META[detailWord.category].label}</small>
              <strong>{detailWord.label}</strong>
            </div>
            <div className="strategy-dock__card-detail-copy">
              <small>{CATEGORY_META[detailWord.category].label}カード</small>
              <strong>{detailWord.label}</strong>
              <p>{detailWord.tooltip}</p>
              <span>例：{detailWord.example}</span>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
