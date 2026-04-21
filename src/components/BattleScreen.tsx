import { useState, useRef, useEffect, useCallback } from "react";
import {
  initBattleScene,
  playAttackAnimation,
  updateEnemyAppearance,
  playDefeatAnimation,
  playEnemyAttackAnimation,
  destroyBattleScene,
} from "../game/BattleScene";
import { parse } from "../parser/parser";
import { SpellExecutor, type GameAction } from "../engine/SpellExecutor";
import { CodeEditor, type CodeEditorRef } from "./CodeEditor";
import { DebugPanel } from "./DebugPanel";
import { getTutorialGuideContent } from "./tutorialGuide";
import { useGameStore } from "../store/useGameStore";
import { STAGES } from "../data/stages";
import {
  ENEMY_DATA,
  decideEnemyIntent,
  calculateDamage,
} from "../engine/EnemyAI";
import "../styles/battle.css";

export function BattleScreen() {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [code, setCode] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [showDefeat, setShowDefeat] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(true);
  const [showTutorial, setShowTutorial] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const codeEditorRef = useRef<CodeEditorRef>(null);
  const codeAreaRef = useRef<HTMLDivElement>(null);
  const executeButtonRef = useRef<HTMLButtonElement>(null);

  // Zustand ストアから状態を取得
  const {
    playerHp,
    enemyHp,
    isStepMode,
    turnCount,
    currentIntent,
    isDefending,
    lastDamageBlocked,
    resetStage,
    clearVariables,
    resetExecution,
    setBattlePhase,
    setIntent,
    damagePlayer,
    setCurrentStage,
    nextTurn,
    saveTurnSnapshot,
    restoreFromSnapshot,
  } = useGameStore();

  const stage = STAGES[currentStageIndex];
  const enemyData = ENEMY_DATA[stage.id];
  const currentTutorial =
    showTutorial && stage.tutorialSteps
      ? stage.tutorialSteps[tutorialStep]
      : undefined;
  const tutorialGuide = currentTutorial
    ? getTutorialGuideContent(currentTutorial, stage.sampleCode)
    : null;

  // バトルシーンの初期化
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (canvasRef.current && mounted) {
        await initBattleScene(canvasRef.current);
      }
    };

    init();

    return () => {
      mounted = false;
      destroyBattleScene();
    };
  }, [currentStageIndex]);

  // ステージ変更時にストアをリセット
  useEffect(() => {
    resetStage(stage.enemyHp);
    setCurrentStage(stage.id);
    // 初回の予兆を設定
    if (enemyData) {
      const intent = decideEnemyIntent(enemyData, enemyData.maxHp, 0, false);
      setIntent(intent);
    }
    // チュートリアルがあれば表示
    if (stage.tutorialSteps && stage.tutorialSteps.length > 0) {
      setShowTutorial(true);
      setTutorialStep(0);
    } else {
      setShowTutorial(false);
    }
  }, [
    currentStageIndex,
    stage,
    resetStage,
    setCurrentStage,
    setIntent,
    enemyData,
  ]);

  // ログを追加する関数
  const addLog = useCallback(
    (
      message: string,
      type: "normal" | "damage" | "success" | "block" = "normal",
    ) => {
      setBattleLog((prev) => [...prev.slice(-5), `[${type}] ${message}`]);
    },
    [],
  );

  // アクションを実行する関数
  const executeAction = async (
    action: GameAction,
    currentEnemyHp: number,
  ): Promise<number> => {
    if (action.type === "attack") {
      await playAttackAnimation(action.attackType);
      const newHp = Math.max(0, currentEnemyHp - action.damage);
      return newHp;
    }
    return currentEnemyHp;
  };

  // 敵のターンを実行
  const executeEnemyTurn = async () => {
    if (!currentIntent || currentIntent.type === "idle") {
      // ステージ1-2: 攻撃なし
      addLog(`👾 ${stage.enemyName}はこちらを見ている...`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    } else {
      // ステージ3以降: 攻撃
      const damage = calculateDamage(currentIntent, isDefending);
      const blocked = isDefending ? currentIntent.damage - damage : 0;

      // 攻撃アニメーション
      const attackType =
        currentIntent.type === "attack_heavy"
          ? "heavy"
          : currentIntent.type === "attack_multi"
            ? "multi"
            : "normal";
      await playEnemyAttackAnimation(attackType, isDefending);

      // ダメージ適用
      damagePlayer(currentIntent.damage);

      if (isDefending) {
        addLog(`🛡️ 防御成功！ ${blocked}ダメージを軽減！`, "block");
        addLog(`${damage}ダメージを受けた！`, "damage");
      } else {
        addLog(`💥 ${currentIntent.damage}ダメージを受けた！`, "damage");
      }

      // プレイヤーHPチェック
      const currentPlayerHp = useGameStore.getState().playerHp;
      if (currentPlayerHp <= 0) {
        setBattlePhase("defeat");
        setShowDefeat(true);
        return;
      }
    }

    // 次のターンへ
    nextTurn();

    // 次の予兆を決定
    if (enemyData) {
      const newIntent = decideEnemyIntent(
        enemyData,
        useGameStore.getState().enemyHp,
        turnCount + 1,
        false,
      );
      setIntent(newIntent);
    }
  };

  // チュートリアルを次へ進める
  const advanceTutorial = () => {
    if (stage.tutorialSteps && tutorialStep < stage.tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowTutorial(false);
    }
  };

  // コードを実行する関数
  const executeCode = async () => {
    if (isExecuting || !code.trim()) return;

    // チュートリアル進行
    if (showTutorial && stage.tutorialSteps) {
      const currentTutorial = stage.tutorialSteps[tutorialStep];
      if (currentTutorial?.waitForAction === "execute") {
        advanceTutorial();
      }
    }

    setIsExecuting(true);
    setBattlePhase("executing");
    codeEditorRef.current?.clearHighlights();
    codeEditorRef.current?.clearError();
    resetExecution();
    clearVariables();

    // ターン開始時のスナップショットを保存（リトライ用）
    saveTurnSnapshot();

    addLog(`🔮 呪文を詠唱中...`);

    // パース
    const parseResult = parse(code.trim());

    if (!parseResult.success) {
      const err = parseResult.error;
      const lineNum = err.location?.start.line || 1;
      const friendlyMessage = formatFriendlyError(err);

      codeEditorRef.current?.setErrorLine(lineNum, friendlyMessage);
      addLog(friendlyMessage, "normal");
      setIsExecuting(false);
      setBattlePhase("player_turn");
      return;
    }

    // SpellExecutor でAST実行
    const executor = new SpellExecutor(
      {
        playerHp,
        enemyHp: stage.enemyHp,
        maxEnemyHp: stage.enemyHp,
        variables: new Map(),
      },
      { useStore: true },
    );

    executor.setStepMode(isStepMode);

    executor.on("line-execute", (event) => {
      if (event.lineNumber) {
        codeEditorRef.current?.highlightLine(event.lineNumber, "executing");
      }
    });

    executor.on("line-complete", (event) => {
      if (event.lineNumber) {
        codeEditorRef.current?.highlightLine(event.lineNumber, "complete");
      }
    });

    // 実行
    const result = await executor.execute(parseResult.ast);

    if (result.error) {
      addLog(result.error, "normal");
      setIsExecuting(false);
      setBattlePhase("player_turn");
      return;
    }

    for (const log of result.logs) {
      addLog(log);
    }

    // アクションを実行
    let currentEnemyHp = useGameStore.getState().enemyHp;
    let totalDamage = 0;

    for (const action of result.actions) {
      if (action.type === "attack") {
        totalDamage += action.damage;
        currentEnemyHp = await executeAction(action, currentEnemyHp);
        useGameStore.getState().damageEnemy(action.damage);
      } else if (action.type === "heal") {
        useGameStore.getState().healPlayer(action.amount);
      }
    }

    // 敵HPのビジュアル更新
    const finalEnemyHp = useGameStore.getState().enemyHp;
    updateEnemyAppearance(finalEnemyHp / stage.enemyHp);

    if (totalDamage > 0) {
      addLog(`${stage.enemyName}に合計${totalDamage}ダメージ！`, "damage");

      // 敵を倒したか
      if (finalEnemyHp <= 0) {
        await playDefeatAnimation();
        addLog(`${stage.enemyName}を倒した！`, "success");
        setBattlePhase("victory");
        setShowVictory(true);
        setIsExecuting(false);
        return;
      }
    }

    // 敵のターンへ
    setBattlePhase("show_intent");
    addLog(`👾 ${stage.enemyName}のターン！`);
    await new Promise((resolve) => setTimeout(resolve, 800));

    setBattlePhase("enemy_turn");
    await executeEnemyTurn();

    setIsExecuting(false);
  };

  // リトライ
  const handleRetry = () => {
    restoreFromSnapshot();
    setShowDefeat(false);
    setBattlePhase("player_turn");
    addLog("🔄 やり直し！");
  };

  // 次のステージへ
  const goToNextStage = () => {
    if (currentStageIndex < STAGES.length - 1) {
      const nextStageIdx = currentStageIndex + 1;
      setCurrentStageIndex(nextStageIdx);
      setCode("");
      setBattleLog([]);
      setShowVictory(false);
      codeEditorRef.current?.clearHighlights();
    } else {
      alert("🎉 おめでとう！全ステージクリア！君は立派なプログラマーだ！");
    }
  };

  // コード入力時のチュートリアル進行
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (showTutorial && stage.tutorialSteps) {
      const currentTutorial = stage.tutorialSteps[tutorialStep];
      if (
        currentTutorial?.waitForAction === "code_input" &&
        newCode.trim().length > 0
      ) {
        advanceTutorial();
      }
    }
  };

  const jumpToTutorialTarget = () => {
    if (!currentTutorial) return;

    if (currentTutorial.waitForAction === "code_input") {
      codeAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      codeEditorRef.current?.focus();
      return;
    }

    if (currentTutorial.waitForAction === "execute") {
      executeButtonRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      executeButtonRef.current?.focus();
    }
  };

  return (
    <div className="battle-screen-container">
      <div className="battle-screen">
        {/* ヘッダー */}
        <header className="battle-header">
          <div className="stage-info">
            <span className="stage-number">ステージ {stage.id}</span>
            <span className="stage-name">{stage.name}</span>
            <span className="turn-info">（ターン {turnCount}）</span>
          </div>
          <div className="learning-goal">🎯 目標: {stage.learningGoal}</div>
          <div className="header-controls">
            <button
              className="debug-toggle-button"
              onClick={() => setShowDebugPanel(!showDebugPanel)}
            >
              {showDebugPanel ? "🔍 パネル非表示" : "🔍 デバッグ"}
            </button>
            <div className="player-status">
              <span className="hp-icon">❤️</span>
              <span className="hp-text">HP: {playerHp}</span>
              {isDefending && <span className="defending-icon">🛡️</span>}
            </div>
          </div>
        </header>

        <div className="battle-main">
          {currentTutorial && tutorialGuide && (
            <section className="tutorial-card" aria-live="polite">
              <div className="tutorial-card-header">
                <div>
                  <div className="tutorial-step-badge">
                    {tutorialGuide.stepLabel}
                  </div>
                  <div className="tutorial-message">
                    {currentTutorial.message}
                  </div>
                </div>
                <div className="tutorial-character" aria-hidden="true">
                  🧙‍♂️
                </div>
              </div>

              {tutorialGuide.sampleCode && (
                <div className="tutorial-sample">
                  <span className="tutorial-sample-label">入力するコード</span>
                  <code>{tutorialGuide.sampleCode}</code>
                </div>
              )}

              <div className="tutorial-actions">
                {currentTutorial.waitForAction === "none" ? (
                  <button className="tutorial-next" onClick={advanceTutorial}>
                    次へ →
                  </button>
                ) : (
                  <>
                    <button
                      className="tutorial-jump"
                      onClick={jumpToTutorialTarget}
                    >
                      {tutorialGuide.jumpLabel}
                    </button>
                    <button className="tutorial-skip" onClick={advanceTutorial}>
                      スキップ
                    </button>
                  </>
                )}
              </div>

              <div className="tutorial-helper">{tutorialGuide.helperText}</div>
            </section>
          )}

          {/* バトルフィールド */}
          <div className="battle-field">
            <div ref={canvasRef} className="battle-canvas" />

            {/* プレイヤー情報 */}
            <div className="character-info player">
              <div className="character-name">🧙 プレイヤー</div>
              <div className="hp-bar-container">
                <div
                  className="hp-bar player"
                  style={{ width: `${playerHp}%` }}
                />
              </div>
            </div>

            {/* 敵情報 */}
            <div className="character-info enemy">
              <div className="character-name">👾 {stage.enemyName}</div>
              <div className="hp-bar-container">
                <div
                  className="hp-bar enemy"
                  style={{ width: `${(enemyHp / stage.enemyHp) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* コードエディタエリア */}
        <div className="code-area" ref={codeAreaRef}>
          {currentTutorial?.waitForAction === "code_input" && (
            <div className="code-task-card">
              <div className="code-task-title">最初の一行</div>
              <div className="code-task-body">
                下のお手本をそのまま入力してください。
              </div>
              <pre className="code-task-sample">{stage.sampleCode}</pre>
            </div>
          )}

          <CodeEditor
            ref={codeEditorRef}
            value={code}
            onChange={handleCodeChange}
            disabled={isExecuting}
            placeholder={`例: ${stage.sampleCode.split("\n")[0]}`}
          />

          {/* バトルログ */}
          {battleLog.length > 0 && (
            <div className="battle-log">
              {battleLog.map((log, index) => (
                <div
                  key={index}
                  className={`log-entry ${
                    log.includes("[damage]")
                      ? "damage"
                      : log.includes("[success]")
                        ? "success"
                        : log.includes("[block]")
                          ? "block"
                          : ""
                  }`}
                >
                  {log.replace(/\[(normal|damage|success|block)\]\s*/, "")}
                </div>
              ))}
            </div>
          )}

          {/* ボタンエリア */}
          <div className="button-area">
            <button className="hint-button" onClick={() => setShowHint(true)}>
              📖 ヒント
            </button>
            <button
              ref={executeButtonRef}
              className="execute-button"
              onClick={executeCode}
              disabled={isExecuting || !code.trim()}
            >
              {isExecuting ? "⏳ 詠唱中..." : "▶️ 呪文を唱える！"}
            </button>
          </div>
        </div>

        {/* ヒントモーダル */}
        {showHint && (
          <div className="hint-modal" onClick={() => setShowHint(false)}>
            <div className="hint-content" onClick={(e) => e.stopPropagation()}>
              <h2 className="hint-title">💡 ヒント</h2>
              <p className="hint-text" style={{ whiteSpace: "pre-line" }}>
                {stage.hint}
              </p>
              <div className="sample-code">
                <h3>📝 お手本コード</h3>
                <pre>{stage.sampleCode}</pre>
              </div>
              <button className="hint-close" onClick={() => setShowHint(false)}>
                わかった！
              </button>
            </div>
          </div>
        )}

        {/* 勝利画面 */}
        {showVictory && (
          <div className="victory-screen">
            <h1 className="victory-title">🎉 勝利！</h1>
            <p className="victory-message">{stage.successMessage}</p>
            <button className="next-stage-button" onClick={goToNextStage}>
              {currentStageIndex < STAGES.length - 1
                ? "次のステージへ →"
                : "🏆 ゲームクリア！"}
            </button>
          </div>
        )}

        {/* 敗北画面 */}
        {showDefeat && (
          <div className="defeat-screen">
            <h1 className="defeat-title">💀 やられた...</h1>
            <p className="defeat-message">
              {lastDamageBlocked > 0
                ? `防御で${lastDamageBlocked}ダメージを防いだけど...`
                : "防御() を使うとダメージを半減できるよ！"}
            </p>
            <button className="retry-button" onClick={handleRetry}>
              🔄 このターンからやり直す
            </button>
          </div>
        )}
      </div>

      {/* デバッグパネル */}
      {showDebugPanel && (
        <aside className="debug-panel-sidebar">
          <DebugPanel />
        </aside>
      )}
    </div>
  );
}

// パースエラーを子供向けに変換
function formatFriendlyError(error: {
  message: string;
  location: { start: { line: number; column: number } } | null;
  expected: string[];
  found: string | null;
}): string {
  const line = error.location?.start.line || 1;
  const column = error.location?.start.column || 1;
  const expectedStr = error.expected.join(" または ");

  if (error.message.includes("Expected")) {
    if (expectedStr.includes(")") || expectedStr.includes("）")) {
      return `${line}行目：閉じカッコ ) が足りないよ`;
    }
    if (expectedStr.includes("(") || expectedStr.includes("（")) {
      return `${line}行目：開きカッコ ( が足りないよ`;
    }
    if (expectedStr.includes("}")) {
      return `${line}行目：閉じブロック } が足りないよ`;
    }
    if (expectedStr.includes("{")) {
      return `${line}行目：開きブロック { が足りないよ`;
    }
    if (expectedStr.includes('"') || expectedStr.includes("'")) {
      return `${line}行目：文字列のクォーテーション " が足りないよ`;
    }
  }

  return `${line}行目${column}列目：コードの書き方がおかしいよ`;
}

export default BattleScreen;
