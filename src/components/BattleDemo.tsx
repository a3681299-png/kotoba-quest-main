"use client";

import { useState } from "react";
import { parse } from "@/parser/parser";
import { runBattle } from "@/engine/battle";
import type { EnemyData, StageConfig, LogEntry } from "@/engine/types";

// ─── テスト用敵データ ──────────────────────────────────

const ENEMIES: Record<string, EnemyData> = {
  "スライム（無属性 HP40）": {
    id: "slime",
    name: "スライム",
    maxHp: 40,
    defense: 5,
    element: null,
    attackPatterns: [{ minDamage: 10, maxDamage: 15 }],
  },
  "ほのおスライム（火属性 HP60）": {
    id: "fire_slime",
    name: "ほのおスライム",
    maxHp: 60,
    defense: 5,
    element: "火",
    attackPatterns: [{ minDamage: 12, maxDamage: 18 }],
  },
  "みずスライム（水属性 HP60）": {
    id: "water_slime",
    name: "みずスライム",
    maxHp: 60,
    defense: 5,
    element: "水",
    attackPatterns: [{ minDamage: 12, maxDamage: 18 }],
  },
  "タフスライム（無属性 HP200・強い）": {
    id: "tough_slime",
    name: "タフスライム",
    maxHp: 200,
    defense: 10,
    element: null,
    attackPatterns: [{ minDamage: 15, maxDamage: 20 }],
  },
  "状態変化スライム（Stage4 Wave1）": {
    id: "state_slime",
    name: "状態変化スライム",
    maxHp: 120,
    defense: 5,
    element: null,
    attackPatterns: [{ minDamage: 15, maxDamage: 20 }],
  },
};

const CONFIGS: Record<string, StageConfig> = {
  "ステージ1（攻撃力20・MP50）": {
    stageNumber: 1,
    initialMaxMp: 50,
    playerAttack: 20,
    stateGimmick: null,
  },
  "ステージ2（攻撃力25・MP60）": {
    stageNumber: 2,
    initialMaxMp: 60,
    playerAttack: 25,
    stateGimmick: null,
  },
  "ステージ4 Wave1（攻撃力35・MP80・3状態）": {
    stageNumber: 4,
    initialMaxMp: 80,
    playerAttack: 35,
    stateGimmick: { type: "wave1" },
  },
};

// ─── コンポーネント ───────────────────────────────────

interface Props {
  initialCode: string;
}

