import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react";
import { motion } from "framer-motion";
import {
  initBattleScene,
  playAttackAnimation,
  updateEnemyAppearance,
  playDefeatAnimation,
  playEnemyAttackAnimation,
  settlePlayerAttackSequence,
  destroyBattleScene,
} from "../game/BattleScene";
import { parse } from "../parser/parser";
import { SpellExecutor, type GameAction } from "../engine/SpellExecutor";
import { CardCommandBuilder } from "./CardCommandBuilder";
import { CodeEditor, type CodeEditorRef } from "./CodeEditor";
import { IntroDialogue } from "./IntroDialogue";
import { getBattleFieldPresentation } from "./battlePresentation";
import { parseCombatLogEntry } from "./combatText";
import {
  editorCardVariants,
  getEditorCardClassName,
  isBattleCommandSurfaceOpen,
  isPreparationDeskOpen,
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
  const [showVictory, setShowVictory] = useState(false);
  const [showDefeat, setShowDefeat] = useState(false);
  const [introDialogueState, setIntroDialogueState] = useState({
    stageIndex: 0,
    index: 0,
  });
  const [cardBuilderResetKey, setCardBuilderResetKey] = useState(0);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [editorCardMotionState, setEditorCardMotionState] =
    useState<EditorCardMotionState>("entering");
  const canvasRef = useRef<HTMLDivElement>(null);
  const codeEditorRef = useRef<CodeEditorRef>(null);
  const pendingCodeRunRef = useRef(false);

  // Zustand ストアから状態を取得
  const {
    playerHp,
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
  const introDialogueIndex =
    introDialogueState.stageIndex === currentStageIndex
      ? introDialogueState.index
      : 0;
  const activeIntroLine =
    introDialogueIndex >= 0 ? stage.introDialogue[introDialogueIndex] : null;
  const isIntroDialogueOpen = Boolean(activeIntroLine);
  const battleFieldPresentation = getBattleFieldPresentation(battlePhase);
  const isPreparationDeskVisible = isPreparationDeskOpen({
    battlePhase,
    isIntroDialogueOpen,
    showVictory,
    showDefeat,
  });
  const isBattleCommandSurfaceVisible = isBattleCommandSurfaceOpen({
    battlePhase,
    isIntroDialogueOpen,
    showVictory,
    showDefeat,
  });
  const shouldRenderCommandSurface =
    !showVictory &&
    !showDefeat &&
    (isBattleCommandSurfaceVisible || editorCardMotionState === "submitting");
  const isCommandInputDisabled =
    isExecuting || editorCardMotionState !== "ready";
  const battleFieldClassName = `${battleFieldPresentation.className}${
    isPreparationDeskVisible ? " is-preparation-hidden" : ""
  }`;
  const floatingCombatText = battleLog.slice(-3).map((log) => ({
    raw: log,
    ...parseCombatLogEntry(log),
  }));
  const phaseIconSteps = [
    {
      id: "player_turn",
      phases: ["player_turn"],
      icon: "I",
      label: "作戦",
    },
    {
      id: "executing",
      phases: ["executing"],
      icon: "C",
      label: "実行",
    },
    {
      id: "show_intent",
      phases: ["show_intent"],
      icon: "!",
      label: "予兆",
    },
    {
      id: "enemy_turn",
      phases: ["enemy_turn"],
      icon: "X",
      label: "敵行動",
    },
  ];

  const playEditorCardEnterAnimation = useCallback(() => {
    pendingCodeRunRef.current = false;
    setEditorCardMotionState("entering");
    return requestAnimationFrame(() => {
      setEditorCardMotionState("ready");
    });
  }, []);

  const scheduleEditorCardEnterAnimation = useCallback(() => {
    let readyAnimationFrame = 0;
    const enterAnimationFrame = requestAnimationFrame(() => {
      readyAnimationFrame = playEditorCardEnterAnimation();
    });

    return () => {
      cancelAnimationFrame(enterAnimationFrame);
      cancelAnimationFrame(readyAnimationFrame);
    };
  }, [playEditorCardEnterAnimation]);

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

    return scheduleEditorCardEnterAnimation();
  }, [
    battlePhase,
    turnCount,
    showVictory,
    showDefeat,
    scheduleEditorCardEnterAnimation,
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
      await playAttackAnimation(action.attackType, action.damage);
      const newHp = Math.max(0, currentEnemyHp - action.damage);
      return newHp;
    }
    if (action.type === "meaning") {
      await playAttackAnimation("normal", action.amount);
      const newHp = Math.max(0, currentEnemyHp - action.amount);
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

  const closeIntroDialogue = () => {
    setIntroDialogueState({ stageIndex: currentStageIndex, index: -1 });
  };

  const advanceIntroDialogue = () => {
    if (introDialogueIndex < stage.introDialogue.length - 1) {
      setIntroDialogueState({
        stageIndex: currentStageIndex,
        index: introDialogueIndex + 1,
      });
      return;
    }

    closeIntroDialogue();
  };

  // コードを実行する関数
  const executeCode = async () => {
    if (isExecuting || !code.trim()) return;

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
    let totalImpact = 0;
    let usedMeaningAction = false;
    let playedAttackSequence = false;

    for (const action of result.actions) {
      if (action.type === "attack") {
        playedAttackSequence = true;
        totalImpact += action.damage;
        currentEnemyHp = await executeAction(action, currentEnemyHp);
        useGameStore.getState().damageEnemy(action.damage);
      } else if (action.type === "meaning") {
        playedAttackSequence = true;
        totalImpact += action.amount;
        usedMeaningAction = true;
        currentEnemyHp = await executeAction(action, currentEnemyHp);
        useGameStore.getState().damageEnemy(action.amount);
      } else if (action.type === "heal") {
        useGameStore.getState().healPlayer(action.amount);
      }
    }

    // 敵HPのビジュアル更新
    const finalEnemyHp = useGameStore.getState().enemyHp;
    updateEnemyAppearance(finalEnemyHp / stage.enemyHp);

    if (totalImpact > 0) {
      addLog(
        usedMeaningAction
          ? `${stage.enemyName}の意味がほどけた！`
          : `${stage.enemyName}に合計${totalImpact}ダメージ！`,
        usedMeaningAction ? "success" : "damage",
      );

      // 敵を倒したか
      if (finalEnemyHp <= 0) {
        await playDefeatAnimation();
        await settlePlayerAttackSequence();
        addLog(`${stage.enemyName}を倒した！`, "success");
        setBattlePhase("victory");
        setShowVictory(true);
        setIsExecuting(false);
        return;
      }
    }

    if (playedAttackSequence) {
      await settlePlayerAttackSequence();
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
      setCardBuilderResetKey((current) => current + 1);
    } else {
      alert("🎉 おめでとう！全ステージクリア！君は立派なプログラマーだ！");
    }
  };

  // コード入力時のチュートリアル進行
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  return (
    <div className="battle-screen-container">
      <div className="battle-screen">
        <div
          className={battleFieldClassName}
          aria-label={battleFieldPresentation.overlayLabel}
          aria-hidden={isPreparationDeskVisible}
        >
          <div ref={canvasRef} className="battle-canvas" />
          <div className="battle-phase-light" aria-hidden="true" />
          {!isPreparationDeskVisible && (
            <div className="floating-combat-text" aria-live="polite">
              {floatingCombatText.map((entry, index) => (
                <div
                  key={`${entry.raw}-${index}`}
                  className={`combat-text-pop ${entry.type}`}
                  style={{ "--combat-text-index": index } as CSSProperties}
                >
                  {entry.message}
                </div>
              ))}
            </div>
          )}
          {!isPreparationDeskVisible && (
            <div className="phase-icon-strip" aria-label="現在のフェーズ">
              {phaseIconSteps.map((step) => (
                <span
                  key={step.id}
                  className={`phase-icon ${
                    step.phases.includes(battlePhase) ? "active" : ""
                  }`}
                  aria-label={step.label}
                  title={step.label}
                >
                  {step.icon}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* コードエディタエリア */}
        {!isIntroDialogueOpen && shouldRenderCommandSurface && (
          <motion.div
            className={getEditorCardClassName(
              editorCardMotionState,
              isPreparationDeskVisible ? "desk" : "battle",
            )}
            variants={editorCardVariants}
            initial="entering"
            animate={editorCardMotionState}
            onAnimationComplete={handleEditorCardAnimationComplete}
            style={{
              pointerEvents:
                editorCardMotionState === "ready" ? "auto" : "none",
            }}
          >
            {isPreparationDeskVisible && (
              <>
                <div className="desk-surface" aria-hidden="true" />
                <div className="desk-stage-note">
                  <span className="desk-phase-label">準備</span>
                  <span className="desk-stage-name">{stage.name}</span>
                  <span className="desk-enemy-context">
                    {stage.enemyTrait}
                  </span>
                </div>
              </>
            )}
            <section className="code-editor-panel" aria-label="戦闘ロジック">
              <CodeEditor
                ref={codeEditorRef}
                value={code}
                onChange={handleCodeChange}
                disabled={isCommandInputDisabled}
                placeholder={`例: ${stage.sampleCode.split("\n")[0]}`}
              />
            </section>

            <CardCommandBuilder
              key={`${stage.id}-${cardBuilderResetKey}`}
              stageId={stage.id}
              onCodeChange={handleCodeChange}
              disabled={isCommandInputDisabled}
            />

            <button
              className="execute-button"
              onClick={handleConfirmCode}
              disabled={isCommandInputDisabled || !code.trim()}
            >
              {isExecuting || editorCardMotionState === "submitting"
                ? "詠唱中..."
                : "コード確定"}
            </button>
          </motion.div>
        )}

        {activeIntroLine && (
          <IntroDialogue
            line={activeIntroLine}
            playerPortraitUrl={stage.mentorPortraitUrl}
            isLastLine={introDialogueIndex === stage.introDialogue.length - 1}
            onNext={advanceIntroDialogue}
            onSkip={closeIntroDialogue}
          />
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
