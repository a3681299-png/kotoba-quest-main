"use client";

import { useGameStore } from "@/store/useGameStore";
import { getStage } from "@/data/stageData";
import type { LogEntry } from "@/engine/types";

export function WaveResultScreen() {
  const { currentWave, lastWaveResult, proceedToNextWave, retryWave, completeStage, goToStageSelect } = useGameStore();

  if (!currentWave || !lastWaveResult) return null;

  const stage = getStage(currentWave.stageNumber);
  const totalWaves = stage.waves.length;
  const isLastWave = currentWave.waveIndex >= totalWaves - 1;
  const victory = lastWaveResult.outcome === "victory";

  function handleNext() {
    if (!victory) { retryWave(); return; }
    if (isLastWave) {
      completeStage(currentWave!.stageNumber, stage.clearReward.unlocksAttribute);
    } else {
      proceedToNextWave();
    }
  }

  return (
    <div style={s.root}>
      <div style={s.card}>
        {/* 結果バナー */}
        <div style={{ ...s.banner, background: victory ? "#276749" : "#742a2a" }}>
          <span style={s.bannerIcon}>{victory ? "🎉" : "💀"}</span>
          <div>
            <div style={s.bannerTitle}>
              {victory
                ? isLastWave ? "ステージクリア！" : `Wave ${currentWave.waveIndex + 1} クリア！`
                : "力尽きた..."}
            </div>
            <div style={s.bannerSub}>
              {victory
                ? `残りHP: ${lastWaveResult.finalPlayerHp} / 100 ・ ${lastWaveResult.totalRounds} ラウンド`
                : `Wave ${currentWave.waveIndex + 1} で倒された`}
            </div>
          </div>
        </div>

        {/* 敵の結果サマリー */}
        <div style={s.enemySummary}>
          {lastWaveResult.enemyResults.map((r, i) => (
            <div key={i} style={s.enemyRow}>
              <span style={{ color: r.outcome === "defeated" ? "#68d391" : "#fc8181" }}>
                {r.outcome === "defeated" ? "✓" : "✗"}
              </span>
              <span style={s.enemyRowName}>{r.enemy.name}</span>
              <span style={s.enemyRowDetail}>
                {r.outcome === "defeated"
                  ? `${r.rounds} ラウンドで撃破`
                  : `HP ${r.battleResult.finalEnemyHp} 残存`}
              </span>
            </div>
          ))}
        </div>

        {/* バトルログ（コンパクト） */}
        <div style={s.logHeader}>バトルログ</div>
        <div style={s.logBox}>
          {lastWaveResult.enemyResults.flatMap((r) => r.battleResult.log).map((entry, i) => (
            <LogLine key={i} entry={entry} />
          ))}
        </div>

        {/* アクションボタン */}
        <div style={s.actions}>
          <button style={s.subBtn} onClick={goToStageSelect}>ステージ選択へ</button>
          <button style={{ ...s.mainBtn, background: victory ? "#2b6cb0" : "#c05621" }} onClick={handleNext}>
            {victory
              ? isLastWave ? "次のステージへ →" : `Wave ${currentWave.waveIndex + 2} へ →`
              : "もう一度挑戦"}
          </button>
        </div>
      </div>
    </div>
  );
}

const LOG_COLORS: Record<LogEntry["category"], string> = {
  roundStart:   "#63b3ed",
  playerAction: "#68d391",
  comboMagic:   "#f6e05e",
  enemyAction:  "#fc8181",
  statusEffect: "#d6bcfa",
  result:       "#fbd38d",
};
const LOG_PREFIX: Record<LogEntry["category"], string> = {
  roundStart: "⟳", playerAction: "→", comboMagic: "✦",
  enemyAction: "⚔", statusEffect: "🔥", result: "★",
};

function LogLine({ entry }: { entry: LogEntry }) {
  return (
    <div style={{ display: "flex", gap: 6, padding: "1px 8px", color: LOG_COLORS[entry.category], fontSize: 12, fontFamily: "monospace" }}>
      <span style={{ color: "#4a5568", minWidth: 24 }}>R{entry.round}</span>
      <span style={{ minWidth: 16 }}>{LOG_PREFIX[entry.category]}</span>
      <span>{entry.message}</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { maxWidth: 700, margin: "0 auto", padding: "32px 16px" },
  card: { background: "#1a202c", border: "1px solid #2d3748", borderRadius: 12, overflow: "hidden" },
  banner: { display: "flex", alignItems: "center", gap: 16, padding: "20px 24px" },
  bannerIcon: { fontSize: 36 },
  bannerTitle: { fontSize: 22, fontWeight: 800, color: "#fff" },
  bannerSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  enemySummary: { padding: "12px 24px", borderBottom: "1px solid #2d3748" },
  enemyRow: { display: "flex", alignItems: "center", gap: 10, padding: "4px 0", fontSize: 13 },
  enemyRowName: { flex: 1, color: "#e2e8f0" },
  enemyRowDetail: { color: "#718096", fontSize: 12 },
  logHeader: { padding: "8px 24px 4px", fontSize: 11, color: "#718096", textTransform: "uppercase", letterSpacing: 1 },
  logBox: {
    maxHeight: 280, overflowY: "auto", lineHeight: 1.7,
    padding: "4px 0 8px", borderBottom: "1px solid #2d3748",
  },
  actions: { display: "flex", gap: 10, padding: "16px 24px", justifyContent: "flex-end" },
  subBtn: { padding: "10px 16px", background: "#2d3748", color: "#a0aec0", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  mainBtn: { padding: "10px 24px", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 700 },
};
