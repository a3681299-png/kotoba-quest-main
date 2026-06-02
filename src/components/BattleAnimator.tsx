"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { WaveResult } from "@/engine/waveRunner";
import type { WaveData } from "@/data/stageData";
import type { LogEntry } from "@/engine/types";

// ─── アニメーション速度 ───────────────────────────────

const SPEED_MS = { slow: 700, normal: 300, fast: 80 } as const;
type Speed = keyof typeof SPEED_MS;

// ─── Props ───────────────────────────────────────────

interface Props {
  waveResult: WaveResult;
  wave: WaveData;
  code: string;
  startPlayerHp: number;
  startPlayerMp: number;
  onEdit: () => void;            // 一時停止 → コード編集に戻る
  onFinished: () => void;        // アニメ完了後（Wave結果画面へ）
}

// ─── 各ステップでの状態を事前計算 ─────────────────────

interface StepState {
  playerHp: number;
  enemyHp: number;         // 単体バトル用（先頭敵）
  enemyHps: number[];      // 多体バトル用（全敵）
  playerMp: number;
  round: number;
  enemyIndex: number;
}

function buildStepStates(
  logs: LogEntry[],
  initPlayerHp: number,
  enemies: { maxHp: number }[],
  initPlayerMp: number,
  isSimultaneous: boolean,
): StepState[] {
  const states: StepState[] = [];
  let ph = initPlayerHp;
  let pm = initPlayerMp;
  let round = 1;
  let enemyIdx = 0;

  // 多体バトル: 全敵のHPを個別追跡
  const enemyHps = enemies.map((e) => e.maxHp);

  for (const entry of logs) {
    round = entry.round;
    if (entry.delta?.playerHp) ph = Math.max(0, ph + entry.delta.playerHp);
    if (entry.delta?.playerMp) pm = Math.max(0, pm + (entry.delta.playerMp ?? 0));

    if (entry.delta?.enemyHp !== undefined) {
      if (isSimultaneous && entry.delta.enemyIndex !== undefined) {
        // 多体: 対象の敵のHPを更新
        const idx = entry.delta.enemyIndex;
        enemyHps[idx] = Math.max(0, enemyHps[idx] + (entry.delta.enemyHp ?? 0));
      } else if (!isSimultaneous) {
        // 単体: 現在の敵のHPを更新
        enemyHps[enemyIdx] = Math.max(0, enemyHps[enemyIdx] + (entry.delta.enemyHp ?? 0));
        // 次の敵へ遷移
        if (entry.category === "result" && entry.message.includes("倒") && enemyIdx + 1 < enemies.length) {
          enemyIdx++;
          enemyHps[enemyIdx] = enemies[enemyIdx].maxHp;
        }
      }
    }

    states.push({
      playerHp: ph,
      enemyHp: enemyHps[enemyIdx] ?? 0,
      enemyHps: [...enemyHps],
      playerMp: pm,
      round,
      enemyIndex: enemyIdx,
    });
  }
  return states;
}

// ─── コンポーネント ───────────────────────────────────

