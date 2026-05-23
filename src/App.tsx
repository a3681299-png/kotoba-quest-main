import { useState } from "react";
import BattleScreen from "./components/BattleScreen";
import {
  AppModeTabs,
  SpecPlayground,
  type LabMode,
} from "./components/SpecPlayground";
import { StageOnePlaytest } from "./components/StageOnePlaytest";
import "./App.css";

function App() {
  const [mode, setMode] = useState<LabMode>("stage1");

  return (
    <div className="app-mode-shell">
      <header className="app-mode-header">
        <div className="app-mode-header-inner">
          <div className="app-brand">
            <strong>Kotoba Quest</strong>
            <span>仕様検証ページと現行プロトタイプの切り替え</span>
          </div>
          <AppModeTabs mode={mode} onChange={setMode} />
        </div>
      </header>

      <main className="app-mode-content">
        {mode === "spec" && <SpecPlayground />}
        {mode === "stage1" && <StageOnePlaytest />}
        {mode === "prototype" && <BattleScreen />}
      </main>
    </div>
  );
}

export default App;
