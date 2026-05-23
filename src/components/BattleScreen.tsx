import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
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
import { IntentDisplay } from "./IntentDisplay";
import {
  editorCardVariants,
  shouldRunCodeAfterCardAnimation,
  type EditorCardMotionState,
} from "./editorCardMotion";
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
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [editorCardMotionState, setEditorCardMotionState] =
    useState<EditorCardMotionState>("entering");
  const canvasRef = useRef<HTMLDivElement>(null);
  const codeEditorRef = useRef<CodeEditorRef>(null);
  const pendingCodeRunRef = useRef(false);

  // Zustand ストアから状態を取得
  const {
    playerHp,
    enemyHp,
    isStepMode,
    battlePhase,
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
  const enemyHpPercent = Math.max(0, (enemyHp / stage.enemyHp) * 100);
  const phaseTitle =
    battlePhase === "player_turn"
      ? "準備フェーズ"
      : battlePhase === "executing"
        ? "詠唱中"
        : battlePhase === "show_intent"
          ? "敵の予兆"
          : battlePhase === "enemy_turn"
            ? "戦闘フェーズ"
            : battlePhase === "victory"
              ? "勝利"
              : "敗北";
  const phaseSubText =
    battlePhase === "player_turn"
      ? "コードを編集中"
      : battlePhase === "executing"
        ? "コードを実行中"
        : battlePhase === "enemy_turn"
          ? "敵が行動中"
          : "戦況を確認中";

  const playEditorCardEnterAnimation = useCallback(() => {
    pendingCodeRunRef.current = false;
    setEditorCardMotionState("entering");
    return requestAnimationFrame(() => {
      setEditorCardMotionState("ready");
    });
  }, []);

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

  useEffect(() => {
    if (battlePhase !== "player_turn" || showVictory || showDefeat) return;

    const animationFrame = playEditorCardEnterAnimation();

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [
    battlePhase,
    turnCount,
    showVictory,
    showDefeat,
    playEditorCardEnterAnimation,
  ]);

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
      playEditorCardEnterAnimation();
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
      playEditorCardEnterAnimation();
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

  const handleConfirmCode = () => {
    if (
      isExecuting ||
      !code.trim() ||
      editorCardMotionState !== "ready" ||
      pendingCodeRunRef.current
    ) {
      return;
    }

    pendingCodeRunRef.current = true;
    setEditorCardMotionState("submitting");
  };

  const handleEditorCardAnimationComplete = (definition: unknown) => {
    if (
      shouldRunCodeAfterCardAnimation(editorCardMotionState, definition) &&
      pendingCodeRunRef.current
    ) {
      pendingCodeRunRef.current = false;
      void executeCode();
    }
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

  return (
    <div className="battle-screen-container">
      <div className="battle-screen">
        <header className="battle-header">
          <div className="game-brand">
            <span className="brand-mark">◆</span>
            <span className="brand-title">KotobaQuest</span>
          </div>
          <div className="stage-info">
            <span className="stage-number">フロア {stage.id}</span>
            <span className="stage-name">{stage.name}</span>
          </div>
          <div className="resource-strip" aria-label="プレイヤーステータス">
            <span className="resource-item hp-resource">♥ {playerHp}/100</span>
            <span className="resource-item">✦ {turnCount}</span>
            <span className="resource-item">目標: {stage.learningGoal}</span>
          </div>
          <div className="header-controls">
            <button
              className="debug-toggle-button"
              onClick={() => setShowDebugPanel(!showDebugPanel)}
            >
              {showDebugPanel ? "🔍 パネル非表示" : "🔍 デバッグ"}
            </button>
            {isDefending && <span className="defending-icon">防御中</span>}
          </div>
        </header>

        <div className="battle-field">
          <div ref={canvasRef} className="battle-canvas" />

          <div className="phase-banner" aria-label="現在のフェーズ">
            <div className="phase-chip active">
              <span className="phase-title">{phaseTitle}</span>
              <span className="phase-subtext">{phaseSubText}</span>
            </div>
            <div className="phase-arrow">›</div>
            <div className="phase-chip muted">
              <span className="phase-title">戦闘フェーズ</span>
              <span className="phase-subtext">自動で戦闘が進行</span>
            </div>
          </div>

          <div className="character-info player">
            <div className="character-name">コードナイト</div>
            <div className="hp-bar-container">
              <div
                className="hp-bar player"
                style={{ width: `${playerHp}%` }}
              />
            </div>
            <div className="combat-stats">
              <span>剣 7</span>
              <span>盾 {isDefending ? 8 : 5}</span>
            </div>
          </div>

          <div className="character-info enemy">
            <div className="character-name">{stage.enemyName}</div>
            <div className="hp-bar-container">
              <div
                className="hp-bar enemy"
                style={{ width: `${enemyHpPercent}%` }}
              />
            </div>
            <div className="combat-stats">
              <span>牙 10</span>
              <span>盾 5</span>
            </div>
          </div>

          {battlePhase === "player_turn" && (
            <aside className="enemy-intel-panel">
              <IntentDisplay />
            </aside>
          )}
        </div>

        {/* コードエディタエリア */}
        <motion.div
          className="code-area code-workbench"
          variants={editorCardVariants}
          initial="entering"
          animate={editorCardMotionState}
          onAnimationComplete={handleEditorCardAnimationComplete}
        >
          <div className="code-workbench-tabs" aria-label="コードエディター">
            <div className="code-tab command-tab">コマンド一覧</div>
            <div className="code-tab active-tab">戦闘ロジック</div>
            <div className="code-tab file-tab">main.logic</div>
            <div className="code-tab add-tab" aria-hidden="true">
              +
            </div>
          </div>

          <div className="code-workbench-body">
            <section className="code-editor-panel" aria-label="戦闘ロジック">
              <CodeEditor
                ref={codeEditorRef}
                value={code}
                onChange={handleCodeChange}
                disabled={isExecuting}
                placeholder={`例: ${stage.sampleCode.split("\n")[0]}`}
              />
            </section>

            <aside className="execution-preview" aria-label="実行プレビュー">
              <div className="execution-preview-header">実行プレビュー</div>
              <div className="execution-preview-list">
                {battleLog.length > 0 ? (
                  battleLog.slice(-4).map((log, index) => (
                    <div
                      key={`${index}-${log}`}
                      className={`preview-step ${
                        log.includes("[damage]")
                          ? "damage"
                          : log.includes("[success]")
                            ? "success"
                            : log.includes("[block]")
                              ? "block"
                              : ""
                      }`}
                    >
                      <span className="preview-step-index">{index + 1}</span>
                      <span>
                        {log.replace(/\[(normal|damage|success|block)\]\s*/, "")}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="preview-step empty">
                    <span className="preview-step-index">1</span>
                    <span>コード待機中</span>
                  </div>
                )}
              </div>
            </aside>
          </div>

          <div className="code-workbench-footer">
            <div className="utility-actions">
              <button className="hint-button" onClick={() => setShowHint(true)}>
                📖 ヒント
              </button>
              <button
                className="hint-button"
                onClick={() => {
                  setCode("");
                  codeEditorRef.current?.clearHighlights();
                  codeEditorRef.current?.clearError();
                }}
                disabled={isExecuting || !code}
              >
                ↺ リセット
              </button>
            </div>
            <button
              className="execute-button"
              onClick={handleConfirmCode}
              disabled={
                isExecuting || !code.trim() || editorCardMotionState !== "ready"
              }
            >
              {isExecuting || editorCardMotionState === "submitting"
                ? "詠唱中..."
                : "コード確定"}
            </button>
          </div>
        </motion.div>

        {/* チュートリアルオーバーレイ */}
        {showTutorial &&
          stage.tutorialSteps &&
          stage.tutorialSteps[tutorialStep] && (
            <div
              className={`tutorial-overlay ${
                stage.tutorialSteps[tutorialStep].waitForAction !== "none"
                  ? "non-blocking"
                  : ""
              }`}
            >
              <div className="tutorial-bubble">
                <div className="tutorial-character">🧙‍♂️</div>
                <div className="tutorial-message">
                  {stage.tutorialSteps[tutorialStep].message}
                </div>
                {stage.tutorialSteps[tutorialStep].waitForAction === "none" && (
                  <button className="tutorial-next" onClick={advanceTutorial}>
                    次へ →
                  </button>
                )}
                {stage.tutorialSteps[tutorialStep].waitForAction !== "none" && (
                  <div className="tutorial-hint">
                    👆 上の操作を行うと次に進むよ
                  </div>
                )}
              </div>
            </div>
          )}

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