export function BattleAnimator({
  waveResult,
  wave,
  code,
  startPlayerHp,
  startPlayerMp,
  onEdit,
  onFinished,
}: Props) {
  // 全ログを1本に結合
  const isSimultaneous = !!wave.simultaneous;

  // 多体バトルは allLogs を優先、それ以外は各敵の log を結合
  const allLogs = useMemo(
    () => waveResult.allLogs ?? waveResult.enemyResults.flatMap((r) => r.battleResult.log),
    [waveResult],
  );

  const stepStates = useMemo(
    () => buildStepStates(allLogs, startPlayerHp, wave.enemies, startPlayerMp, isSimultaneous),
    [allLogs, startPlayerHp, wave.enemies, startPlayerMp, isSimultaneous],
  );

  const [stepIndex, setStepIndex] = useState(0); // 表示済みのログ数
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<Speed>("normal");
  const logBoxRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFinished = stepIndex >= allLogs.length;

  // 現在の表示状態
  const currentState: StepState = stepIndex > 0
    ? stepStates[stepIndex - 1]
    : {
        playerHp: startPlayerHp,
        enemyHp: wave.enemies[0]?.maxHp ?? 0,
        enemyHps: wave.enemies.map((e) => e.maxHp),
        playerMp: startPlayerMp,
        round: 1,
        enemyIndex: 0,
      };

  const currentEnemy = wave.enemies[currentState.enemyIndex];
  const displayedLogs = allLogs.slice(0, stepIndex);
  const currentEntry = allLogs[stepIndex]; // 次に表示されるエントリ

  // 敵ごとの一時ハイライト（ダメージを視覚化）
  const prevEnemyHpsRef = useRef<number[]>(wave.enemies.map((e) => e.maxHp));
  const [flashMap, setFlashMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const prev = prevEnemyHpsRef.current;
    const curr = currentState.enemyHps;
    curr.forEach((hp, i) => {
      if ((prev[i] ?? 0) > hp) {
        setFlashMap((m) => ({ ...m, [i]: true }));
        const t = setTimeout(() => setFlashMap((m) => ({ ...m, [i]: false })), 350);
        // クリーンアップしない（短時間なので問題ない）
        void t;
      }
    });
    prevEnemyHpsRef.current = [...curr];
  }, [stepIndex, currentState.enemyHps]);

  // アニメーションループ
  const advance = useCallback(() => {
    setStepIndex((i) => i + 1);
  }, []);

  useEffect(() => {
    if (!playing || isFinished) return;
    timerRef.current = setTimeout(advance, SPEED_MS[speed]);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, isFinished, stepIndex, speed, advance]);

  // ログを末尾へ自動スクロール
  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [stepIndex]);

  // 完了後に少し待ってコールバック
  useEffect(() => {
    if (!isFinished) return;
    const t = setTimeout(onFinished, 1200);
    return () => clearTimeout(t);
  }, [isFinished, onFinished]);

  // ─── ハイライト行計算 ───────────────────────────────
  const highlightedLine = useMemo(() => {
    if (!currentEntry || currentEntry.category !== "playerAction") return null;
    const lines = code.split("\n");
    // メッセージに含まれる魔法名・コマンド名でマッチ
    const keywords = ["フレイム", "アクア", "スパーク", "フロスト", "ゲイル",
                      "防御", "回復", "待機", "合体"];
    for (const kw of keywords) {
      if (!currentEntry.message.includes(kw)) continue;
      const idx = lines.findIndex((l) => l.includes(kw));
      if (idx >= 0) return idx;
    }
    return null;
  }, [currentEntry, code]);

  return (
    <div style={s.root}>
      {/* ── コントロールバー ── */}
      <div style={s.controls}>
        <button style={s.stopBtn} onClick={onEdit} title="停止して編集">
          ■ 停止
        </button>
        <button
          style={{ ...s.ctrlBtn, background: playing ? "#744210" : "#276749" }}
          onClick={() => setPlaying((p) => !p)}
          disabled={isFinished}
        >
          {playing ? "⏸ 一時停止" : "▶ 再生"}
        </button>
        <div style={s.speedGroup}>
          速度：
          {(["slow", "normal", "fast"] as Speed[]).map((sp) => (
            <button
              key={sp}
              style={{ ...s.speedBtn, ...(speed === sp ? s.speedActive : {}) }}
              onClick={() => setSpeed(sp)}
            >
              {sp === "slow" ? "遅" : sp === "normal" ? "普通" : "速"}
            </button>
          ))}
        </div>
        <div style={s.stepInfo}>
          {isFinished
            ? "完了"
            : `ステップ ${stepIndex} / ${allLogs.length}`}
        </div>
      </div>

      <div style={s.body}>
        {/* ── 左: コード（ハイライトつき） ── */}
        <div style={s.left}>
          <div style={s.sectionLabel}>コード</div>
          <div style={s.codeView}>
            {code.split("\n").map((line, i) => (
              <div
                key={i}
                style={{
                  ...s.codeLine,
                  ...(i === highlightedLine ? s.codeLineActive : {}),
                }}
              >
                <span style={s.lineNo}>{i + 1}</span>
                <span style={s.lineText}>{line || " "}</span>
              </div>
            ))}
          </div>
          {!playing && !isFinished && (
            <button style={s.editBtn} onClick={onEdit}>
              ✏ コードを修正して再実行
            </button>
          )}
        </div>

        {/* ── 右: バトル状況 + ログ ── */}
        <div style={s.right}>
          {/* ステータス */}
          <div style={s.statusPanel}>
            <div style={s.statusRow}>
              <span style={s.statusLabel}>Round</span>
              <span style={s.roundNum}>{currentState.round}</span>
            </div>
            <div style={s.statusDivider} />
            <StatusBarAnimated
              label="自分 HP"
              value={currentState.playerHp}
              max={100}
              color="#68d391"
            />
            <StatusBarAnimated
              label="MP"
              value={currentState.playerMp}
              max={startPlayerMp + 60}
              color="#63b3ed"
            />
            <div style={s.statusDivider} />
            {/* すべての敵を一覧で表示する（同時・逐次どちらでも全員表示） */}
            {wave.enemies.map((e, i) => (
              <StatusBarAnimated
                key={e.id ?? i}
                label={e.name}
                value={currentState.enemyHps[i] ?? e.maxHp}
                max={e.maxHp}
                color={e.charLimit ? "#f6e05e" : "#fc8181"}
                flash={!!flashMap[i]}
              />
            ))}
          </div>

          {/* 現在の行動表示 */}
          {currentEntry && (
            <ActionIndicator entry={currentEntry} />
          )}

          {/* ログ */}
          <div style={s.sectionLabel}>バトルログ</div>
          <div style={s.logBox} ref={logBoxRef}>
            {displayedLogs.map((entry, i) => (
              <LogLine key={i} entry={entry} isLatest={i === displayedLogs.length - 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── サブコンポーネント ────────────────────────────────

function StatusBarAnimated({ label, value, max, color, flash }: {
  label: string; value: number; max: number; color: string; flash?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: "#718096", width: 72, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: "#2d3748", borderRadius: 4, overflow: "hidden", boxShadow: flash ? "0 0 8px rgba(255,255,255,0.06)" : undefined }}>
        <div style={{
          width: `${pct}%`, height: "100%", background: color, borderRadius: 4,
          transition: "width 0.2s ease, box-shadow 0.15s",
          transform: flash ? "scaleY(1.12)" : undefined,
        }} />
      </div>
      <span style={{ fontSize: 11, color: "#a0aec0", width: 28, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function ActionIndicator({ entry }: { entry: LogEntry }) {
  if (entry.category === "mpRecovery") {
    return (
      <div style={{
        padding: "10px 12px", borderRadius: 6,
        background: "linear-gradient(90deg, #1a365d, #2a4a7f)",
        border: "1px solid #4299e1",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>💧</span>
        <div>
          <div style={{ fontSize: 11, color: "#90cdf4", marginBottom: 2 }}>MP 回復</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#63b3ed" }}>{entry.message}</div>
        </div>
      </div>
    );
  }

  const bg: Record<LogEntry["category"], string> = {
    playerAction: "#2f4a2f",
    comboMagic:   "#4a3f10",
    enemyAction:  "#4a1f1f",
    roundStart:   "#1e3a4a",
    mpRecovery:   "#1a365d",
    statusEffect: "#3a2a4a",
    result:       "#3a3000",
  };
  return (
    <div style={{ ...s.actionIndicator, background: bg[entry.category] ?? "#2d3748" }}>
      <span style={{ fontSize: 16, marginRight: 8 }}>
        {entry.category === "playerAction" ? "→"
          : entry.category === "comboMagic" ? "✦"
          : entry.category === "enemyAction" ? "⚔"
          : entry.category === "roundStart" ? "⟳"
          : "●"}
      </span>
      {entry.message}
    </div>
  );
}

const LOG_COLORS: Record<LogEntry["category"], string> = {
  roundStart:   "#63b3ed",
  mpRecovery:   "#90cdf4",
  playerAction: "#68d391",
  comboMagic:   "#f6e05e",
  enemyAction:  "#fc8181",
  statusEffect: "#d6bcfa",
  result:       "#fbd38d",
};

function LogLine({ entry, isLatest }: { entry: LogEntry; isLatest: boolean }) {
  // MP回復エントリは目立つ行として表示
  if (entry.category === "mpRecovery") {
    return (
      <div style={{
        display: "flex", gap: 6, padding: "3px 8px",
        background: "rgba(66,153,225,0.1)",
        borderLeft: "2px solid #4299e1",
        color: "#90cdf4", fontSize: 12,
        fontFamily: "monospace", lineHeight: 1.7,
      }}>
        <span style={{ color: "#4299e1", minWidth: 24, flexShrink: 0 }}>R{entry.round}</span>
        <span>💧 {entry.message}</span>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", gap: 6, padding: "1px 8px",
      color: LOG_COLORS[entry.category],
      fontSize: 12, fontFamily: "monospace", lineHeight: 1.7,
      background: isLatest ? "rgba(255,255,255,0.04)" : "transparent",
    }}>
      <span style={{ color: "#4a5568", minWidth: 24, flexShrink: 0 }}>R{entry.round}</span>
      <span>{entry.message}</span>
    </div>
  );
}

// ─── スタイル ─────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root: { display: "flex", flexDirection: "column", gap: 12 },
  controls: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 12px", background: "#1a202c",
    borderRadius: 8, flexWrap: "wrap",
  },
  stopBtn: {
    padding: "6px 12px", background: "#742a2a", color: "#fc8181",
    border: "none", borderRadius: 5, cursor: "pointer", fontSize: 13, fontWeight: 700,
  },
  ctrlBtn: {
    padding: "6px 14px", color: "#fff",
    border: "none", borderRadius: 5, cursor: "pointer", fontSize: 13, fontWeight: 700,
  },
  speedGroup: { display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#718096" },
  speedBtn: {
    padding: "4px 8px", background: "#2d3748", color: "#a0aec0",
    border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11,
  },
  speedActive: { background: "#4a5568", color: "#f6e05e" },
  stepInfo: { marginLeft: "auto", fontSize: 12, color: "#4a5568" },
  body: { display: "grid", gridTemplateColumns: "1fr 340px", gap: 12, alignItems: "start" },
  left: { display: "flex", flexDirection: "column", gap: 8 },
  right: { display: "flex", flexDirection: "column", gap: 8 },
  sectionLabel: { fontSize: 11, color: "#718096", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 },
  codeView: {
    fontFamily: "'SFMono-Regular', Consolas, monospace",
    fontSize: 13, lineHeight: 1.7,
    background: "#1a202c", border: "1px solid #2d3748",
    borderRadius: 6, overflow: "hidden",
  },
  codeLine: { display: "flex", gap: 0 },
  codeLineActive: { background: "rgba(246,224,94,0.12)", borderLeft: "2px solid #f6e05e" },
  lineNo: { width: 36, textAlign: "right", padding: "0 8px", color: "#4a5568", flexShrink: 0, userSelect: "none" },
  lineText: { padding: "0 8px", color: "#e2e8f0", whiteSpace: "pre" },
  editBtn: {
    padding: "8px 12px", background: "#2d3748", color: "#f6e05e",
    border: "1px solid #f6e05e", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700,
  },
  statusPanel: {
    background: "#1a202c", border: "1px solid #2d3748",
    borderRadius: 8, padding: "12px 14px",
  },
  statusRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  statusLabel: { fontSize: 11, color: "#718096" },
  roundNum: { fontSize: 20, fontWeight: 800, color: "#f6e05e" },
  statusDivider: { height: 1, background: "#2d3748", margin: "8px 0" },
  actionIndicator: {
    padding: "8px 12px", borderRadius: 6, fontSize: 13,
    color: "#e2e8f0", fontWeight: 600, lineHeight: 1.5,
    minHeight: 40, display: "flex", alignItems: "center",
  },
  logBox: {
    background: "#1a202c", border: "1px solid #2d3748", borderRadius: 6,
    maxHeight: 300, overflowY: "auto",
    padding: "4px 0",
  },
};