export function BattleDemo({ initialCode }: Props) {
  const [code, setCode] = useState(initialCode);
  const [selectedEnemy, setSelectedEnemy] = useState(Object.keys(ENEMIES)[0]);
  const [selectedConfig, setSelectedConfig] = useState(Object.keys(CONFIGS)[0]);
  const [result, setResult] = useState<ReturnType<typeof runBattle> | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  function handleRun() {
    setParseError(null);
    setResult(null);

    const parsed = parse(code);
    if (!parsed.ok) {
      setParseError(parsed.message ?? "構文エラー");
      return;
    }

    const enemy = ENEMIES[selectedEnemy];
    // 状態変化スライム選択時は stateGimmick を強制設定
    const config = {
      ...CONFIGS[selectedConfig],
      stateGimmick: selectedEnemy.includes("状態変化")
        ? { type: "wave1" as const }
        : CONFIGS[selectedConfig].stateGimmick,
    };

    const battleResult = runBattle(parsed.ast, enemy, config);
    setResult(battleResult);
  }

  return (
    <div style={styles.container}>
      {/* 左カラム: 入力 */}
      <div style={styles.left}>
        <div style={styles.section}>
          <label style={styles.label}>コード入力</label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={styles.textarea}
            spellCheck={false}
          />
          {parseError && (
            <div style={styles.error}>⚠ {parseError}</div>
          )}
        </div>

        <div style={styles.section}>
          <label style={styles.label}>敵の選択</label>
          <select
            value={selectedEnemy}
            onChange={(e) => setSelectedEnemy(e.target.value)}
            style={styles.select}
          >
            {Object.keys(ENEMIES).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div style={styles.section}>
          <label style={styles.label}>ステージ設定</label>
          <select
            value={selectedConfig}
            onChange={(e) => setSelectedConfig(e.target.value)}
            style={styles.select}
          >
            {Object.keys(CONFIGS).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <button onClick={handleRun} style={styles.runBtn}>
          ▶ バトル実行
        </button>
      </div>

      {/* 右カラム: 結果 */}
      <div style={styles.right}>
        {result && (
          <>
            <div style={{
              ...styles.resultBadge,
              background: result.phase === "victory" ? "#276749" : result.phase === "timeout" ? "#744210" : "#742a2a",
            }}>
              {result.phase === "victory" ? "🎉 勝利" : result.phase === "timeout" ? "⏱ タイムアウト" : "💀 敗北"}
              {" "}（{result.rounds} ラウンド | 残HP {result.finalPlayerHp} / 敵残HP {result.finalEnemyHp}）
            </div>

            <div style={styles.logContainer}>
              {result.log.map((entry, i) => (
                <LogLine key={i} entry={entry} />
              ))}
            </div>
          </>
        )}

        {!result && (
          <div style={styles.placeholder}>
            コードを書いて「バトル実行」を押してください
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ログ行 ───────────────────────────────────────────

function LogLine({ entry }: { entry: LogEntry }) {
  const colorMap: Record<LogEntry["category"], string> = {
    roundStart:    "#63b3ed",
    playerAction:  "#68d391",
    comboMagic:    "#f6e05e",
    enemyAction:   "#fc8181",
    statusEffect:  "#d6bcfa",
    result:        "#fbd38d",
  };

  const prefixMap: Record<LogEntry["category"], string> = {
    roundStart:    "⟳",
    playerAction:  "→",
    comboMagic:    "✦",
    enemyAction:   "⚔",
    statusEffect:  "🔥",
    result:        "★",
  };

  return (
    <div style={{ ...styles.logLine, color: colorMap[entry.category] }}>
      <span style={styles.logRound}>R{entry.round}</span>
      <span style={styles.logPrefix}>{prefixMap[entry.category]}</span>
      <span>{entry.message}</span>
    </div>
  );
}

// ─── スタイル ─────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    alignItems: "start",
  },
  left: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  right: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    fontSize: 12,
    color: "#a0aec0",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  textarea: {
    width: "100%",
    height: 260,
    fontFamily: "'SFMono-Regular', Consolas, monospace",
    fontSize: 14,
    lineHeight: 1.6,
    padding: "10px 12px",
    background: "#1a202c",
    color: "#e2e8f0",
    border: "1px solid #4a5568",
    borderRadius: 6,
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    padding: "6px 10px",
    background: "#1a202c",
    color: "#e2e8f0",
    border: "1px solid #4a5568",
    borderRadius: 6,
    fontSize: 13,
  },
  runBtn: {
    padding: "10px 0",
    background: "#2b6cb0",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 4,
  },
  error: {
    color: "#fc8181",
    fontSize: 13,
    padding: "6px 8px",
    background: "#2d1515",
    borderRadius: 4,
  },
  resultBadge: {
    padding: "8px 12px",
    borderRadius: 6,
    fontWeight: 700,
    fontSize: 14,
    color: "#fff",
  },
  logContainer: {
    background: "#1a202c",
    border: "1px solid #2d3748",
    borderRadius: 6,
    padding: "8px 4px",
    maxHeight: 480,
    overflowY: "auto",
    fontFamily: "'SFMono-Regular', Consolas, monospace",
    fontSize: 12,
    lineHeight: 1.7,
  },
  logLine: {
    display: "flex",
    gap: 6,
    padding: "1px 8px",
  },
  logRound: {
    color: "#4a5568",
    minWidth: 24,
    flexShrink: 0,
  },
  logPrefix: {
    minWidth: 16,
    flexShrink: 0,
  },
  placeholder: {
    color: "#4a5568",
    fontSize: 14,
    textAlign: "center",
    padding: 40,
  },
};
