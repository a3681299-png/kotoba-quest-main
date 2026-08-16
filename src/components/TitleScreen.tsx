import { useState } from "react";
import titleBackgroundUrl from "../assets/UI/title/title.png";
import titleLogoUrl from "../assets/UI/title/title1.png";
import newGameLabelUrl from "../assets/UI/title/title2.png";
import historyLabelUrl from "../assets/UI/title/title4.png";
import continueLabelUrl from "../assets/UI/title/title5.png";
import {
  auth,
  getBattleRecords,
  type BattleHistoryEntry,
} from "../lib/firebase";
import {
  getEnemy,
  SENTENCE_SLOT_LABELS,
  VOCABULARY_BY_ID,
} from "../wordQuest";
import "../styles/title-screen.css";

// 作戦文の6スロット（表示順）
const STRATEGY_SLOTS = [
  "subject",
  "condition",
  "connector",
  "action",
  "target",
  "modifier",
] as const;

type StrategySlots = Record<string, string | null>;

// ターンログ1件（お互いの行動）の形
interface LogEntry {
  id?: string;
  sequence: number;
  kind: string;
  status: "passed" | "failed" | "neutral";
  title: string;
  detail: string;
}

// 敵側とみなす種類（それ以外は自分側）
const ENEMY_KINDS = new Set(["reaction", "enemy", "failure"]);

// 1ターン分のデータ（そのターンに使った作戦＋発生したログ）
interface TurnData {
  strategy: StrategySlots[];
  logs: LogEntry[];
}

// 未知の敵IDでも落ちないように名前を安全に解決する
function safeEnemyName(enemyId: string): string {
  try {
    return getEnemy(enemyId).name;
  } catch {
    return enemyId;
  }
}

