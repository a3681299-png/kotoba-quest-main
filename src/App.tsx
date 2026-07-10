import { lazy, Suspense, useEffect, useState } from "react";
import BattleScreen from "./components/BattleScreen";
import {
  advanceToStageIntro,
  initialBattleFlowState,
  openPreparation,
  returnToPreparation,
  startPreparedBattle,
} from "./components/battleFlow";
import { PreparationScreen } from "./components/PreparationScreen";
import "./styles/preparation-readable.css";
import "./styles/reading-loop-entry.css";

const ReadingLoopScreen = lazy(() =>
  import("./features/reading-loop/ReadingLoopScreen").then((module) => ({
    default: module.ReadingLoopScreen,
  })),
);

const AnimationLabPage = lazy(() =>
  import("./features/reading-loop/AnimationLabPage").then((module) => ({
    default: module.AnimationLabPage,
  })),
);

function isReadingLoopLocation() {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("mode") === "reading-loop"
  );
}

function App() {
  const [battleFlow, setBattleFlow] = useState(initialBattleFlowState);
  const [isReadingLoopMode, setIsReadingLoopMode] = useState(
    isReadingLoopLocation,
  );

  useEffect(() => {
    const syncModeFromLocation = () => {
      setIsReadingLoopMode(isReadingLoopLocation());
    };

    window.addEventListener("popstate", syncModeFromLocation);
    return () => {
      window.removeEventListener("popstate", syncModeFromLocation);
    };
  }, []);

  if (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    window.location.pathname === "/dev/animation-lab"
  ) {
    return (
      <Suspense
        fallback={
          <div className="reading-loop-loading" role="status">
            Animation Labを読み込んでいます…
          </div>
        }
      >
        <AnimationLabPage />
      </Suspense>
    );
  }

  const openReadingLoop = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", "reading-loop");
    window.history.pushState(null, "", url);
    setIsReadingLoopMode(true);
  };

  const closeReadingLoop = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("mode");
    window.history.replaceState(null, "", url);
    setIsReadingLoopMode(false);
  };

  if (isReadingLoopMode) {
    return (
      <Suspense
        fallback={
          <div className="reading-loop-loading" role="status">
            語彙遠征を読み込んでいます…
          </div>
        }
      >
        <ReadingLoopScreen onExit={closeReadingLoop} />
      </Suspense>
    );
  }

  const readingLoopEntry = (
    <button
      className="reading-loop-entry"
      type="button"
      onClick={openReadingLoop}
    >
      <span className="reading-loop-entry__eyebrow">新しい遊び方</span>
      <span className="reading-loop-entry__label">語彙を組む遠征</span>
      <span className="reading-loop-entry__compact">語彙遠征へ</span>
    </button>
  );

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
      <>
        <BattleScreen
          key={`intro-${battleFlow.stageIndex}`}
          stageIndex={battleFlow.stageIndex}
          onPreparationReady={() => {
            setBattleFlow((current) => openPreparation(current));
          }}
        />
        {readingLoopEntry}
      </>
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
