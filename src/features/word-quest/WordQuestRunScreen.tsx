import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from "react";
import {
  SENTENCE_SLOT_LABELS,
  VOCABULARY_BY_ID,
  WORD_CATEGORY_LABELS,
  WORD_QUEST_SAVE_KEY,
  chooseRunReward,
  createStrategySentence,
  createWordQuestRun,
  executeRunBattle,
  formatSentence,
  getEnemy,
  getNextEmptySlot,
  getOwnedWords,
  restoreWordQuestRun,
  retryWordQuestRun,
  serializeWordQuestRun,
  setSentenceSlot,
  updateRunStrategies,
  validatePlan,
  wordFitsSlot,
  type EnemyStatus,
  type PlayerStatus,
  type SentenceSlot,
  type StrategySentence,
  type WordId,
  type WordQuestRunState,
} from "../../wordQuest";
import hpColorLayerUrl from "../../assets/UI/hp/HPの色レイヤー.png";
import hpFrameUrl from "../../assets/UI/hp/空のゲージ背景.png";
import lottaFrameUrl from "../../assets/UI/icon/frame/lotta_frame.png";
import commandArrowUrl from "../../assets/UI/arrow/arrow.png";
import { LiveBattlefield } from "../reading-loop/LiveBattlefield";
<<<<<<< HEAD
import { BattleSettingsMenu } from "../../components/BattleSettingsMenu";
import { LexiconDrawer } from "./LexiconDrawer";
import { analyzeStrategySynergy } from "./strategySynergy";
import {
  CATEGORY_META,
  SLOT_ORDER,
  categoryForSlot,
  countUsedVocabularySlots,
} from "./wordQuestUiMeta";
=======
import { auth, saveStageCode, saveUserProgress } from "../../lib/firebase"; // FirebaseとローカルAPI連携用
>>>>>>> f6a531c8fe4646590ddc75941dc6b28a9d18cc94
import "./word-quest-run.css";
import "./word-quest-game.css";
import "./word-quest-contextual-tray.css";
import "./word-quest-stage-split.css";
import "./word-quest-strategy-dock.css";

interface WordQuestRunScreenProps {
  onExit?: () => void;
  startFresh?: boolean;
}

const STATUS_LABELS: Readonly<Record<EnemyStatus, string>> = {
  enraged: "怒り",
  watching: "視線",
  illuminated: "照明",
  named: "真名",
  stopped: "停止",
  bound: "拘束",
  exposed: "露出",
};

const STATUS_MARKS: Readonly<Record<EnemyStatus, string>> = {
  enraged: "怒",
  watching: "眼",
  illuminated: "灯",
  named: "名",
  stopped: "止",
  bound: "鎖",
  exposed: "隙",
};

const PLAYER_STATUS_LABELS: Readonly<Record<PlayerStatus, string>> = {
  guarded: "守り",
  wounded: "負傷",
  attacked: "被弾",
};

const PLAYER_STATUS_MARKS: Readonly<Record<PlayerStatus, string>> = {
  guarded: "守",
  wounded: "傷",
  attacked: "撃",
};

const BASE_ACTION_SLOTS = 3;

const EMPTY_SLOT_LABELS: Readonly<Record<SentenceSlot, string>> = {
  subject: "主体を選択",
  condition: "条件を選択",
  connector: "接続を選択",
  action: "行動を選択",
  target: "対象を選択",
  modifier: "修飾を選択",
};

const SLOT_ERROR_LABELS: Readonly<Record<SentenceSlot, string>> = {
  subject: "主体が必要",
  condition: "条件が必要",
  connector: "接続が必要",
  action: "行動が必要",
  target: "対象が必要",
  modifier: "修飾を確認",
};

function loadSavedRun(): WordQuestRunState | null {
  if (typeof window === "undefined") return null;
  try {
    return restoreWordQuestRun(window.localStorage.getItem(WORD_QUEST_SAVE_KEY));
  } catch {
    return null;
  }
}

function hpPercent(value: number, max: number): number {
  return Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
}

interface PlayerVitalBarProps {
  current: number;
  max: number;
  name: string;
  portraitFrameUrl: string;
  side: "player" | "enemy";
  statuses: ReadonlyArray<{
    id: string;
    label: string;
    mark: string;
  }>;
}

