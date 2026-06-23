import { useState } from "react";
import BattleScreen from "./components/BattleScreen";
import { PreparationScreen } from "./components/PreparationScreen";

type ScreenMode = "preparation" | "battle";

function App() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("preparation");

  if (screenMode === "preparation") {
    return <PreparationScreen onStartBattle={() => setScreenMode("battle")} />;
  }

  return <BattleScreen />;
}

export default App;
