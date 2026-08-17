import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from "react";
import {
  AP_MAX,
  SENTENCE_SLOT_LABELS,
  VOCABULARY_BY_ID,
  WORD_CATEGORY_LABELS,
  WORD_QUEST_SAVE_KEY,
  chooseRunReward,
  createWordQuestRun,
  estimatePlanApCost,
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
  type ActionEffectId,
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
import executionButtonUrl from "../../assets/UI/icon/hud/execution.png";
import lottaAttackUrl from "../../assets/characters/battle/チュートリアル/プレイヤー/Lotta_attack.png";
import {
  LiveBattlefield,
  type LiveBattlefieldHandle,
} from "../reading-loop/LiveBattlefield";
import { BattleSettingsMenu } from "../../components/BattleSettingsMenu";
import { LexiconDrawer } from "./LexiconDrawer";
import { analyzeStrategySynergy } from "./strategySynergy";
import { createWordQuestBattleTimeline } from "./wordQuestBattleMotion";
import {
  buildWordQuestBattlePresentation,
  type WordQuestBattleMotionPhase,
  type WordQuestBattlePresentation,
} from "./wordQuestBattlePresentation";
import {
  CATEGORY_META,
  SLOT_ORDER,
  categoryForSlot,
  countUsedVocabularySlots,
} from "./wordQuestUiMeta";
import "./word-quest-run.css";
import "./word-quest-game.css";
import "./word-quest-contextual-tray.css";
import "./word-quest-stage-split.css";
import "./word-quest-strategy-dock.css";
import "./word-quest-battle-motion.css";

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
  sealed: "沈黙",
};

const PLAYER_STATUS_MARKS: Readonly<Record<PlayerStatus, string>> = {
  guarded: "守",
  wounded: "傷",
  attacked: "撃",
  sealed: "封",
};

const BASE_ACTION_SLOTS = 2;

interface CombatPlayback {
  id: number;
  phase: WordQuestBattleMotionPhase;
  presentation: WordQuestBattlePresentation;
  enemyHpAfter: number;
  playerHpAfter: number;
}

const COMBAT_PHASE_ORDER: Readonly<Record<WordQuestBattleMotionPhase, number>> =
  {
    windup: 0,
    strike: 1,
    "enemy-impact": 2,
    counter: 3,
    "player-impact": 4,
    settle: 5,
  };

function phaseReached(
  current: WordQuestBattleMotionPhase,
  target: WordQuestBattleMotionPhase,
): boolean {
  return COMBAT_PHASE_ORDER[current] >= COMBAT_PHASE_ORDER[target];
}

