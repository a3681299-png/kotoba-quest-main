"use client";

import { useGameStore } from "@/store/useGameStore";

export function TitleScreen() {
  const goToStageSelect = useGameStore((s) => s.goToStageSelect);

  return (
    <div style={s.root}>
      <div style={s.card}>
        <div style={s.logo}>⚔️</div>
        <h1 style={s.title}>Kotoba Quest</h1>
        <p style={s.sub}>日本語でプログラミングを学ぶ RPG</p>
        <button style={s.btn} onClick={goToStageSelect}>
          はじめる
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" },
  card: { textAlign: "center", padding: 48 },
  logo: { fontSize: 72, marginBottom: 16 },
  title: { fontSize: 40, fontWeight: 800, color: "#f6e05e", marginBottom: 8 },
  sub: { fontSize: 16, color: "#a0aec0", marginBottom: 40 },
  btn: {
    padding: "14px 48px", fontSize: 18, fontWeight: 700,
    background: "#2b6cb0", color: "#fff", border: "none",
    borderRadius: 8, cursor: "pointer",
  },
};
