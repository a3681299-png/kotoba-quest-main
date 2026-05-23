"use client";

import { useGameStore } from "@/store/useGameStore";
import { getStage } from "@/data/stageData";

const ATTR_COLOR: Record<string, string> = {
  火: "#fc8181", 水: "#63b3ed", 雷: "#f6e05e", 氷: "#b2f5ea", 風: "#9ae6b4",
};

export function StageResultScreen() {
  const { currentWave, goToStageSelect, startStage } = useGameStore();
  if (!currentWave) return null;

  const stage = getStage(currentWave.stageNumber);
  const reward = stage.clearReward;
  const nextStageNum = currentWave.stageNumber + 1;
  const nextStage = nextStageNum <= 6 ? getStage(nextStageNum) : null;
  const hasNext = nextStage !== null && nextStage.waves.length > 0;

  return (
    <div style={s.root}>
      <div style={s.card}>
        <div style={s.trophy}>🏆</div>
        <h2 style={s.title}>Stage {currentWave.stageNumber} クリア！</h2>
        <p style={s.stageName}>{stage.title}</p>
        <p style={s.message}>{reward.message}</p>

        {reward.unlocksAttribute && (
          <div style={s.rewardBox}>
            <div style={s.rewardLabel}>新しい魔法が使えるようになった！</div>
            <div style={s.rewardAttr}>
              <span style={{ ...s.attrBadge, background: ATTR_COLOR[reward.unlocksAttribute] }}>
                {reward.unlocksAttribute}
              </span>
              <span style={s.magicName}>
                {reward.unlocksAttribute === "氷" ? "フロスト" : "ゲイル"}
              </span>
            </div>
          </div>
        )}

        <div style={s.actions}>
          <button style={s.subBtn} onClick={goToStageSelect}>ステージ選択へ</button>
          {hasNext && (
            <button style={s.nextBtn} onClick={() => startStage(nextStageNum)}>
              Stage {nextStageNum} へ →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" },
  card: { background: "#1a202c", border: "1px solid #2d3748", borderRadius: 12, padding: 40, textAlign: "center", maxWidth: 480 },
  trophy: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 800, color: "#f6e05e", marginBottom: 4 },
  stageName: { fontSize: 16, color: "#a0aec0", marginBottom: 16 },
  message: { fontSize: 14, color: "#e2e8f0", lineHeight: 1.7, marginBottom: 24 },
  rewardBox: { background: "#2d3748", borderRadius: 8, padding: "16px 24px", marginBottom: 24 },
  rewardLabel: { fontSize: 12, color: "#a0aec0", marginBottom: 10 },
  rewardAttr: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12 },
  attrBadge: { padding: "6px 16px", borderRadius: 999, fontSize: 18, fontWeight: 800, color: "#1a202c" },
  magicName: { fontSize: 18, fontWeight: 700, color: "#e2e8f0" },
  actions: { display: "flex", gap: 10, justifyContent: "center" },
  subBtn: { padding: "10px 16px", background: "#2d3748", color: "#a0aec0", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  nextBtn: { padding: "10px 24px", background: "#2b6cb0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 700 },
};
