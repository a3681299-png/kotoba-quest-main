"use client";

import { useGameStore } from "@/store/useGameStore";
import { ALL_STAGES } from "@/data/stageData";

const ATTR_COLORS: Record<string, string> = {
  火: "#fc8181", 水: "#63b3ed", 雷: "#f6e05e", 氷: "#b2f5ea", 風: "#9ae6b4",
};

export function StageSelectScreen() {
  const { clearedStages, unlockedAttributes, startStage, goToTitle } = useGameStore();

  return (
    <div style={s.root}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={goToTitle}>← タイトルへ</button>
        <h1 style={s.title}>ステージ選択</h1>
        <div style={s.attrs}>
          {["火", "水", "雷", "氷", "風"].map((a) => (
            <span key={a} style={{
              ...s.attrBadge,
              background: unlockedAttributes.includes(a as never) ? ATTR_COLORS[a] : "#2d3748",
              color: unlockedAttributes.includes(a as never) ? "#1a202c" : "#4a5568",
            }}>
              {a}
            </span>
          ))}
        </div>
      </div>

      <div style={s.grid}>
        {ALL_STAGES.map((stage) => {
          const cleared = clearedStages.includes(stage.stageNumber);
          const unlocked = stage.stageNumber === 1 || clearedStages.includes(stage.stageNumber - 1);
          const hasWaves = stage.waves.length > 0;

          return (
            <div key={stage.stageNumber} style={{
              ...s.card,
              ...(cleared ? s.cardCleared : {}),
              ...(!unlocked ? s.cardLocked : {}),
            }}>
              <div style={s.cardNum}>Stage {stage.stageNumber}</div>
              <div style={s.cardTitle}>{stage.title}</div>
              <div style={s.cardTheme}>{stage.theme}</div>
              <div style={s.cardMeta}>
                {stage.waves.length > 0 ? `${stage.waves.length} Wave` : "準備中"}
                {stage.clearReward.unlocksAttribute && (
                  <span style={{ ...s.rewardBadge, background: ATTR_COLORS[stage.clearReward.unlocksAttribute] }}>
                    {stage.clearReward.unlocksAttribute}解放
                  </span>
                )}
              </div>
              {unlocked && hasWaves ? (
                <button style={s.startBtn} onClick={() => startStage(stage.stageNumber)}>
                  {cleared ? "もう一度プレイ" : "スタート →"}
                </button>
              ) : (
                <div style={s.locked}>{!unlocked ? "🔒 前のステージをクリアしよう" : "🚧 準備中"}</div>
              )}
              {cleared && <div style={s.clearedBadge}>✓ クリア済み</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { maxWidth: 900, margin: "0 auto", padding: "24px 16px" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  backBtn: { padding: "6px 12px", background: "#2d3748", color: "#a0aec0", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  title: { fontSize: 24, fontWeight: 700, color: "#f6e05e", flex: 1 },
  attrs: { display: "flex", gap: 6 },
  attrBadge: { padding: "4px 10px", borderRadius: 999, fontSize: 13, fontWeight: 700 },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  card: { background: "#1a202c", border: "1px solid #2d3748", borderRadius: 10, padding: 20, position: "relative" },
  cardCleared: { borderColor: "#276749" },
  cardLocked: { opacity: 0.5 },
  cardNum: { fontSize: 12, color: "#718096", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 },
  cardTitle: { fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 },
  cardTheme: { fontSize: 12, color: "#a0aec0", marginBottom: 12, lineHeight: 1.5 },
  cardMeta: { fontSize: 12, color: "#718096", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 },
  rewardBadge: { padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#1a202c" },
  startBtn: { width: "100%", padding: "10px 0", background: "#2b6cb0", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  locked: { fontSize: 12, color: "#4a5568", textAlign: "center", padding: "10px 0" },
  clearedBadge: { position: "absolute", top: 12, right: 12, fontSize: 11, color: "#68d391", fontWeight: 700 },
};