function safeGetEnemy(enemyId: string) {
  try {
    return getEnemy(enemyId);
  } catch {
    return null;
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`;
}

// logJson を「ターン配列」に正規化する（新旧フォーマット両対応）
function parseLog(logJson: string | null): TurnData[] {
  if (!logJson) return [];
  try {
    const parsed = JSON.parse(logJson);
    // 新形式：{ turns: [{ strategy, logs }] }
    if (parsed && Array.isArray(parsed.turns)) {
      return parsed.turns.map((t: { strategy?: unknown; logs?: unknown }) => ({
        strategy: Array.isArray(t.strategy) ? (t.strategy as StrategySlots[]) : [],
        logs: Array.isArray(t.logs) ? (t.logs as LogEntry[]) : [],
      }));
    }
    // 旧形式1：{ strategy, logs } → 1ターン扱い
    if (parsed && Array.isArray(parsed.logs)) {
      return [
        {
          strategy: Array.isArray(parsed.strategy)
            ? (parsed.strategy as StrategySlots[])
            : [],
          logs: parsed.logs as LogEntry[],
        },
      ];
    }
    // 旧形式2：ログ配列のみ
    if (Array.isArray(parsed)) {
      return [{ strategy: [], logs: parsed as LogEntry[] }];
    }
    return [];
  } catch {
    return [];
  }
}

interface TitleScreenProps {
  onStart: () => void;
  onContinue: () => void;
  onLogout: () => void;
  hasSave: boolean;
}

interface TitleMenuButtonProps {
  label: string;
  imageUrl: string;
  onClick?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

function TitleMenuButton({
  label,
  imageUrl,
  onClick,
  disabled = false,
  autoFocus = false,
}: TitleMenuButtonProps) {
  return (
    <button
      className="title-screen__menu-button"
      type="button"
      aria-label={disabled ? `${label}（セーブデータなし）` : label}
      title={disabled ? "セーブデータがありません" : label}
      onClick={onClick}
      disabled={disabled}
      autoFocus={autoFocus}
    >
      <img src={imageUrl} alt="" aria-hidden="true" draggable={false} />
    </button>
  );
}

type HistoryLevel = "grid" | "stage" | "battle";

export function TitleScreen({
  onStart,
  onContinue,
  onLogout,
  hasSave,
}: TitleScreenProps) {
  const [notice, setNotice] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [history, setHistory] = useState<BattleHistoryEntry[] | null>(null);
  const [level, setLevel] = useState<HistoryLevel>("grid");
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [selectedBattle, setSelectedBattle] =
    useState<BattleHistoryEntry | null>(null);
  const [showEnemyInfo, setShowEnemyInfo] = useState(false);

  const showHistory = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setNotice("ログイン情報が確認できませんでした。");
      return;
    }
    setNotice("");
    setIsHistoryOpen(true);
    setLevel("grid");
    setSelectedStage(null);
    setSelectedBattle(null);
    setShowEnemyInfo(false);
    setIsLoadingHistory(true);
    setHistory(null);
    const data = await getBattleRecords(uid);
    setHistory(data);
    setIsLoadingHistory(false);
  };

  const closeHistory = () => {
    setIsHistoryOpen(false);
  };

  // ステージごとにまとめる（各ステージ内は新しい順のまま）
  const stageGroups = history
    ? Object.values(
        history.reduce<Record<number, BattleHistoryEntry[]>>((acc, entry) => {
          (acc[entry.stageId] ??= []).push(entry);
          return acc;
        }, {}),
      ).sort((a, b) => a[0].stageId - b[0].stageId)
    : [];

  const currentStageBattles =
    selectedStage != null
      ? (stageGroups.find((g) => g[0].stageId === selectedStage) ?? [])
      : [];

  const currentTurns = selectedBattle ? parseLog(selectedBattle.logJson) : [];
  const currentEnemy = selectedBattle
    ? safeGetEnemy(selectedBattle.enemyId)
    : null;

  const openStage = (stageId: number) => {
    setSelectedStage(stageId);
    setLevel("stage");
  };

  const openBattle = (battle: BattleHistoryEntry) => {
    setSelectedBattle(battle);
    setShowEnemyInfo(false);
    setLevel("battle");
  };

  const renderHistoryBody = () => {
    if (isLoadingHistory) {
      return <p className="title-history-message">読み込み中…</p>;
    }
    if (history === null) {
      return (
        <p className="title-history-message">
          記録を読み込めませんでした。バックエンド（server）が起動しているか確認してください。
        </p>
      );
    }
    if (stageGroups.length === 0) {
      return (
        <p className="title-history-message">
          まだ対戦記録がありません。戦って作戦を実行すると残ります。
        </p>
      );
    }

    // Lv1: ステージのグリッド
    if (level === "grid") {
      return (
        <div className="title-history-grid">
          {stageGroups.map((group) => (
            <button
              type="button"
              className="title-history-stage-card"
              key={group[0].stageId}
              onClick={() => openStage(group[0].stageId)}
            >
              <span className="title-history-stage-card__label">
                ステージ {group[0].stageId}
              </span>
              <span className="title-history-stage-card__sub">
                {group.length}戦
              </span>
            </button>
          ))}
          {/* 未到達（追加予定）の枠 */}
          {[0, 1].map((i) => (
            <div
              className="title-history-stage-card is-locked"
              key={`locked-${i}`}
              aria-hidden="true"
            >
              <span className="title-history-stage-card__label">????</span>
            </div>
          ))}
        </div>
      );
    }

    // Lv2: 選んだステージの戦績リスト（各行に日時）
    if (level === "stage") {
      return (
        <div className="title-history-detail">
          <button
            type="button"
            className="title-history-back"
            onClick={() => setLevel("grid")}
          >
            ← ステージ一覧
          </button>
          <h3 className="title-history-stage-title">ステージ {selectedStage}</h3>
          <ul className="title-history-battles">
            {currentStageBattles.map((battle) => (
              <li key={battle.id}>
                <button
                  type="button"
                  className={`title-history-battle is-${battle.result}`}
                  onClick={() => openBattle(battle)}
                >
                  <span className="title-history-result">
                    {battle.result === "victory" ? "勝利" : "敗北"}
                  </span>
                  <span className="title-history-enemy">
                    {safeEnemyName(battle.enemyId)}
                  </span>
                  <span className="title-history-meta">
                    {formatDateTime(battle.createdAt)} ・ {battle.turns}手 ・ 発見
                    {battle.score}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    // Lv3: その戦闘のターンログ（ターンごと・自分緑/敵赤）
    return (
      <div className="title-history-detail">
        <button
          type="button"
          className="title-history-back"
          onClick={() => setLevel("stage")}
        >
          ← 戻る
        </button>

        {selectedBattle && (
          <div className={`title-history-log-head is-${selectedBattle.result}`}>
            <strong>
              {selectedBattle.result === "victory" ? "勝利" : "敗北"} ・{" "}
              {safeEnemyName(selectedBattle.enemyId)}
            </strong>
            <div className="title-history-log-head__right">
              <small>{formatDateTime(selectedBattle.createdAt)}</small>
              {currentEnemy && (
                <button
                  type="button"
                  className="title-history-info-btn"
                  aria-label="敵の能力・HPを見る"
                  aria-pressed={showEnemyInfo}
                  onClick={() => setShowEnemyInfo((v) => !v)}
                >
                  i
                </button>
              )}
            </div>
          </div>
        )}

        {showEnemyInfo && currentEnemy && (
          <div className="title-history-enemy-info">
            <div className="title-history-enemy-info__title">
              <strong>{currentEnemy.name}</strong>
              <span>{currentEnemy.epithet}</span>
            </div>
            <p className="title-history-enemy-info__spec">
              HP {currentEnemy.maxHp} ・ 威力 {currentEnemy.basePower}
              {currentEnemy.isBoss ? " ・ ボス" : ""}
            </p>
            <p>{currentEnemy.description}</p>
            {currentEnemy.solutionHints.map((hint) => (
              <p key={hint.id} className="title-history-enemy-info__hint">
                <b>{hint.label}</b>
                {hint.description}
              </p>
            ))}
          </div>
        )}

        {currentTurns.length === 0 ? (
          <p className="title-history-message">
            この戦闘の行動ログは保存されていません。
          </p>
        ) : (
          <div className="title-history-turns">
            {currentTurns.map((turn, turnIndex) => {
              const playerLogs = turn.logs.filter(
                (entry) => !ENEMY_KINDS.has(entry.kind),
              );
              const enemyLogs = turn.logs.filter((entry) =>
                ENEMY_KINDS.has(entry.kind),
              );
              return (
                <section className="title-history-turn" key={turnIndex}>
                  <h4 className="title-history-turn__title">
                    {turnIndex + 1}ターン目
                  </h4>
                  <div className="title-history-turn-block is-player">
                    {/* そのターンに使った作戦文（6スロット） */}
                    {turn.strategy.map((sentence, si) => (
                      <div className="title-history-strategy__row" key={si}>
                        {STRATEGY_SLOTS.map((slot) => {
                          const wordId = sentence[slot];
                          const label = wordId
                            ? (VOCABULARY_BY_ID[wordId]?.label ?? "—")
                            : "—";
                          return (
                            <div className="title-history-slot" key={slot}>
                              <small>{SENTENCE_SLOT_LABELS[slot]}</small>
                              <strong>{label}</strong>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    {playerLogs.map((entry) => (
                      <div
                        className="title-history-turn-line"
                        key={entry.id ?? entry.sequence}
                      >
                        <strong>{entry.title}</strong>
                        {entry.detail && <p>{entry.detail}</p>}
                      </div>
                    ))}
                  </div>
                  {enemyLogs.length > 0 && (
                    <div className="title-history-turn-block is-enemy">
                      {enemyLogs.map((entry) => (
                        <div
                          className="title-history-turn-line"
                          key={entry.id ?? entry.sequence}
                        >
                          <strong>{entry.title}</strong>
                          {entry.detail && <p>{entry.detail}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="title-screen" aria-label="ことばクエスト タイトル画面">
      <img
        className="title-screen__background"
        src={titleBackgroundUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <div className="title-screen__shade" aria-hidden="true" />

      <h1 className="title-screen__logo">
        <img src={titleLogoUrl} alt="ことばクエスト" draggable={false} />
      </h1>

      <section className="title-screen__panel" aria-label="メインメニュー">
        <nav className="title-screen__menu" aria-label="タイトルメニュー">
          <TitleMenuButton
            label="新たに始める"
            imageUrl={newGameLabelUrl}
            onClick={onStart}
            autoFocus
          />
          <TitleMenuButton
            label="つづきから"
            imageUrl={continueLabelUrl}
            onClick={onContinue}
            disabled={!hasSave}
          />
          <TitleMenuButton
            label="履歴"
            imageUrl={historyLabelUrl}
            onClick={showHistory}
          />
          <button
            className="title-screen__menu-button title-screen__menu-button--text"
            type="button"
            aria-label="ログアウト"
            title="ログアウト"
            onClick={onLogout}
          >
            <span>ログアウト</span>
          </button>
        </nav>

        <p className="title-screen__notice" role="status" aria-live="polite">
          {notice}
        </p>
      </section>

      {isHistoryOpen && (
        <div
          className="title-history-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="title-history-heading"
          onClick={closeHistory}
        >
          <div
            className="title-history-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="title-history-heading">冒険の記録</h2>

            {renderHistoryBody()}

            <button
              type="button"
              className="title-history-close"
              onClick={closeHistory}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
