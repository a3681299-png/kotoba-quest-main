import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
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
  getSentenceRulePreview,
  restoreWordQuestRun,
  retryWordQuestRun,
  serializeWordQuestRun,
  setSentenceSlot,
  updateRunStrategies,
  validatePlan,
  wordFitsSlot,
  type CausalLogKind,
  type EnemyStatus,
  type SentenceSlot,
  type StrategySentence,
  type WordCategory,
  type WordId,
  type WordQuestRunState,
} from "../../wordQuest";
import { LiveBattlefield } from "../reading-loop/LiveBattlefield";
import "./word-quest-run.css";

interface WordQuestRunScreenProps {
  onExit?: () => void;
}

const SLOT_ORDER: readonly SentenceSlot[] = [
  "subject",
  "condition",
  "connector",
  "action",
  "target",
  "modifier",
];

const CATEGORY_ORDER: readonly WordCategory[] = [
  "subject",
  "condition",
  "connector",
  "action",
  "modifier",
];

const STATUS_LABELS: Readonly<Record<EnemyStatus, string>> = {
  enraged: "怒り",
  watching: "視線",
  illuminated: "照明",
  named: "真名",
  stopped: "停止",
  bound: "拘束",
  exposed: "露出",
};

const LOG_MARKS: Readonly<Record<CausalLogKind, string>> = {
  condition: "条",
  action: "動",
  reaction: "応",
  enemy: "敵",
  success: "成",
  failure: "断",
  grammar: "文",
};

function categoryForSlot(slot: SentenceSlot): WordCategory {
  return slot === "target" ? "subject" : slot;
}

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

function sentenceWordId(
  sentence: StrategySentence,
  slot: SentenceSlot,
): WordId | null {
  return sentence[slot];
}

