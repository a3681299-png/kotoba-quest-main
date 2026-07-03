import { useState } from "react";
import BattleScreen from "./components/BattleScreen";
import {
  advanceToStageIntro,
  initialBattleFlowState,
  openPreparation,
  returnToPreparation,
  startPreparedBattle,
} from "./components/battleFlow";
import { PreparationScreen } from "./components/PreparationScreen";

function App() {
  const [battleFlow, setBattleFlow] = useState(initialBattleFlowState);

  if (battleFlow.screenMode === "preparation") {
    return (
      <PreparationScreen
        stageId={battleFlow.stageIndex + 1}
        onStartBattle={(battlePlan) => {
          setBattleFlow((current) => startPreparedBattle(current, battlePlan));
        }}
      />
    );
  }

  if (battleFlow.screenMode === "intro") {
    return (
      <BattleScreen
        key={`intro-${battleFlow.stageIndex}`}
        stageIndex={battleFlow.stageIndex}
        onPreparationReady={() => {
          setBattleFlow((current) => openPreparation(current));
        }}
      />
    );
  }

  return (
    <BattleScreen
      key={`battle-${battleFlow.stageIndex}`}
      stageIndex={battleFlow.stageIndex}
      preparedBattlePlan={battleFlow.preparedBattlePlan}
      onAdvanceStage={(nextStageIndex) => {
        setBattleFlow((current) => advanceToStageIntro(current, nextStageIndex));
      }}
      onPreparedPlanComplete={() => {
        setBattleFlow((current) => returnToPreparation(current));
      }}
    />
  );
}

export default App;
