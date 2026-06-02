"use client";

import { useGameStore } from "@/store/useGameStore";
import { TitleScreen } from "@/components/TitleScreen";
import { StageSelectScreen } from "@/components/StageSelectScreen";
import { BattleScreen } from "@/components/BattleScreen";
import { WaveResultScreen } from "@/components/WaveResultScreen";
import { StageResultScreen } from "@/components/StageResultScreen";

export default function Home() {
  const screen = useGameStore((s) => s.screen);

  return (
    <main style={{ fontFamily: "'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', sans-serif", minHeight: "100vh", background: "#0f1117", color: "#e2e8f0" }}>
      {screen === "title"       && <TitleScreen />}
      {screen === "stageSelect" && <StageSelectScreen />}
      {screen === "battle"      && <BattleScreen />}
      {screen === "waveResult"  && <WaveResultScreen />}
      {screen === "stageResult" && <StageResultScreen />}
    </main>
  );
}