function BattleMotionOverlay({ playback }: { playback: CombatPlayback }) {
  const { presentation } = playback;
  const motionStyle = {
    "--word-enemy-impact-delay": `${presentation.enemyImpactMs ?? presentation.totalMs}ms`,
    "--word-player-impact-delay": `${presentation.playerImpactMs ?? presentation.totalMs}ms`,
    "--word-combat-total": `${presentation.totalMs}ms`,
  } as CSSProperties;
  const statusParts = [
    presentation.hasPlayerStrike
      ? `ロッタの攻撃、敵に${presentation.enemyDamage}ダメージ。`
      : "",
    presentation.hasEnemyStrike
      ? `敵の反撃、旅人に${presentation.playerDamage}ダメージ。`
      : "",
  ].filter(Boolean);

  return (
    <div
      key={playback.id}
      className="word-game__combat-motion"
      data-phase={playback.phase}
      style={motionStyle}
    >
      {presentation.hasPlayerStrike && (
        <>
          <div className="word-game__attack-artwork">
            {[3, 2, 1].map((echoIndex) => (
              <img
                key={echoIndex}
                className="word-game__attack-art word-game__attack-art--echo"
                src={lottaAttackUrl}
                alt=""
                style={{ "--word-echo-index": echoIndex } as CSSProperties}
              />
            ))}
            <img
              className="word-game__attack-art word-game__attack-art--main"
              src={lottaAttackUrl}
              alt=""
            />
          </div>
          <span className="word-game__attack-lane" />
          <span className="word-game__impact-flash" />
          <span className="word-game__impact-bloom" />
          <span className="word-game__impact-sparks">
            {Array.from({ length: 12 }, (_, sparkIndex) => (
              <i
                key={sparkIndex}
                style={{ "--word-spark-index": sparkIndex } as CSSProperties}
              />
            ))}
          </span>
          <strong className="word-game__damage-number word-game__damage-number--enemy">
            -{presentation.enemyDamage}
          </strong>
        </>
      )}

      {presentation.hasEnemyStrike && (
        <>
          <span className="word-game__counter-bloom" />
          <strong className="word-game__damage-number word-game__damage-number--player">
            -{presentation.playerDamage}
          </strong>
        </>
      )}

      {statusParts.length > 0 && (
        <p className="word-game__combat-status" role="status">
          {statusParts.join("")}
        </p>
      )}
    </div>
  );
}

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
    return restoreWordQuestRun(
      window.localStorage.getItem(WORD_QUEST_SAVE_KEY),
    );
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
          <span className="word-game__vitals-meter">
            {current}/{max}
          </span>
        </div>

        <div className="word-game__statuses" aria-label={`${name}の状態効果`}>
          {statuses.map((status) => (
            <span
              key={status.id}
              title={status.label}
              aria-label={status.label}
            >
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
  isDisabled: boolean;
}

function EnemyVitalBar({
  current,
  max,
  name,
  statuses,
  isDisabled,
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

      {isDisabled && (
        <p className="word-game__enemy-disabled" role="status">
          混乱
        </p>
      )}

      {statuses.length > 0 && (
        <div
          className="word-game__enemy-statuses"
          aria-label={`${name}の状態効果`}
        >
          {statuses.map((status) => (
            <span
              key={status.id}
              title={status.label}
              aria-label={status.label}
            >
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
  const battlefieldRef = useRef<LiveBattlefieldHandle>(null);
  const combatTimelineRef = useRef<ReturnType<
    typeof createWordQuestBattleTimeline
  > | null>(null);
  const combatPlaybackIdRef = useRef(0);
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
  const [notice, setNotice] = useState(initialState.notice);
  const [combatPlayback, setCombatPlayback] = useState<CombatPlayback | null>(
    null,
  );

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
      combatTimelineRef.current?.kill();
      combatTimelineRef.current = null;
      battlefieldRef.current?.reset();
      if (placementTimerRef.current !== null) {
        window.clearTimeout(placementTimerRef.current);
      }
      if (rejectionTimerRef.current !== null) {
        window.clearTimeout(rejectionTimerRef.current);
      }
    },
    [],
  );

  const enemy = run ? getEnemy(run.currentBattle.enemyId) : null;
  const validations = useMemo(
    () =>
      run
        ? validatePlan(run.strategies, run.inventory, enemy?.battleOnlyWordIds)
        : [],
    [run, enemy],
  );
  const ownedWords = useMemo(
    () =>
      run
        ? getOwnedWords(run.inventory, undefined, enemy?.battleOnlyWordIds)
        : [],
    [run, enemy],
  );
  const isEchoMoth = run?.currentBattle.enemyId === "echo-moth";
  const isSealedByKing =
    run?.currentBattle.enemyId === "forgotten-king" &&
    run.player.statuses.includes("sealed");
  const blockedActionIds: readonly ActionEffectId[] = useMemo(() => {
    if (isSealedByKing) {
      const ownedActionIds = ownedWords
        .filter((word): word is typeof word & { effect: { kind: "action" } } =>
          word.effect.kind === "action",
        )
        .map((word) => word.effect.action);
      return ownedActionIds.filter((actionId) => actionId !== "call_name");
    }
    if (isEchoMoth && run?.currentBattle.lastPlayerAction) {
      return [run.currentBattle.lastPlayerAction];
    }
    return [];
  }, [isSealedByKing, isEchoMoth, ownedWords, run]);
  const blockedReason = isSealedByKing
    ? "王が沈黙している間は、名を呼ぶ言葉しか届かない。"
    : "同じ言葉を続けて使うと、反響の蛾に読まれてしまう。";
  const strategySynergy = useMemo(
    () => (run ? analyzeStrategySynergy(run.strategies, validations) : null),
    [run, validations],
  );
  const estimatedApCost = useMemo(
    () => (run ? estimatePlanApCost(run.strategies) : 0),
    [run],
  );
  const hasEnoughAp = Boolean(run) && estimatedApCost <= (run?.player.actionPoints ?? 0);
  const planReady =
    Boolean(run) &&
    validations.length > 0 &&
    validations.every((validation) => validation.valid) &&
    hasEnoughAp;

  const startRun = () => {
    combatTimelineRef.current?.kill();
    combatTimelineRef.current = null;
    battlefieldRef.current?.reset();
    if (executionTimerRef.current !== null) {
      window.clearTimeout(executionTimerRef.current);
      executionTimerRef.current = null;
    }
    setCombatPlayback(null);
    setIsResolving(false);
    const next = createWordQuestRun(seed);
    setRun(next);
    setSeed(next.seed);
    setActiveSentenceIndex(0);
    setActiveSlot("condition");
    setIsLexiconOpen(true);
    setNotice("少ない語彙で冒険を始めました。");
  };

  const updateStrategies = (strategies: readonly StrategySentence[]) => {
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
    const availableWordCount =
      Object.keys(run.inventory).length + (enemy?.battleOnlyWordIds.length ?? 0);
    if (countUsedVocabularySlots(next) > availableWordCount) {
      rejectWordPlacement(
        word.id,
        "語彙の残り回数がありません。完成した作戦を実行してください。",
      );
      return;
    }
    updateStrategies(next);
    const nextValidations = validatePlan(
      next,
      run.inventory,
      enemy?.battleOnlyWordIds,
    );
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
      (nextActiveSentence ? getNextEmptySlot(nextActiveSentence) : "condition");
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

  const beginWordDrag = (
    event: DragEvent<HTMLButtonElement>,
    wordId: WordId,
  ) => {
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

  const executePlan = () => {
    if (!run || run.phase !== "battle" || isResolving || !planReady) return;
    const nextRun = executeRunBattle(run);
    const resolution = nextRun.lastResolution;

    if (!resolution?.valid) {
      setRun(nextRun);
      return;
    }

    const presentation = buildWordQuestBattlePresentation({
      enemyHpBefore: run.currentBattle.enemyHp,
      enemyHpAfter: resolution.battle.enemyHp,
      playerHpBefore: run.player.hp,
      playerHpAfter: resolution.player.hp,
      usedActions: resolution.usedActions,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
    });
    const playbackId = combatPlaybackIdRef.current + 1;
    combatPlaybackIdRef.current = playbackId;
    let completed = false;

    const updatePhase = (phase: WordQuestBattleMotionPhase) => {
      setCombatPlayback((current) =>
        current?.id === playbackId ? { ...current, phase } : current,
      );
    };

    const completeResolution = () => {
      if (completed) return;
      completed = true;
      if (executionTimerRef.current !== null) {
        window.clearTimeout(executionTimerRef.current);
        executionTimerRef.current = null;
      }
      combatTimelineRef.current = null;
      setRun(nextRun);
      setCombatPlayback(null);
      setIsResolving(false);
      setActiveSentenceIndex(0);
      setActiveSlot("condition");
      setIsLexiconOpen(true);
      if (nextRun.phase === "battle") {
        setLexiconFocusRequestId((current) => current + 1);
        setNotice("作戦を実行しました。行動回数と語彙が回復しました。");
      }
    };

    setIsResolving(true);
    setCombatPlayback({
      id: playbackId,
      phase: "windup",
      presentation,
      enemyHpAfter: resolution.battle.enemyHp,
      playerHpAfter: resolution.player.hp,
    });

    const battlefield = battlefieldRef.current?.getTargets();
    if (!battlefield) {
      updatePhase(
        presentation.hasPlayerStrike
          ? "enemy-impact"
          : presentation.hasEnemyStrike
            ? "player-impact"
            : "settle",
      );
      executionTimerRef.current = window.setTimeout(
        completeResolution,
        presentation.totalMs,
      );
      return;
    }

    try {
      const timeline = createWordQuestBattleTimeline({
        battlefield,
        presentation,
        onPhase: updatePhase,
        onComplete: completeResolution,
      });
      combatTimelineRef.current = timeline;
      timeline.play(0);
    } catch (error) {
      console.error("戦闘演出の再生に失敗:", error);
      battlefieldRef.current?.reset();
      updatePhase("settle");
      executionTimerRef.current = window.setTimeout(
        completeResolution,
        presentation.reducedMotion ? 100 : 320,
      );
    }
  };

  const chooseReward = (wordId: WordId) => {
    if (!run) return;
    const label = VOCABULARY_BY_ID[wordId]?.label ?? wordId;
    setRun(chooseRunReward(run, wordId));
    setNotice(`「${label}」を獲得。次の敵へ進みます。`);
    setActiveSentenceIndex(0);
    setActiveSlot("condition");
    setIsLexiconOpen(true);
  };

  const retry = (sameSeed: boolean) => {
    if (!run) return;
    const nextSeed = sameSeed
      ? run.seed
      : `KOTOBA-${Math.floor(Date.now() / 1000)
          .toString(36)
          .toUpperCase()}`;
    const next = retryWordQuestRun(run, nextSeed);
    setRun(next);
    setSeed(next.seed);
    setActiveSentenceIndex(0);
    setActiveSlot("condition");
    setIsLexiconOpen(true);
    setNotice(
      sameSeed ? "同じ並びで再挑戦します。" : "新しい並びで冒険を始めます。",
    );
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
            <p className="word-title-spread__kicker">
              ことばクエスト・語彙遠征
            </p>
            <h1 id="word-title">
              言葉を拾い、
              <br />
              因果を組む
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
  const displayedEnemyHp =
    combatPlayback?.presentation.hasPlayerStrike &&
    phaseReached(combatPlayback.phase, "enemy-impact")
      ? combatPlayback.enemyHpAfter
      : run.currentBattle.enemyHp;
  const displayedPlayerHp =
    combatPlayback?.presentation.hasEnemyStrike &&
    phaseReached(combatPlayback.phase, "player-impact")
      ? combatPlayback.playerHpAfter
      : run.player.hp;

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
      aria-busy={isResolving}
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
      <section
        className="word-game__scene"
        aria-label={`${enemy.name}との戦場`}
      >
        <LiveBattlefield
          ref={battlefieldRef}
          label={`${enemy.name}と主人公が対峙する戦場`}
          commandStage
        />
        {combatPlayback && <BattleMotionOverlay playback={combatPlayback} />}
        <div className="word-game__print-veil" aria-hidden="true" />
        <div className="word-game__book-gutter" aria-hidden="true" />

        <header className="word-game__masthead">
          <div className="word-game__turn">
            <span>{enemy.epithet}</span>
            <strong>手番 {run.currentBattle.turn}</strong>
            <div
              className="word-game__ap"
              role="meter"
              aria-label="行動値"
              aria-valuemin={0}
              aria-valuemax={AP_MAX}
              aria-valuenow={run.player.actionPoints}
            >
              <span>AP</span>
              <span className="word-game__ap-pips" aria-hidden="true">
                {Array.from({ length: AP_MAX }).map((_, index) => {
                  const isFilled = index < run.player.actionPoints;
                  const consumedCount = Math.min(
                    estimatedApCost,
                    run.player.actionPoints,
                  );
                  const isConsuming =
                    isFilled && index >= run.player.actionPoints - consumedCount;
                  return (
                    <i
                      key={index}
                      className={[
                        isFilled ? "is-filled" : "",
                        isConsuming ? "is-consuming" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                  );
                })}
              </span>
              <b>{run.player.actionPoints}/{AP_MAX}</b>
            </div>
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
          current={displayedPlayerHp}
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
          current={displayedEnemyHp}
          max={enemy.maxHp}
          statuses={run.currentBattle.enemyStatuses.map((status) => ({
            id: status,
            label: STATUS_LABELS[status],
            mark: STATUS_MARKS[status],
          }))}
          isDisabled={run.currentBattle.enemyStatuses.includes("stopped")}
        />

        <div className="word-game__stage-marks">
          <span>敵威力 {run.currentBattle.enemyPower}</span>
          <span>発見点 {run.totalScore}</span>
          <span>語彙 {Object.keys(run.inventory).length}語</span>
          {run.currentBattle.emberStacks > 0 && (
            <span
              className="word-game__ember-stacks"
              role="status"
              aria-label={`炎上${run.currentBattle.emberStacks}スタック`}
              title="毎手番、炎上スタックに応じたダメージを受ける。「冷ます」で鎮められる。"
            >
              炎上 {run.currentBattle.emberStacks}
            </span>
          )}
        </div>

        <aside
          className="word-game__enemy-dossier"
          aria-labelledby="word-enemy-title"
        >
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
                  const insight =
                    strategySynergy?.sentences[activeSentenceIndex];
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
                      title={
                        issueLabel ??
                        `${categoryMeta.prompt}（${categoryMeta.shapeLabel}）`
                      }
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
                      <span
                        className="strategy-dock__slot-mark"
                        aria-hidden="true"
                      >
                        {categoryMeta.mark}
                      </span>
                      <span className="strategy-dock__slot-copy">
                        <strong>
                          {word?.label ?? EMPTY_SLOT_LABELS[slot]}
                        </strong>
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
            </article>
          )}
        </section>

        <LexiconDrawer
          activeCategory={activeCategory}
          activeSentenceIndex={activeSentenceIndex}
          activeSlot={activeSlot}
          blockedActionIds={blockedActionIds}
          blockedReason={blockedReason}
          draggedWordId={draggedWordId}
          handCycle={0}
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
          <nav
            className="strategy-dock__sentence-nav"
            aria-label="作戦文の切り替え"
          >
            {run.strategies.map((sentence, sentenceIndex) => {
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
          </nav>

          <div className="strategy-dock__command-tools">
            {activeSlot === "modifier" && activeSentence?.modifier && (
              <button
                type="button"
                className="strategy-dock__clear-modifier"
                onClick={clearModifier}
              >
                修飾を外す
              </button>
            )}
          </div>

          <div
            className={`strategy-dock__execution-cluster ${
              planReady ? "is-ready" : ""
            }`}
          >
            <button
              ref={executeButtonRef}
              type="button"
              className="strategy-dock__execute"
              onClick={executePlan}
              disabled={!planReady || run.phase !== "battle" || isResolving}
              aria-label="作戦を実行"
              title={
                planReady
                  ? "完成した作戦を実行"
                  : !hasEnoughAp
                    ? `行動値が足りません（必要${estimatedApCost}、残り${run.player.actionPoints}）。`
                    : "未設定の語彙があります"
              }
            >
              <span className="strategy-dock__sr-only">作戦を実行</span>
            </button>

            <img
              className="strategy-dock__execution-art"
              src={executionButtonUrl}
              alt=""
              aria-hidden="true"
            />

            <div
              className="strategy-dock__turn-meter"
              role="meter"
              aria-label="残りターン数"
              aria-valuemin={0}
              aria-valuemax={BASE_ACTION_SLOTS}
              aria-valuenow={remainingActionCount}
              aria-valuetext={`残りターン ${remainingActionCount}/${BASE_ACTION_SLOTS}${
                bonusActionCount > 0 ? `、追加ターン ${bonusActionCount}` : ""
              }`}
            >
              <span className="strategy-dock__turn-count" aria-hidden="true">
                <small>TURN</small>
                <strong>
                  {remainingActionCount}
                  <b>/{BASE_ACTION_SLOTS}</b>
                </strong>
                {bonusActionCount > 0 && <em>+{bonusActionCount}</em>}
              </span>
            </div>
          </div>
        </aside>
      </section>

      <footer className="word-game__folio">
        <span>{run.seed}</span>
        <span>第{run.battleIndex + 1}葉</span>
      </footer>

      {run.phase === "reward" && (
        <div
          className="word-quest-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="word-reward-title"
        >
          <section className="word-reward-panel">
            <small>戦闘 {run.battleIndex + 1} 突破</small>
            <h2 id="word-reward-title">次へ持っていく語彙を一つ選ぶ</h2>
            <p>
              新しい語彙は文章の作り方を増やします。重複した語彙はランクが上がります。
            </p>
            <div>
              {run.rewardChoices.map((wordId) => {
                const word = VOCABULARY_BY_ID[wordId];
                const owned = run.inventory[wordId];
                if (!word) return null;
                return (
                  <button
                    type="button"
                    key={wordId}
                    onClick={() => chooseReward(wordId)}
                  >
                    <span>
                      {WORD_CATEGORY_LABELS[word.category]} / {word.rarity}
                    </span>
                    <strong>{word.label}</strong>
                    <p>{word.tooltip}</p>
                    <small>
                      {owned
                        ? `重複取得：ランク${owned.rank}から強化`
                        : "未所持の語彙"}
                    </small>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {(run.phase === "victory" || run.phase === "defeat") && (
        <div
          className="word-quest-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="word-result-title"
        >
          <section className="word-result-panel">
            <span className="word-result-panel__seal" aria-hidden="true">
              {run.phase === "victory" ? "完" : "断"}
            </span>
            <small>語彙遠征の記録</small>
            <h2 id="word-result-title">
              {run.phase === "victory"
                ? "忘名王まで因果が届いた"
                : "文章の鎖が途中で切れた"}
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
                  <small>
                    {record.victory ? "突破" : "敗北"} / {record.turns}手
                  </small>
                </li>
              ))}
            </ol>
            {run.discoveries.length > 0 && (
              <p className="word-result-panel__discoveries">
                発見した解法：{run.discoveries.join("、")}
              </p>
            )}
            <div>
              <button type="button" onClick={() => retry(true)}>
                同じシードで再挑戦
              </button>
              <button type="button" onClick={() => retry(false)}>
                新しい敵順で再挑戦
              </button>
              {onExit && (
                <button type="button" className="is-quiet" onClick={onExit}>
                  タイトルへ戻る
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