function PlayerVitalBar({
  current,
  max,
  name,
  portraitFrameUrl,
  side,
  statuses,
}: PlayerVitalBarProps) {
  const percent = hpPercent(current, max);
  const healthState =
    percent <= 25 ? "critical" : percent <= 50 ? "wounded" : "steady";
  const artStyle = {
    "--word-hp-percent": `${percent}%`,
  } as CSSProperties;

  return (
    <div
      className={`word-game__vitals word-game__vitals--${side}`}
      data-health={healthState}
      role="group"
      aria-label={`${name}の戦闘状態`}
    >
      <span className="word-game__vitals-portrait" aria-hidden="true">
        <img
          className="word-game__vitals-portrait-image word-game__vitals-portrait-image--composite"
          src={portraitFrameUrl}
          alt=""
          draggable={false}
        />
      </span>

      <div className="word-game__vitals-body">
        <strong className="word-game__vitals-name">{name}</strong>
        <div
          className="word-game__vitals-gauge"
          role="meter"
          aria-label={`${name}の体力`}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={current}
        >
          <div
            className="word-game__vitals-gauge-art"
            style={artStyle}
            aria-hidden="true"
          >
            <img
              className="word-game__vitals-gauge-layer word-game__vitals-gauge-layer--frame"
              src={hpFrameUrl}
              alt=""
              draggable={false}
            />
            <span className="word-game__vitals-gauge-fill">
              <img
                className="word-game__vitals-gauge-layer word-game__vitals-gauge-layer--fill"
                src={hpColorLayerUrl}
                alt=""
                draggable={false}
              />
            </span>
            <img
              className="word-game__vitals-gauge-layer word-game__vitals-gauge-layer--frame word-game__vitals-gauge-layer--frame-overlay"
              src={hpFrameUrl}
              alt=""
              draggable={false}
            />
          </div>
          <span className="word-game__vitals-meter">{current}/{max}</span>
        </div>

        <div className="word-game__statuses" aria-label={`${name}の状態効果`}>
          {statuses.map((status) => (
            <span key={status.id} title={status.label} aria-label={status.label}>
              {status.mark}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

interface EnemyVitalBarProps {
  current: number;
  max: number;
  name: string;
  statuses: ReadonlyArray<{
    id: string;
    label: string;
    mark: string;
  }>;
}

function EnemyVitalBar({
  current,
  max,
  name,
  statuses,
}: EnemyVitalBarProps) {
  const percent = hpPercent(current, max);
  const healthState =
    percent <= 25 ? "critical" : percent <= 50 ? "wounded" : "steady";
  const meterStyle = {
    "--word-enemy-hp-percent": `${percent}%`,
  } as CSSProperties;

  return (
    <div
      className="word-game__enemy-vitals"
      data-health={healthState}
      role="group"
      aria-label={`${name}の戦闘状態`}
    >
      <strong className="word-game__enemy-vitals-name">{name}</strong>
      <div
        className="word-game__enemy-vitals-meter"
        style={meterStyle}
        role="meter"
        aria-label={`${name}の体力`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={current}
      >
        <span className="word-game__enemy-vitals-fill" aria-hidden="true" />
        <b>{current}</b>
      </div>

      {statuses.length > 0 && (
        <div
          className="word-game__enemy-statuses"
          aria-label={`${name}の状態効果`}
        >
          {statuses.map((status) => (
            <span key={status.id} title={status.label} aria-label={status.label}>
              {status.mark}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function sentenceWordId(
  sentence: StrategySentence,
  slot: SentenceSlot,
): WordId | null {
  return sentence[slot];
}

export function WordQuestRunScreen({
  onExit,
  startFresh = false,
}: WordQuestRunScreenProps) {
  const [initialState] = useState(() => {
    const saved = startFresh ? null : loadSavedRun();
    const seed = saved?.seed ?? "KOTOBA-001";
    const initialRun = startFresh ? createWordQuestRun(seed) : saved;
    return {
      saved: initialRun,
      seed,
      notice: saved ? "保存した冒険を再開しました。" : "",
    };
  });
  const executionTimerRef = useRef<number | null>(null);
  const placementTimerRef = useRef<number | null>(null);
  const rejectionTimerRef = useRef<number | null>(null);
  const exchangeTimerRef = useRef<number | null>(null);
  const executeButtonRef = useRef<HTMLButtonElement>(null);
  const [run, setRun] = useState<WordQuestRunState | null>(initialState.saved);
  const [seed, setSeed] = useState(initialState.seed);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(0);
  const [activeSlot, setActiveSlot] = useState<SentenceSlot>("condition");
  const [isLexiconOpen, setIsLexiconOpen] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [draggedWordId, setDraggedWordId] = useState<WordId | null>(null);
  const [placementTarget, setPlacementTarget] = useState<{
    sentenceIndex: number;
    slot: SentenceSlot;
  } | null>(null);
  const [rejectedWordId, setRejectedWordId] = useState<WordId | null>(null);
  const [lexiconFocusRequestId, setLexiconFocusRequestId] = useState(0);
  const [handCycle, setHandCycle] = useState(0);
  const [strategyHistory, setStrategyHistory] = useState<
    readonly (readonly StrategySentence[])[]
  >([]);
  const [notice, setNotice] = useState(initialState.notice);

  useEffect(() => {
    if (!run) return;
    try {
      window.localStorage.setItem(
        WORD_QUEST_SAVE_KEY,
        serializeWordQuestRun(run),
      );
    } catch {
      // localStorage が使えない場合も、現在のタブでは状態を維持する。
    }
  }, [run]);

  useEffect(
    () => () => {
      if (executionTimerRef.current !== null) {
        window.clearTimeout(executionTimerRef.current);
      }
      if (placementTimerRef.current !== null) {
        window.clearTimeout(placementTimerRef.current);
      }
      if (rejectionTimerRef.current !== null) {
        window.clearTimeout(rejectionTimerRef.current);
      }
      if (exchangeTimerRef.current !== null) {
        window.clearTimeout(exchangeTimerRef.current);
      }
    },
    [],
  );

  const enemy = run ? getEnemy(run.currentBattle.enemyId) : null;
  const validations = useMemo(
    () => (run ? validatePlan(run.strategies, run.inventory) : []),
    [run],
  );
  const ownedWords = useMemo(
    () => (run ? getOwnedWords(run.inventory) : []),
    [run],
  );
  const strategySynergy = useMemo(
    () =>
      run
        ? analyzeStrategySynergy(run.strategies, validations)
        : null,
    [run, validations],
  );
  const planReady =
    Boolean(run) &&
    validations.length > 0 &&
    validations.every((validation) => validation.valid);

  const startRun = () => {
    const next = createWordQuestRun(seed);
    setRun(next);
    setSeed(next.seed);
    setActiveSentenceIndex(0);
    setActiveSlot("condition");
    setIsLexiconOpen(true);
    setHandCycle(0);
    setStrategyHistory([]);
    setNotice("少ない語彙で冒険を始めました。");
  };

  const updateStrategies = (
    strategies: readonly StrategySentence[],
    recordHistory = true,
  ) => {
    if (run && recordHistory) {
      setStrategyHistory((current) => [
        ...current.slice(-19),
        run.strategies,
      ]);
    }
    setRun((current) =>
      current ? updateRunStrategies(current, strategies) : current,
    );
  };

  const selectSlot = (sentenceIndex: number, slot: SentenceSlot) => {
    setActiveSentenceIndex(sentenceIndex);
    setActiveSlot(slot);
    setIsLexiconOpen(true);
  };

  const selectSentence = (sentenceIndex: number) => {
    if (!run) return;
    const sentence = run.strategies[sentenceIndex];
    if (!sentence) return;
    setActiveSentenceIndex(sentenceIndex);
    setActiveSlot(
      validations[sentenceIndex]?.missingSlot ?? getNextEmptySlot(sentence),
    );
    setIsLexiconOpen(true);
  };

  const rejectWordPlacement = (wordId: WordId, message: string) => {
    setNotice(message);
    setRejectedWordId(wordId);
    if (rejectionTimerRef.current !== null) {
      window.clearTimeout(rejectionTimerRef.current);
    }
    rejectionTimerRef.current = window.setTimeout(() => {
      setRejectedWordId(null);
      rejectionTimerRef.current = null;
    }, 420);
  };

  const placeWord = (
    wordId: WordId,
    sentenceIndex = activeSentenceIndex,
    slot = activeSlot,
  ) => {
    if (!run || run.phase !== "battle") return;
    const word = VOCABULARY_BY_ID[wordId];
    const sentence = run.strategies[sentenceIndex];
    if (!word || !sentence) return;
    if (!wordFitsSlot(word, slot)) {
      rejectWordPlacement(
        word.id,
        `「${word.label}」は「${SENTENCE_SLOT_LABELS[slot]}」には置けません。`,
      );
      return;
    }
    const nextSentence = setSentenceSlot(sentence, slot, word.id);
    const next = run.strategies.map((item, index) =>
      index === sentenceIndex ? nextSentence : item,
    );
    if (
      countUsedVocabularySlots(next) > Object.keys(run.inventory).length
    ) {
      rejectWordPlacement(
        word.id,
        "語彙の残り回数がありません。不要な語彙を戻すか、完成した作戦を実行してください。",
      );
      return;
    }
    updateStrategies(next);
    const nextValidations = validatePlan(next, run.inventory);
    const sentenceValidation = nextValidations[sentenceIndex];
    const sentenceIsReady = sentenceValidation?.valid ?? false;
    const nextIncompleteSentenceIndex = sentenceIsReady
      ? nextValidations.findIndex((validation) => !validation.valid)
      : sentenceIndex;
    const nextActiveSentenceIndex =
      nextIncompleteSentenceIndex >= 0
        ? nextIncompleteSentenceIndex
        : sentenceIndex;
    const nextActiveSentence = next[nextActiveSentenceIndex];
    const nextSlot =
      nextValidations[nextActiveSentenceIndex]?.missingSlot ??
      (nextActiveSentence
        ? getNextEmptySlot(nextActiveSentence)
        : "condition");
    const nextPlanIsReady = nextValidations.every(
      (validation) => validation.valid,
    );
    setActiveSentenceIndex(nextActiveSentenceIndex);
    setActiveSlot(nextSlot);
    setIsLexiconOpen(true);
    if (nextPlanIsReady) {
      window.requestAnimationFrame(() => executeButtonRef.current?.focus());
    } else {
      setLexiconFocusRequestId((current) => current + 1);
    }
    setPlacementTarget({
      sentenceIndex,
      slot,
    });
    if (placementTimerRef.current !== null) {
      window.clearTimeout(placementTimerRef.current);
    }
    placementTimerRef.current = window.setTimeout(() => {
      setPlacementTarget(null);
      placementTimerRef.current = null;
    }, 460);
    setNotice(
      sentenceIsReady
        ? nextPlanIsReady
          ? `第${sentenceIndex + 1}文が完成。作戦を実行できます。`
          : `第${sentenceIndex + 1}文が完成。次の未完成スロットへ移動しました。`
        : `「${word.label}」を第${sentenceIndex + 1}文へ刷りました。`,
    );
  };

  const beginWordDrag = (event: DragEvent<HTMLButtonElement>, wordId: WordId) => {
    if (!run || run.phase !== "battle") {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-kotoba-word", wordId);
    event.dataTransfer.setData("text/plain", wordId);
    setDraggedWordId(wordId);
  };

  const dropWord = (
    event: DragEvent<HTMLButtonElement>,
    sentenceIndex: number,
    slot: SentenceSlot,
  ) => {
    event.preventDefault();
    const wordId =
      event.dataTransfer.getData("application/x-kotoba-word") ||
      event.dataTransfer.getData("text/plain");
    setDraggedWordId(null);
    if (!wordId || !VOCABULARY_BY_ID[wordId]) return;
    placeWord(wordId, sentenceIndex, slot);
  };

  const clearModifier = () => {
    if (!run) return;
    const sentence = run.strategies[activeSentenceIndex];
    if (!sentence) return;
    updateStrategies(
      run.strategies.map((item, index) =>
        index === activeSentenceIndex
          ? setSentenceSlot(sentence, "modifier", null)
          : item,
      ),
    );
  };

  const undoStrategyEdit = () => {
    const previousStrategies = strategyHistory.at(-1);
    if (!run || run.phase !== "battle" || !previousStrategies) return;

    const nextSentenceIndex = Math.max(
      0,
      Math.min(activeSentenceIndex, previousStrategies.length - 1),
    );
    const nextSentence = previousStrategies[nextSentenceIndex];
    const nextValidation = validatePlan(
      previousStrategies,
      run.inventory,
    )[nextSentenceIndex];
    updateStrategies(previousStrategies, false);
    setStrategyHistory((current) => current.slice(0, -1));
    setActiveSentenceIndex(nextSentenceIndex);
    setActiveSlot(
      nextValidation?.missingSlot ??
        (nextSentence ? getNextEmptySlot(nextSentence) : "condition"),
    );
    setIsLexiconOpen(true);
    setNotice("直前の作戦編集を取り消しました。");
  };

  const exchangeHand = () => {
    if (!run || run.phase !== "battle" || !isLexiconOpen) return;
    setIsLexiconOpen(false);
    if (exchangeTimerRef.current !== null) {
      window.clearTimeout(exchangeTimerRef.current);
    }
    exchangeTimerRef.current = window.setTimeout(() => {
      setHandCycle((current) => current + 1);
      setIsLexiconOpen(true);
      setLexiconFocusRequestId((current) => current + 1);
      exchangeTimerRef.current = null;
    }, 180);
  };

  const addSentence = () => {
    if (!run || run.strategies.length >= 3) return;
    const nextIndex = run.strategies.length;
    updateStrategies([...run.strategies, createStrategySentence(nextIndex)]);
    setActiveSentenceIndex(nextIndex);
    setActiveSlot("condition");
    setIsLexiconOpen(true);
  };

  const removeSentence = (sentenceIndex: number) => {
    if (!run || run.strategies.length <= 1) return;
    const next = run.strategies
      .filter((_, index) => index !== sentenceIndex)
      .map((sentence, index) => ({
        ...sentence,
        id: `strategy-${index + 1}`,
      }));
    const nextSentenceIndex = Math.max(
      0,
      Math.min(activeSentenceIndex, next.length - 1),
    );
    const nextSentence = next[nextSentenceIndex];
    const nextValidation = validatePlan(next, run.inventory)[nextSentenceIndex];
    updateStrategies(next);
    setActiveSentenceIndex(nextSentenceIndex);
    setActiveSlot(
      nextValidation?.missingSlot ??
        (nextSentence ? getNextEmptySlot(nextSentence) : "condition"),
    );
    setIsLexiconOpen(true);
  };

  const executePlan = () => {
    if (!run || run.phase !== "battle" || isResolving || !planReady) return;
    const nextRun = executeRunBattle(run);
    setIsResolving(true);
<<<<<<< HEAD
    setStrategyHistory([]);
    setRun(nextRun);
    if (nextRun.lastResolution?.valid) {
      setActiveSentenceIndex(0);
      setActiveSlot("condition");
      setIsLexiconOpen(true);
      if (nextRun.phase === "battle") {
        setLexiconFocusRequestId((current) => current + 1);
        setNotice("作戦を実行しました。行動回数と語彙が回復しました。");
      }
    }
=======

    // 攻撃コードと選択されたルール（作戦文の履歴）をローカルデータベースに保存する
    const currentUser = auth.currentUser;
    if (currentUser) {
      const code = run.strategies.map((sentence) => formatSentence(sentence)).join("\n");
      const stageId = run.battleIndex + 1;
      
      // バックエンドAPIを介してSQLiteへ攻撃コードおよび履歴を保存
      void saveStageCode(currentUser.uid, stageId, code, run.strategies);
      void saveUserProgress(currentUser.uid, stageId);
    }

    setRun(executeRunBattle(run));
>>>>>>> f6a531c8fe4646590ddc75941dc6b28a9d18cc94
    executionTimerRef.current = window.setTimeout(() => {
      setIsResolving(false);
      executionTimerRef.current = null;
    }, 780);
  };

  const chooseReward = (wordId: WordId) => {
    if (!run) return;
    const label = VOCABULARY_BY_ID[wordId]?.label ?? wordId;
    setRun(chooseRunReward(run, wordId));
    setNotice(`「${label}」を獲得。次の敵へ進みます。`);
    setActiveSentenceIndex(0);
    setActiveSlot("condition");
    setIsLexiconOpen(true);
    setHandCycle(0);
    setStrategyHistory([]);
  };

  const retry = (sameSeed: boolean) => {
    if (!run) return;
    const nextSeed = sameSeed
      ? run.seed
      : `KOTOBA-${Math.floor(Date.now() / 1000).toString(36).toUpperCase()}`;
    const next = retryWordQuestRun(run, nextSeed);
    setRun(next);
    setSeed(next.seed);
    setActiveSentenceIndex(0);
    setActiveSlot("condition");
    setIsLexiconOpen(true);
    setHandCycle(0);
    setStrategyHistory([]);
    setNotice(sameSeed ? "同じ並びで再挑戦します。" : "新しい並びで冒険を始めます。");
  };

  if (!run || !enemy) {
    return (
      <main className="word-quest-start">
        <section className="word-title-spread" aria-labelledby="word-title">
          <div className="word-title-spread__left" aria-hidden="true">
            <span className="word-title-spread__drop">言</span>
            <p>拾った語は、まだ物語ではない。</p>
            <p>並べ、つなぎ、短い因果へ刷り直せ。</p>
          </div>
          <div className="word-title-spread__right">
            <p className="word-title-spread__kicker">ことばクエスト・語彙遠征</p>
            <h1 id="word-title">
              言葉を拾い、<br />因果を組む
            </h1>
            <p>
              敵の記述を読み、限られた語彙から最大三つの作戦文を組みます。
              相性のよい語は、長い因果を少ない文へ縮めます。
            </p>
            <label>
              <span>この遠征の頁番号</span>
              <input
                value={seed}
                onChange={(event) => setSeed(event.currentTarget.value)}
                maxLength={32}
              />
            </label>
            <div className="word-title-spread__actions">
              <button
                type="button"
                className="word-start-seal"
                onClick={startRun}
              >
                <span aria-hidden="true">開</span>
                <small>冒険を始める</small>
              </button>
              {onExit && (
                <button
                  type="button"
                  className="word-title-spread__return"
                  onClick={onExit}
                >
                  タイトルへ戻る
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  const panelStyle = { "--enemy-accent": enemy.accent } as CSSProperties;
  const activeSentence = run.strategies[activeSentenceIndex];
  const activeValidation = validations[activeSentenceIndex];
  const activeCategory = categoryForSlot(activeSlot);
  const usedActionCount = Math.min(
    BASE_ACTION_SLOTS,
    run.strategies.filter((sentence) => Boolean(sentence.action)).length,
  );
  const remainingActionCount = BASE_ACTION_SLOTS - usedActionCount;
  const bonusActionCount = strategySynergy?.savedSentenceCount ?? 0;
  const availableVocabularyCount = Object.keys(run.inventory).length;
  const usedVocabularyCount = countUsedVocabularySlots(run.strategies);
  const remainingVocabularyCount = Math.max(
    0,
    availableVocabularyCount - usedVocabularyCount,
  );

  return (
    <main
      className={[
        "word-quest-run",
        "word-game",
        "word-game--contextual-tray",
        "word-game--stage-split",
        isResolving ? "is-resolving" : "",
        isLexiconOpen ? "is-lexicon-open" : "is-lexicon-collapsed",
        planReady ? "is-plan-ready" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={panelStyle}
    >
      {onExit && (
        <BattleSettingsMenu
          isBattleBusy={isResolving}
          restartLabel="冒険を最初からやり直す"
          restartDescription="同じ頁番号で最初から始めます"
          busyMessage="作戦の解決が終わるまで、やり直しとタイトルへの移動はできません。"
          onRestart={startRun}
          onReturnToTitle={onExit}
        />
      )}
      <section className="word-game__scene" aria-label={`${enemy.name}との戦場`}>
        <LiveBattlefield
          label={`${enemy.name}と主人公が対峙する戦場`}
          commandStage
        />
        <div className="word-game__print-veil" aria-hidden="true" />
        <div className="word-game__book-gutter" aria-hidden="true" />

        <header className="word-game__masthead">
          <div className="word-game__turn">
            <span>{enemy.epithet}</span>
            <strong>手番 {run.currentBattle.turn}</strong>
          </div>
        </header>

        <ol className="word-game__chapters" aria-label="冒険の進行">
          {run.encounterOrder.map((enemyId, index) => (
            <li
              key={enemyId}
              aria-current={index === run.battleIndex ? "step" : undefined}
              className={
                index < run.battleIndex
                  ? "is-cleared"
                  : index === run.battleIndex
                    ? "is-current"
                    : ""
              }
            >
              <span>{index + 1}</span>
              <small>{getEnemy(enemyId).isBoss ? "終" : "章"}</small>
            </li>
          ))}
        </ol>

        {notice && (
          <p className="word-game__notice" role="status">
            {notice}
          </p>
        )}

        <PlayerVitalBar
          side="player"
          name="旅人"
          current={run.player.hp}
          max={run.player.maxHp}
          portraitFrameUrl={lottaFrameUrl}
          statuses={run.player.statuses.map((status) => ({
            id: status,
            label: PLAYER_STATUS_LABELS[status],
            mark: PLAYER_STATUS_MARKS[status],
          }))}
        />

        <EnemyVitalBar
          name={enemy.name}
          current={run.currentBattle.enemyHp}
          max={enemy.maxHp}
          statuses={run.currentBattle.enemyStatuses.map((status) => ({
            id: status,
            label: STATUS_LABELS[status],
            mark: STATUS_MARKS[status],
          }))}
        />

        <div className="word-game__stage-marks">
          <span>敵威力 {run.currentBattle.enemyPower}</span>
          <span>発見点 {run.totalScore}</span>
          <span>語彙 {Object.keys(run.inventory).length}語</span>
        </div>

        <aside className="word-game__enemy-dossier" aria-labelledby="word-enemy-title">
          <p className="word-game__eyebrow">ENEMY / 読解記録</p>
          <div className="word-game__enemy-heading">
            <span aria-hidden="true">{enemy.icon}</span>
            <div>
              <h1 id="word-enemy-title">{enemy.name}</h1>
              <small>{enemy.epithet}</small>
            </div>
          </div>
          <div className="word-game__clue">
            <span>攻略の手掛かり</span>
            <blockquote>{enemy.readingClue}</blockquote>
          </div>
          <details className="word-game__enemy-details">
            <summary>敵の記述をひらく</summary>
            <p>{enemy.description}</p>
            <div className="word-game__hints" aria-label="読み筋">
              {enemy.solutionHints.map((hint) => (
                <p key={hint.id}>
                  <strong>{hint.label}</strong>
                  <span>{hint.description}</span>
                </p>
              ))}
            </div>
          </details>
        </aside>
      </section>

      <section
        className="word-game__combat-band strategy-dock"
        aria-labelledby="word-strategy-title"
      >
        <section className="strategy-dock__editor">
          <h2 id="word-strategy-title" className="strategy-dock__sr-only">
            作戦文
          </h2>

          {activeSentence && (
            <article
              className={`strategy-dock__sentence ${
                activeValidation?.valid ? "is-valid" : "is-invalid"
              }`}
              aria-label={`第${activeSentenceIndex + 1}文の編集`}
            >
              <div className="strategy-dock__slots">
                {SLOT_ORDER.map((slot) => {
                  const wordId = sentenceWordId(activeSentence, slot);
                  const word = wordId ? VOCABULARY_BY_ID[wordId] : null;
                  const category = categoryForSlot(slot);
                  const categoryMeta = CATEGORY_META[category];
                  const insight = strategySynergy?.sentences[activeSentenceIndex];
                  const isSynergyNode =
                    insight?.highlightedSlots.includes(slot) ?? false;
                  const isSettling =
                    placementTarget?.sentenceIndex === activeSentenceIndex &&
                    placementTarget.slot === slot;
                  const slotIssue =
                    !activeValidation?.valid &&
                    activeValidation?.missingSlot === slot
                      ? activeValidation.issue
                      : null;
                  const issueLabel = slotIssue
                    ? word
                      ? slotIssue
                      : SLOT_ERROR_LABELS[slot]
                    : null;
                  const errorId = `strategy-slot-error-${activeSentenceIndex}-${slot}`;

                  return (
                    <button
                      key={slot}
                      type="button"
                      className={[
                        "strategy-dock__slot",
                        activeSlot === slot ? "is-selected" : "",
                        `is-${category}`,
                        word ? "has-word" : "is-empty",
                        issueLabel ? "is-missing" : "",
                        isSynergyNode ? "is-synergy-node" : "",
                        isSettling ? "is-settling" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => selectSlot(activeSentenceIndex, slot)}
                      aria-pressed={activeSlot === slot}
                      aria-invalid={Boolean(issueLabel)}
                      aria-describedby={issueLabel ? errorId : undefined}
                      aria-label={`${categoryMeta.label}・${
                        SENTENCE_SLOT_LABELS[slot]
                      }：${word?.label ?? EMPTY_SLOT_LABELS[slot]}`}
                      title={issueLabel ?? `${categoryMeta.prompt}（${categoryMeta.shapeLabel}）`}
                      onDragOver={(event) => {
                        event.preventDefault();
                        const draggedWord = draggedWordId
                          ? VOCABULARY_BY_ID[draggedWordId]
                          : null;
                        event.dataTransfer.dropEffect =
                          draggedWord && wordFitsSlot(draggedWord, slot)
                            ? "copy"
                            : "none";
                      }}
                      onDrop={(event) =>
                        dropWord(event, activeSentenceIndex, slot)
                      }
                      disabled={run.phase !== "battle"}
                    >
                      <span className="strategy-dock__slot-mark" aria-hidden="true">
                        {categoryMeta.mark}
                      </span>
                      <span className="strategy-dock__slot-copy">
                        <strong>{word?.label ?? EMPTY_SLOT_LABELS[slot]}</strong>
                        {issueLabel && (
                          <small id={errorId} title={slotIssue ?? undefined}>
                            {issueLabel}
                          </small>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {run.strategies.length > 1 && (
                <button
                  type="button"
                  className="strategy-dock__remove-sentence"
                  onClick={() => removeSentence(activeSentenceIndex)}
                  aria-label={`第${activeSentenceIndex + 1}文を削除`}
                  title="この文を削除"
                >
                  文削除
                </button>
              )}
            </article>
          )}
        </section>

        <LexiconDrawer
          activeCategory={activeCategory}
          activeSentenceIndex={activeSentenceIndex}
          activeSlot={activeSlot}
          draggedWordId={draggedWordId}
          handCycle={handCycle}
          isOpen={isLexiconOpen}
          focusRequestId={lexiconFocusRequestId}
          ownedWords={ownedWords}
          phase={run.phase}
          rejectedWordId={rejectedWordId}
          onBeginWordDrag={beginWordDrag}
          onEndWordDrag={() => setDraggedWordId(null)}
          onPlaceWord={placeWord}
        />

        <aside className="strategy-dock__command-panel" aria-label="作戦操作">
          <nav className="strategy-dock__sentence-nav" aria-label="作戦文の操作">
            {run.strategies.length > 1 &&
              run.strategies.map((sentence, sentenceIndex) => {
                const selected = sentenceIndex === activeSentenceIndex;
                const valid = validations[sentenceIndex]?.valid ?? false;
                return (
                  <button
                    key={sentence.id}
                    type="button"
                    className={[
                      "strategy-dock__sentence-number",
                      selected ? "is-active" : "",
                      valid ? "is-valid" : "is-incomplete",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => selectSentence(sentenceIndex)}
                    aria-current={selected ? "step" : undefined}
                    aria-label={`作戦文${sentenceIndex + 1}を編集`}
                    title={formatSentence(sentence)}
                  >
                    {sentenceIndex + 1}
                  </button>
                );
              })}
            <button
              type="button"
              className="strategy-dock__add-sentence"
              onClick={addSentence}
              disabled={run.strategies.length >= 3 || run.phase !== "battle"}
              aria-label="作戦文を追加"
              title="作戦文を追加"
            >
              <span aria-hidden="true">＋</span>
              <small>文追加</small>
            </button>
          </nav>

          <div className="strategy-dock__command-status">
            <div className="strategy-dock__metric strategy-dock__metric--actions">
              <span>行動</span>
              <span
                className="strategy-dock__action-gems"
                aria-label={`残り基本行動 ${remainingActionCount}/${BASE_ACTION_SLOTS}`}
              >
                {Array.from({ length: BASE_ACTION_SLOTS }).map((_, index) => (
                  <i
                    key={index}
                    className={index < remainingActionCount ? "is-available" : ""}
                    aria-hidden="true"
                  >
                    ◆
                  </i>
                ))}
              </span>
              <b>{remainingActionCount}/{BASE_ACTION_SLOTS}</b>
              {bonusActionCount > 0 && (
                <span
                  className="strategy-dock__bonus-actions"
                  aria-label={`追加行動 ${bonusActionCount}`}
                >
                  <small aria-hidden="true">＋</small>
                  {Array.from({ length: bonusActionCount }).map((_, index) => (
                    <i key={index} aria-hidden="true">◆</i>
                  ))}
                </span>
              )}
            </div>

            <div
              className="strategy-dock__metric strategy-dock__metric--words"
              aria-label={`残り語彙 ${remainingVocabularyCount}/${availableVocabularyCount}`}
            >
              <span>語彙</span>
              <b>{remainingVocabularyCount}/{availableVocabularyCount}</b>
            </div>
          </div>

          <div className="strategy-dock__command-tools">
            <button
              type="button"
              className="strategy-dock__undo"
              onClick={undoStrategyEdit}
              disabled={strategyHistory.length === 0 || run.phase !== "battle"}
              aria-label="直前の作戦編集を取り消す"
              title="取り消す"
            >
              <span aria-hidden="true">↶</span>
              <small>戻す</small>
            </button>

            {activeSlot === "modifier" && activeSentence?.modifier && (
              <button
                type="button"
                className="strategy-dock__clear-modifier"
                onClick={clearModifier}
              >
                修飾を外す
              </button>
            )}

            <button
              type="button"
              className="strategy-dock__exchange"
              onClick={exchangeHand}
              disabled={run.phase !== "battle" || !isLexiconOpen}
              aria-label="語彙カードを交換"
              title="語彙カードを交換"
            >
              <img src={commandArrowUrl} alt="" aria-hidden="true" />
              <span>交換</span>
            </button>
          </div>

          <button
            ref={executeButtonRef}
            type="button"
            className={`strategy-dock__execute ${planReady ? "is-ready" : ""}`}
            onClick={executePlan}
            disabled={!planReady || run.phase !== "battle" || isResolving}
            title={planReady ? "完成した作戦を実行" : "未設定の語彙があります"}
          >
            <span>作戦実行</span>
            <small>{planReady ? "実行可能" : "未完成"}</small>
          </button>
        </aside>
      </section>

      <footer className="word-game__folio">
        <span>{run.seed}</span>
        <span>第{run.battleIndex + 1}葉</span>
      </footer>

      {run.phase === "reward" && (
        <div className="word-quest-overlay" role="dialog" aria-modal="true" aria-labelledby="word-reward-title">
          <section className="word-reward-panel">
            <small>戦闘 {run.battleIndex + 1} 突破</small>
            <h2 id="word-reward-title">次へ持っていく語彙を一つ選ぶ</h2>
            <p>新しい語彙は文章の作り方を増やします。重複した語彙はランクが上がります。</p>
            <div>
              {run.rewardChoices.map((wordId) => {
                const word = VOCABULARY_BY_ID[wordId];
                const owned = run.inventory[wordId];
                if (!word) return null;
                return (
                  <button type="button" key={wordId} onClick={() => chooseReward(wordId)}>
                    <span>{WORD_CATEGORY_LABELS[word.category]} / {word.rarity}</span>
                    <strong>{word.label}</strong>
                    <p>{word.tooltip}</p>
                    <small>{owned ? `重複取得：ランク${owned.rank}から強化` : "未所持の語彙"}</small>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {(run.phase === "victory" || run.phase === "defeat") && (
        <div className="word-quest-overlay" role="dialog" aria-modal="true" aria-labelledby="word-result-title">
          <section className="word-result-panel">
            <span className="word-result-panel__seal" aria-hidden="true">
              {run.phase === "victory" ? "完" : "断"}
            </span>
            <small>語彙遠征の記録</small>
            <h2 id="word-result-title">
              {run.phase === "victory" ? "忘名王まで因果が届いた" : "文章の鎖が途中で切れた"}
            </h2>
            <p>
              {run.phase === "victory"
                ? `発見点${run.totalScore}。${Object.keys(run.inventory).length}語で一周を終えました。`
                : `戦闘${run.battleIndex + 1}で敗北。獲得語彙と敵順を変えて再挑戦できます。`}
            </p>
            <ol>
              {run.history.map((record, index) => (
                <li key={`${record.enemyId}-${index}`}>
                  <span>{index + 1}</span>
                  <strong>{getEnemy(record.enemyId).name}</strong>
                  <small>{record.victory ? "突破" : "敗北"} / {record.turns}手</small>
                </li>
              ))}
            </ol>
            {run.discoveries.length > 0 && (
              <p className="word-result-panel__discoveries">
                発見した解法：{run.discoveries.join("、")}
              </p>
            )}
            <div>
              <button type="button" onClick={() => retry(true)}>同じシードで再挑戦</button>
              <button type="button" onClick={() => retry(false)}>新しい敵順で再挑戦</button>
              {onExit && <button type="button" className="is-quiet" onClick={onExit}>タイトルへ戻る</button>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