export function WordQuestRunScreen({ onExit }: WordQuestRunScreenProps) {
  const [initialState] = useState(() => {
    const saved = loadSavedRun();
    return {
      saved,
      seed: saved?.seed ?? "KOTOBA-001",
      notice: saved ? "保存した冒険を再開しました。" : "",
    };
  });
  const executionTimerRef = useRef<number | null>(null);
  const [run, setRun] = useState<WordQuestRunState | null>(initialState.saved);
  const [seed, setSeed] = useState(initialState.seed);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(0);
  const [activeSlot, setActiveSlot] = useState<SentenceSlot>("condition");
  const [activeCategory, setActiveCategory] =
    useState<WordCategory>("condition");
  const [isResolving, setIsResolving] = useState(false);
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
    },
    [],
  );

  const enemy = run ? getEnemy(run.currentBattle.enemyId) : null;
  const validations = useMemo(
    () => (run ? validatePlan(run.strategies, run.inventory) : []),
    [run],
  );
  const ownedWords = useMemo(
    () => (run ? getOwnedWords(run.inventory, activeCategory) : []),
    [activeCategory, run],
  );

  const startRun = () => {
    const next = createWordQuestRun(seed);
    setRun(next);
    setSeed(next.seed);
    setActiveSentenceIndex(0);
    setActiveSlot("condition");
    setActiveCategory("condition");
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
    setActiveCategory(categoryForSlot(slot));
  };

  const placeWord = (wordId: WordId) => {
    if (!run || run.phase !== "battle") return;
    const word = VOCABULARY_BY_ID[wordId];
    const sentence = run.strategies[activeSentenceIndex];
    if (!word || !sentence) return;
    const targetSlot = wordFitsSlot(word, activeSlot)
      ? activeSlot
      : word.allowedSlots.find((slot) => wordFitsSlot(word, slot));
    if (!targetSlot) {
      setNotice(`「${word.label}」を置ける場所を選んでください。`);
      return;
    }
    const nextSentence = setSentenceSlot(sentence, targetSlot, word.id);
    const next = run.strategies.map((item, index) =>
      index === activeSentenceIndex ? nextSentence : item,
    );
    updateStrategies(next);
    const nextSlot = getNextEmptySlot(nextSentence);
    setActiveSlot(nextSlot);
    setActiveCategory(categoryForSlot(nextSlot));
    setNotice(`「${word.label}」を作戦文${activeSentenceIndex + 1}へ置きました。`);
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

  const addSentence = () => {
    if (!run || run.strategies.length >= 3) return;
    const nextIndex = run.strategies.length;
    updateStrategies([...run.strategies, createStrategySentence(nextIndex)]);
    setActiveSentenceIndex(nextIndex);
    setActiveSlot("condition");
    setActiveCategory("condition");
  };

  const removeSentence = (sentenceIndex: number) => {
    if (!run || run.strategies.length <= 1) return;
    const next = run.strategies
      .filter((_, index) => index !== sentenceIndex)
      .map((sentence, index) => ({
        ...sentence,
        id: `strategy-${index + 1}`,
      }));
    updateStrategies(next);
    setActiveSentenceIndex(Math.max(0, Math.min(activeSentenceIndex, next.length - 1)));
  };

  const executePlan = () => {
    if (!run || run.phase !== "battle" || isResolving) return;
    setIsResolving(true);
    setRun(executeRunBattle(run));
    executionTimerRef.current = window.setTimeout(() => {
      setIsResolving(false);
      executionTimerRef.current = null;
    }, 520);
  };

  const chooseReward = (wordId: WordId) => {
    if (!run) return;
    const label = VOCABULARY_BY_ID[wordId]?.label ?? wordId;
    setRun(chooseRunReward(run, wordId));
    setNotice(`「${label}」を獲得。次の敵へ進みます。`);
    setActiveSentenceIndex(0);
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
    setActiveCategory("condition");
    setNotice(sameSeed ? "同じ並びで再挑戦します。" : "新しい並びで冒険を始めます。");
  };

  if (!run || !enemy) {
    return (
      <main className="word-quest-start">
        <div className="word-quest-start__panel">
          <span className="word-quest-start__seal" aria-hidden="true">言</span>
          <p>ことばクエスト・語彙遠征</p>
          <h1>言葉を拾い、因果を組む</h1>
          <p>
            四つの戦いを一つの語彙袋で進みます。敵の文章を読み、作戦文を最大三つまでつないでください。
          </p>
          <label>
            乱数シード
            <input
              value={seed}
              onChange={(event) => setSeed(event.currentTarget.value)}
              maxLength={32}
            />
          </label>
          <button type="button" onClick={startRun}>冒険を始める</button>
          {onExit && (
            <button type="button" className="is-quiet" onClick={onExit}>
              元の冒険へ戻る
            </button>
          )}
        </div>
      </main>
    );
  }

  const panelStyle = { "--enemy-accent": enemy.accent } as CSSProperties;
  const activeSentence = run.strategies[activeSentenceIndex];
  const activeValidation = validations[activeSentenceIndex];
  const logs = run.lastResolution?.logs ?? [];

  return (
    <main
      className={`word-quest-run ${isResolving ? "is-resolving" : ""}`}
      style={panelStyle}
    >
      <header className="word-quest-run__header">
        <div className="word-quest-run__brand">
          <span aria-hidden="true">言</span>
          <div>
            <strong>ことばクエスト</strong>
            <small>語彙遠征 / seed {run.seed}</small>
          </div>
        </div>
        <ol className="word-quest-progress" aria-label="冒険の進行">
          {run.encounterOrder.map((enemyId, index) => (
            <li
              key={enemyId}
              className={
                index < run.battleIndex
                  ? "is-cleared"
                  : index === run.battleIndex
                    ? "is-current"
                    : ""
              }
            >
              <span>{index + 1}</span>
              {getEnemy(enemyId).isBoss ? "ボス" : "戦闘"}
            </li>
          ))}
        </ol>
        <div className="word-quest-run__stats">
          <span>HP <strong>{run.player.hp}/{run.player.maxHp}</strong></span>
          <span>語彙 <strong>{Object.keys(run.inventory).length}</strong></span>
          <span>発見点 <strong>{run.totalScore}</strong></span>
        </div>
        {onExit && (
          <button type="button" className="word-quest-run__exit" onClick={onExit}>
            元の冒険へ
          </button>
        )}
      </header>

      {notice && <p className="word-quest-notice" role="status">{notice}</p>}

      <div className="word-quest-top-grid">
        <aside className="word-enemy-dossier" aria-labelledby="word-enemy-title">
          <div className="word-enemy-dossier__title">
            <span aria-hidden="true">{enemy.icon}</span>
            <div>
              <small>{enemy.epithet}</small>
              <h1 id="word-enemy-title">{enemy.name}</h1>
            </div>
          </div>
          <p>{enemy.description}</p>
          <blockquote>{enemy.readingClue}</blockquote>
          <details>
            <summary>読み筋を確認</summary>
            {enemy.solutionHints.map((hint) => (
              <p key={hint.id}>
                <strong>{hint.label}</strong>
                <span>{hint.description}</span>
              </p>
            ))}
          </details>
        </aside>

        <section className="word-quest-arena" aria-label={`${enemy.name}との戦場`}>
          <LiveBattlefield label={`${enemy.name}と主人公が対峙する戦場`} />
          <div className="word-quest-arena__hud">
            <div className="word-hp word-hp--player">
              <span>旅人</span>
              <i><b style={{ width: `${hpPercent(run.player.hp, run.player.maxHp)}%` }} /></i>
              <strong>{run.player.hp}</strong>
            </div>
            <div className="word-hp word-hp--enemy">
              <span>{enemy.name}</span>
              <i><b style={{ width: `${hpPercent(run.currentBattle.enemyHp, enemy.maxHp)}%` }} /></i>
              <strong>{run.currentBattle.enemyHp}</strong>
            </div>
          </div>
          <div className="word-quest-arena__state">
            <span>手番 {run.currentBattle.turn}</span>
            <span>敵威力 {run.currentBattle.enemyPower}</span>
            {run.currentBattle.enemyStatuses.map((status) => (
              <span key={status} className="is-status">{STATUS_LABELS[status]}</span>
            ))}
          </div>
        </section>

        <aside className="word-causal-log" aria-labelledby="word-log-title">
          <header>
            <div>
              <small>作戦実行後</small>
              <h2 id="word-log-title">因果ログ</h2>
            </div>
            <span>{logs.length}件</span>
          </header>
          {logs.length === 0 ? (
            <p className="word-causal-log__empty">
              作戦を実行すると、条件と反応が番号順に残ります。
            </p>
          ) : (
            <ol>
              {logs.map((log) => (
                <li
                  key={log.id}
                  className={`is-${log.status}`}
                  style={{ animationDelay: `${Math.min(log.sequence * 45, 360)}ms` }}
                >
                  <span>{log.sequence}</span>
                  <i aria-hidden="true">{LOG_MARKS[log.kind]}</i>
                  <div>
                    <strong>{log.title}</strong>
                    <small>{log.detail}</small>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>

      <div className="word-quest-bottom-grid">
        <section className="word-strategy-board" aria-labelledby="word-strategy-title">
          <header>
            <div>
              <small>最大三つまで連鎖</small>
              <h2 id="word-strategy-title">作戦文</h2>
            </div>
            <div>
              <button type="button" onClick={addSentence} disabled={run.strategies.length >= 3 || run.phase !== "battle"}>
                文を追加
              </button>
              <button
                type="button"
                className="is-primary"
                onClick={executePlan}
                disabled={run.phase !== "battle" || isResolving}
              >
                作戦を実行する
              </button>
            </div>
          </header>

          <div className="word-strategy-board__rows">
            {run.strategies.map((sentence, sentenceIndex) => {
              const validation = validations[sentenceIndex];
              return (
                <article
                  key={sentence.id}
                  className={`${sentenceIndex === activeSentenceIndex ? "is-active" : ""} ${validation?.valid ? "is-valid" : "is-invalid"}`}
                >
                  <div className="word-strategy-board__number">{sentenceIndex + 1}</div>
                  <div className="word-sentence-slots" aria-label={`作戦文${sentenceIndex + 1}`}>
                    {SLOT_ORDER.map((slot) => {
                      const wordId = sentenceWordId(sentence, slot);
                      const word = wordId ? VOCABULARY_BY_ID[wordId] : null;
                      return (
                        <button
                          key={slot}
                          type="button"
                          className={`${activeSentenceIndex === sentenceIndex && activeSlot === slot ? "is-selected" : ""} is-${categoryForSlot(slot)}`}
                          onClick={() => selectSlot(sentenceIndex, slot)}
                          disabled={run.phase !== "battle"}
                        >
                          <small>{SENTENCE_SLOT_LABELS[slot]}</small>
                          <strong>{word?.label ?? "語彙を置く"}</strong>
                        </button>
                      );
                    })}
                  </div>
                  <div className="word-strategy-board__preview">
                    <strong>{formatSentence(sentence)}</strong>
                    <small>
                      {validation
                        ? getSentenceRulePreview(sentence, validation)
                        : "文章を確認中"}
                    </small>
                  </div>
                  {run.strategies.length > 1 && (
                    <button
                      type="button"
                      className="word-strategy-board__remove"
                      onClick={() => removeSentence(sentenceIndex)}
                      aria-label={`作戦文${sentenceIndex + 1}を削除`}
                    >
                      ×
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="word-vocabulary-tray" aria-labelledby="word-tray-title">
          <header>
            <div>
              <small>選択中：作戦文{activeSentenceIndex + 1} / {SENTENCE_SLOT_LABELS[activeSlot]}</small>
              <h2 id="word-tray-title">所持語彙</h2>
            </div>
            {activeSlot === "modifier" && activeSentence?.modifier && (
              <button type="button" onClick={clearModifier}>修飾を外す</button>
            )}
          </header>
          <nav aria-label="語彙カテゴリ">
            {CATEGORY_ORDER.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              >
                {WORD_CATEGORY_LABELS[category]}
                <span>{getOwnedWords(run.inventory, category).length}</span>
              </button>
            ))}
          </nav>
          <div className="word-vocabulary-tray__words">
            {ownedWords.map((word) => {
              const owned = run.inventory[word.id];
              const fits = wordFitsSlot(word, activeSlot);
              return (
                <button
                  key={word.id}
                  type="button"
                  className={`is-${word.category} ${fits ? "is-fit" : ""}`}
                  onClick={() => placeWord(word.id)}
                  disabled={run.phase !== "battle"}
                  title={`${word.tooltip}\n例：${word.example}`}
                >
                  <span>{word.grammarRole}</span>
                  <strong>{word.label}</strong>
                  {owned && owned.rank > 1 && <em>R{owned.rank}</em>}
                  <small>{word.tooltip}</small>
                </button>
              );
            })}
          </div>
          {activeValidation?.issue && (
            <p className="word-vocabulary-tray__error" role="status">
              {activeValidation.issue}
            </p>
          )}
        </aside>
      </div>

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
              {onExit && <button type="button" className="is-quiet" onClick={onExit}>元の冒険へ戻る</button>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
