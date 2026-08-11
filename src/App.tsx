import { lazy, Suspense, useEffect, useState } from "react";
<<<<<<< HEAD
import { TitleScreen } from "./components/TitleScreen";
=======
import { onAuthStateChanged } from "firebase/auth";
import { auth, getUserProgress, saveUserProgress } from "./lib/firebase";
import { AuthScreen } from "./components/AuthScreen";
import BattleScreen from "./components/BattleScreen";
import {
  advanceToStageIntro,
  initialBattleFlowState,
  openPreparation,
  returnToPreparation,
  startPreparedBattle,
} from "./components/battleFlow";
import { PreparationScreen } from "./components/PreparationScreen";
import { STAGES } from "./data/stages";
import "./styles/preparation-readable.css";
>>>>>>> f6a531c8fe4646590ddc75941dc6b28a9d18cc94
import "./styles/reading-loop-entry.css";
import "./styles/auth.css";

const WordQuestRunScreen = lazy(() =>
  import("./features/word-quest/WordQuestRunScreen").then((module) => ({
    default: module.WordQuestRunScreen,
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

const KOTOBA_QUEST_STAGE_KEY = "kotoba-quest.stage-index.v1";

function getInitialBattleFlowState() {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(KOTOBA_QUEST_STAGE_KEY);
    if (saved) {
      const idx = parseInt(saved, 10);
      if (!isNaN(idx) && idx >= 0 && idx < STAGES.length) {
        return {
          ...initialBattleFlowState,
          stageIndex: idx,
        };
      }
    }
  }
  return initialBattleFlowState;
}

function App() {
<<<<<<< HEAD
  const [isGameVisible, setIsGameVisible] = useState(
    isReadingLoopLocation,
  );
  const [startFresh, setStartFresh] = useState(false);
  const [gameSessionId, setGameSessionId] = useState(0);
=======
  const [battleFlow, setBattleFlow] = useState(getInitialBattleFlowState);
  const [isReadingLoopMode, setIsReadingLoopMode] = useState(
    isReadingLoopLocation,
  );
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setUser(currentUser);
        if (currentUser) {
          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => {
              console.warn("Firestore data loading timed out. Falling back to local storage.");
              resolve(null);
            }, 1500)
          );

          const progressData = await Promise.race([
            getUserProgress(currentUser.uid),
            timeoutPromise,
          ]);

          if (progressData) {
            setBattleFlow((prev) => ({
              ...prev,
              stageIndex: progressData.stageIndex,
            }));
          }
        }
      } catch (error) {
        console.error("Error during authentication load:", error);
      } finally {
        setIsAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      void saveUserProgress(user.uid, battleFlow.stageIndex);
    }
    localStorage.setItem(KOTOBA_QUEST_STAGE_KEY, battleFlow.stageIndex.toString());
  }, [battleFlow.stageIndex, user]);
>>>>>>> f6a531c8fe4646590ddc75941dc6b28a9d18cc94

  useEffect(() => {
    const syncModeFromLocation = () => {
      const isDirectGameRoute = isReadingLoopLocation();
      setStartFresh(false);
      setIsGameVisible(isDirectGameRoute);
      if (isDirectGameRoute) {
        setGameSessionId((current) => current + 1);
      }
    };

    window.addEventListener("popstate", syncModeFromLocation);
    return () => {
      window.removeEventListener("popstate", syncModeFromLocation);
    };
  }, []);

  if (isAuthLoading) {
    return (
      <div className="auth-loading-container">
        <div className="auth-loading-spinner" />
        <div className="auth-loading-text">ギルドデータを読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

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

  const returnToTitle = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("mode");
    window.history.replaceState(null, "", url);
    setStartFresh(false);
    setIsGameVisible(false);
  };

<<<<<<< HEAD
  if (!isGameVisible) {
    return (
      <TitleScreen
        onStart={() => {
          setStartFresh(true);
          setGameSessionId((current) => current + 1);
          setIsGameVisible(true);
        }}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <div className="reading-loop-loading" role="status">
          ことばの戦場を読み込んでいます…
        </div>
      }
    >
      <WordQuestRunScreen
        key={gameSessionId}
        startFresh={startFresh}
        onExit={returnToTitle}
      />
    </Suspense>
=======
  const logoutButton = (
    <button
      className="logout-button-global"
      type="button"
      onClick={() => auth.signOut()}
    >
      🚪 ログアウト
    </button>
  );

  if (isReadingLoopMode) {
    return (
      <>
        <Suspense
          fallback={
            <div className="reading-loop-loading" role="status">
              語彙遠征を読み込んでいます…
            </div>
          }
        >
          <ReadingLoopScreen onExit={closeReadingLoop} />
        </Suspense>
        {logoutButton}
      </>
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
      <>
        <PreparationScreen
          stageId={battleFlow.stageIndex + 1}
          onStartBattle={(battlePlan) => {
            setBattleFlow((current) => startPreparedBattle(current, battlePlan));
          }}
        />
        {logoutButton}
      </>
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
        {logoutButton}
      </>
    );
  }

  return (
    <>
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
      {logoutButton}
    </>
>>>>>>> f6a531c8fe4646590ddc75941dc6b28a9d18cc94
  );
}

export default App;
