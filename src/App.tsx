import { lazy, Suspense, useEffect, useState } from "react";
import { TitleScreen } from "./components/TitleScreen";
import "./styles/reading-loop-entry.css";

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

function App() {
  const [isGameVisible, setIsGameVisible] = useState(
    isReadingLoopLocation,
  );
  const [startFresh, setStartFresh] = useState(false);
  const [gameSessionId, setGameSessionId] = useState(0);

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
  );
}

export default App;
