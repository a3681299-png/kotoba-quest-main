import { useMemo, useState } from "react";
import CodeEditor from "./CodeEditor";
import {
  STAGE_ONE_DEFINITION,
  type StageOneEnemyAction,
  type StageOneEnemyDefinition,
  type StageOneWaveDefinition,
  type StageOneSpell,
} from "../data/stageOnePlaytest";
import "./StageOnePlaytest.css";

type ParsedCommand =
  | { type: "cast"; spell: StageOneSpell; line: number; source: string }
  | { type: "defend"; line: number; source: string };

type LogTone = "system" | "player" | "enemy" | "success" | "failure";

interface RunLog {
  tone: LogTone;
  text: string;
}

interface RuntimeEnemyState {
  definition: StageOneEnemyDefinition;
  hp: number;
}

interface StageRuntimeState {
  playerHp: number;
  currentMp: number;
  currentMaxMp: number;
  globalTurn: number;
}

interface WaveAttemptResult {
  success: boolean;
  turnsSpent: number;
  commandsUsed: number;
  endingState: StageRuntimeState;
  logs: RunLog[];
  failureReason?: string;
}

const SPELL_DAMAGE: Record<StageOneSpell, number> = {
  フレイム: 14,
  アクア: 14,
  スパーク: 14,
};

const WEAKNESS_MULTIPLIER = 1.7;
const DEFENDING_MULTIPLIER = 0.5;
const PLAYER_DEFEND_MULTIPLIER = 0.5;
const SPELL_COST = 10;

const SPELL_ALIASES: Record<string, StageOneSpell> = {
  フレイム: "フレイム",
  アクア: "アクア",
  スパーク: "スパーク",
};

function getInitialRuntimeState(): StageRuntimeState {
  return {
    playerHp: STAGE_ONE_DEFINITION.startingPlayerHp,
    currentMp: STAGE_ONE_DEFINITION.startingMaxMp,
    currentMaxMp: STAGE_ONE_DEFINITION.startingMaxMp,
    globalTurn: 1,
  };
}

export function StageOnePlaytest() {
  const stage = STAGE_ONE_DEFINITION;
  const [currentWaveIndex, setCurrentWaveIndex] = useState<number>(0);
  const [runtimeState, setRuntimeState] =
    useState<StageRuntimeState>(getInitialRuntimeState);
  const [code, setCode] = useState<string>("");
  const [stageCleared, setStageCleared] = useState<boolean>(false);
  const [lastAttempt, setLastAttempt] = useState<WaveAttemptResult | null>(null);
  const [stageLogs, setStageLogs] = useState<RunLog[]>([
    {
      tone: "system",
      text: "Stage 1 を開始しました。Wave 1 のコードを入力してください。",
    },
  ]);
  const [parseError, setParseError] = useState<string | null>(null);

  const stageSummary = useMemo(() => {
    return {
      enemyCount: stage.waves.reduce((sum, wave) => sum + wave.enemies.length, 0),
      totalEnemyHp: stage.waves.reduce(
        (sum, wave) =>
          sum +
          wave.enemies.reduce((waveSum, enemy) => waveSum + enemy.maxHp, 0),
        0,
      ),
    };
  }, [stage]);

  const currentWave = stage.waves[currentWaveIndex] ?? null;

  const handleLoadSample = () => {
    if (!currentWave) {
      return;
    }
    setCode(currentWave.sampleCode);
    setParseError(null);
  };

  const handleResetStage = () => {
    setCurrentWaveIndex(0);
    setRuntimeState(getInitialRuntimeState());
    setCode("");
    setStageCleared(false);
    setLastAttempt(null);
    setParseError(null);
    setStageLogs([
      {
        tone: "system",
        text: "Stage 1 をリセットしました。Wave 1 のコードを入力してください。",
      },
    ]);
  };

  const handleRun = () => {
    if (!currentWave || stageCleared) {
      return;
    }

    const parsed = parseStageOneCode(code);
    if (!parsed.ok) {
      setParseError(parsed.error);
      setLastAttempt(null);
      return;
    }

    const attempt = simulateWave(currentWave, parsed.commands, runtimeState);
    setParseError(null);
    setLastAttempt(attempt);

    if (attempt.success) {
      setRuntimeState(attempt.endingState);
      const isFinalWave = currentWaveIndex === stage.waves.length - 1;
      if (isFinalWave) {
        setStageCleared(true);
        setCode("");
        setStageLogs((prev) => [
          ...prev,
          ...attempt.logs,
          {
            tone: "success",
            text: "Stage 1 を最後までクリアしました。必要ならリセットして再挑戦できます。",
          },
        ]);
        return;
      }

      const nextWave = stage.waves[currentWaveIndex + 1];
      setCurrentWaveIndex((prev) => prev + 1);
      setCode("");
      setStageLogs((prev) => [
        ...prev,
        ...attempt.logs,
        {
          tone: "system",
          text: `Wave ${currentWave.id} クリア。コードをリセットしました。Wave ${nextWave.id} の入力を始めてください。`,
        },
      ]);
      return;
    }

    setStageLogs((prev) => [
      ...prev,
      ...attempt.logs,
      {
        tone: "system",
        text: `Wave ${currentWave.id} は開始時点の HP ${runtimeState.playerHp} / MP ${runtimeState.currentMp} に戻して再挑戦できます。`,
      },
    ]);
  };

  return (
    <div className="stage-one-shell">
      <header className="stage-one-hero">
        <div className="stage-one-hero-copy">
          <p className="stage-one-kicker">Playable Stage Prototype</p>
          <h1>Stage 1 試作実装</h1>
          <p>
            いま決まっている Stage1 仕様を、実際にコードを書いて確かめるための試作ページです。
            Wave をクリアするとコード欄は空に戻り、次の Wave 用の入力に切り替わります。
          </p>
        </div>
        <div className="stage-one-metrics">
          <div>
            <span>現在Wave</span>
            <strong>{stageCleared ? "完了" : `Wave ${currentWaveIndex + 1}`}</strong>
          </div>
          <div>
            <span>現在HP</span>
            <strong>{runtimeState.playerHp}</strong>
          </div>
          <div>
            <span>現在MP</span>
            <strong>{runtimeState.currentMp}</strong>
          </div>
          <div>
            <span>現在最大MP</span>
            <strong>{runtimeState.currentMaxMp}</strong>
          </div>
        </div>
      </header>

      <div className="stage-one-layout">
        <aside className="stage-one-sidebar">
          <section className="stage-one-panel">
            <h2>ルール</h2>
            <ul className="stage-one-list">
              {stage.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </section>

          <section className="stage-one-panel">
            <h2>ウェーブ構成</h2>
            <div className="stage-one-wave-list">
              {stage.waves.map((wave, index) => {
                const isCurrent = !stageCleared && index === currentWaveIndex;
                const isCleared = index < currentWaveIndex || stageCleared;
                return (
                  <article
                    key={wave.id}
                    className={`stage-one-wave-card ${
                      isCurrent ? "active" : ""
                    } ${isCleared ? "cleared" : ""}`}
                  >
                    <div className="stage-one-wave-head">
                      <span>Wave {wave.id}</span>
                      <strong>{wave.name}</strong>
                    </div>
                    <p>{wave.learningGoal}</p>
                    <ul className="stage-one-list compact">
                      {wave.enemies.map((enemy) => (
                        <li key={enemy.id}>
                          {enemy.name}: 弱点は {enemy.weakness}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="stage-one-panel">
            <h2>ステージ概要</h2>
            <div className="stage-one-summary-grid">
              <div>
                <span>敵総数</span>
                <strong>{stageSummary.enemyCount}</strong>
              </div>
              <div>
                <span>敵総HP</span>
                <strong>{stageSummary.totalEnemyHp}</strong>
              </div>
              <div>
                <span>開始HP</span>
                <strong>{stage.startingPlayerHp}</strong>
              </div>
              <div>
                <span>開始最大MP</span>
                <strong>{stage.startingMaxMp}</strong>
              </div>
            </div>
          </section>
        </aside>

        <main className="stage-one-main">
          <section className="stage-one-panel">
            <div className="stage-one-panel-head">
              <div>
                <p className="stage-one-kicker">コード入力</p>
                <h2>
                  {stageCleared
                    ? "Stage 1 クリア済み"
                    : `Wave ${currentWave?.id}: ${currentWave?.name}`}
                </h2>
              </div>
              <div className="stage-one-button-row">
                <button
                  type="button"
                  className="ghost"
                  onClick={handleLoadSample}
                  disabled={!currentWave || stageCleared}
                >
                  このWaveのお手本
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setCode("")}
                  disabled={stageCleared}
                >
                  入力を空にする
                </button>
                <button type="button" className="ghost" onClick={handleResetStage}>
                  ステージをリセット
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={handleRun}
                  disabled={!currentWave || stageCleared}
                >
                  Waveを実行
                </button>
              </div>
            </div>

            <div className="stage-one-syntax-banner">
              仮構文: `使用(フレイム)` `使用(アクア)` `使用(スパーク)` `ぼうぎょする()`
            </div>

            {!stageCleared && currentWave && (
              <p className="stage-one-wave-guide">
                Wave {currentWave.id} を突破すると、コード欄は空になって次の Wave 入力に切り替わります。
              </p>
            )}

            <CodeEditor
              value={code}
              onChange={setCode}
              placeholder={
                stageCleared
                  ? "Stage 1 はクリア済みです。"
                  : `Wave ${currentWave?.id ?? 1} のコードを入力`
              }
              disabled={stageCleared}
            />

            {parseError && <p className="stage-one-error">{parseError}</p>}
          </section>

          <section className="stage-one-grid">
            <article className="stage-one-panel">
              <h2>現在の敵ヒント</h2>
              {currentWave ? (
                <section className="stage-one-enemy-section current">
                  <h3>
                    Wave {currentWave.id}: {currentWave.name}
                  </h3>
                  <p>{currentWave.learningGoal}</p>
                  {currentWave.enemies.map((enemy) => (
                    <div key={enemy.id} className="stage-one-enemy-card">
                      <div className="stage-one-enemy-header">
                        <strong>{enemy.name}</strong>
                        <span>HP {enemy.maxHp}</span>
                      </div>
                      <ul className="stage-one-list compact">
                        {enemy.visibleHints.map((hint) => (
                          <li key={hint}>{hint}</li>
                        ))}
                        {enemy.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              ) : (
                <div className="stage-one-empty-state">
                  <p>すべての Wave を突破しました。</p>
                </div>
              )}
            </article>

            <article className="stage-one-panel">
              <h2>進行ログ</h2>
              <div className="stage-one-result-summary">
                <div>
                  <span>ステータス</span>
                  <strong>
                    {stageCleared
                      ? "Stage 1 クリア"
                      : currentWave
                        ? `Wave ${currentWave.id} 挑戦中`
                        : "完了"}
                  </strong>
                </div>
                <div>
                  <span>総ターン</span>
                  <strong>{Math.max(runtimeState.globalTurn - 1, 0)}</strong>
                </div>
                <div>
                  <span>残りHP / MP</span>
                  <strong>
                    {runtimeState.playerHp} / {runtimeState.currentMp}
                  </strong>
                </div>
                <div>
                  <span>直前の結果</span>
                  <strong>
                    {lastAttempt
                      ? lastAttempt.success
                        ? "Waveクリア"
                        : "失敗"
                      : "未実行"}
                  </strong>
                </div>
              </div>

              {lastAttempt && !lastAttempt.success && lastAttempt.failureReason && (
                <p className="stage-one-failure-reason">
                  失敗理由: {lastAttempt.failureReason}
                </p>
              )}

              <div className="stage-one-log">
                {stageLogs.map((entry, index) => (
                  <div
                    key={`${index}-${entry.text}`}
                    className={`stage-one-log-entry ${entry.tone}`}
                  >
                    {entry.text}
                  </div>
                ))}
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}

function parseStageOneCode(
  code: string,
): { ok: true; commands: ParsedCommand[] } | { ok: false; error: string } {
  const commands: ParsedCommand[] = [];
  const lines = code.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const source = lines[index];
    const trimmed = source.trim();
    const line = index + 1;

    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const castMatch = trimmed.match(
      /^使用[\s　]*[（(][\s　]*([ァ-ヶー]+)[\s　]*[）)]$/,
    );
    if (castMatch) {
      const spell = SPELL_ALIASES[castMatch[1]];
      if (!spell) {
        return {
          ok: false,
          error: `${line}行目: 使える魔法は フレイム / アクア / スパーク です。`,
        };
      }
      commands.push({ type: "cast", spell, line, source: trimmed });
      continue;
    }

    const defendMatch = trimmed.match(
      /^(ぼうぎょする|防御)[\s　]*(?:[（(][\s　]*[）)])?$/,
    );
    if (defendMatch) {
      commands.push({ type: "defend", line, source: trimmed });
      continue;
    }

    return {
      ok: false,
      error: `${line}行目: Stage1 では 使用(フレイム) / 使用(アクア) / 使用(スパーク) / ぼうぎょする() だけ使えます。`,
    };
  }

  if (commands.length === 0) {
    return {
      ok: false,
      error: "コードが空です。1行以上書いてください。",
    };
  }

  return { ok: true, commands };
}

function simulateWave(
  wave: StageOneWaveDefinition,
  commands: ParsedCommand[],
  initialState: StageRuntimeState,
): WaveAttemptResult {
  const logs: RunLog[] = [];
  const enemies = wave.enemies.map<RuntimeEnemyState>((enemy) => ({
    definition: enemy,
    hp: enemy.maxHp,
  }));

  let playerHp = initialState.playerHp;
  let currentMp = initialState.currentMp;
  let currentMaxMp = initialState.currentMaxMp;
  let globalTurn = initialState.globalTurn;
  let waveTurn = 1;
  let commandIndex = 0;

  while (enemies.some((enemy) => enemy.hp > 0)) {
    const aliveEnemies = enemies.filter((enemy) => enemy.hp > 0);

    if (commandIndex >= commands.length) {
      return {
        success: false,
        turnsSpent: waveTurn - 1,
        commandsUsed: commandIndex,
        endingState: {
          playerHp,
          currentMp,
          currentMaxMp,
          globalTurn,
        },
        failureReason: "コードが足りなくなりました。",
        logs: [
          ...logs,
          {
            tone: "failure",
            text: `Wave ${wave.id} の途中でコードが尽きました。入力を見直してください。`,
          },
        ],
      };
    }

    const command = commands[commandIndex];
    const enemyPlans = aliveEnemies.map((enemy) => ({
      enemy,
      action: getEnemyAction(enemy.definition.actionPattern, waveTurn),
    }));

    logs.push({
      tone: "system",
      text: `Turn ${globalTurn} / Wave ${wave.id} 開始。HP ${playerHp} / MP ${currentMp}/${currentMaxMp}`,
    });
    logs.push({
      tone: "player",
      text: `プレイヤー: ${command.source}`,
    });

    let playerDefending = false;
    const target = aliveEnemies[0];

    if (command.type === "cast") {
      if (currentMp < SPELL_COST) {
        return {
          success: false,
          turnsSpent: waveTurn,
          commandsUsed: commandIndex,
          endingState: {
            playerHp,
            currentMp,
            currentMaxMp,
            globalTurn,
          },
          failureReason: "MP不足で魔法が失敗しました。",
          logs: [
            ...logs,
            {
              tone: "failure",
              text: `${command.line}行目の ${command.spell} は MP 不足で失敗しました。`,
            },
          ],
        };
      }

      currentMp -= SPELL_COST;
      const targetPlan = enemyPlans.find(
        (plan) => plan.enemy.definition.id === target.definition.id,
      );
      const damage = calculateSpellDamage(
        command.spell,
        target.definition,
        targetPlan?.action === "defend",
      );
      target.hp = Math.max(0, target.hp - damage);
      logs.push({
        tone: "player",
        text: `${target.definition.name} に ${command.spell}。${damage} ダメージ。`,
      });

      if (target.hp <= 0) {
        logs.push({
          tone: "success",
          text: `${target.definition.name} を倒しました。`,
        });
      }
    } else {
      playerDefending = true;
      logs.push({
        tone: "player",
        text: "防御の構え。受けるダメージを半減します。",
      });
    }

    commandIndex += 1;

    if (!enemies.some((enemy) => enemy.hp > 0)) {
      const nextTurnState = applyTurnRecovery(currentMp, currentMaxMp);
      logs.push({
        tone: "success",
        text: `Wave ${wave.id} を突破しました。コードはここでリセットされます。`,
      });
      logs.push({
        tone: "system",
        text: `ターン終了。最大MP +10、${nextTurnState.recovery} 回復。現在MP ${nextTurnState.nextMp}/${nextTurnState.nextMaxMp}`,
      });
      return {
        success: true,
        turnsSpent: waveTurn,
        commandsUsed: commandIndex,
        endingState: {
          playerHp,
          currentMp: nextTurnState.nextMp,
          currentMaxMp: nextTurnState.nextMaxMp,
          globalTurn: globalTurn + 1,
        },
        logs,
      };
    }

    for (const plan of enemyPlans) {
      if (plan.enemy.hp <= 0) {
        continue;
      }

      if (plan.action === "defend") {
        logs.push({
          tone: "enemy",
          text: `${plan.enemy.definition.name} は身を守っている。`,
        });
        continue;
      }

      const rawDamage = plan.enemy.definition.attackDamage;
      const actualDamage = playerDefending
        ? Math.floor(rawDamage * PLAYER_DEFEND_MULTIPLIER)
        : rawDamage;
      playerHp = Math.max(0, playerHp - actualDamage);
      logs.push({
        tone: "enemy",
        text: `${plan.enemy.definition.name} の攻撃。${actualDamage} ダメージ。`,
      });

      if (playerHp <= 0) {
        return {
          success: false,
          turnsSpent: waveTurn,
          commandsUsed: commandIndex,
          endingState: {
            playerHp: 0,
            currentMp,
            currentMaxMp,
            globalTurn,
          },
          failureReason: "プレイヤーの HP が 0 になりました。",
          logs: [
            ...logs,
            {
              tone: "failure",
              text: "プレイヤーが倒れました。Wave 失敗です。",
            },
          ],
        };
      }
    }

    const nextTurnState = applyTurnRecovery(currentMp, currentMaxMp);
    currentMp = nextTurnState.nextMp;
    currentMaxMp = nextTurnState.nextMaxMp;
    logs.push({
      tone: "system",
      text: `ターン終了。最大MP +10、${nextTurnState.recovery} 回復。現在MP ${currentMp}/${currentMaxMp}`,
    });
    globalTurn += 1;
    waveTurn += 1;
  }

  return {
    success: true,
    turnsSpent: waveTurn - 1,
    commandsUsed: commandIndex,
    endingState: {
      playerHp,
      currentMp,
      currentMaxMp,
      globalTurn,
    },
    logs,
  };
}

function getEnemyAction(
  pattern: StageOneEnemyAction[],
  waveTurn: number,
): StageOneEnemyAction {
  const index = (waveTurn - 1) % pattern.length;
  return pattern[index];
}

function calculateSpellDamage(
  spell: StageOneSpell,
  enemy: StageOneEnemyDefinition,
  enemyDefending: boolean,
): number {
  let damage = SPELL_DAMAGE[spell];
  if (spell === enemy.weakness) {
    damage = Math.floor(damage * WEAKNESS_MULTIPLIER);
  }
  if (enemyDefending) {
    damage = Math.floor(damage * DEFENDING_MULTIPLIER);
  }
  return Math.max(damage, 1);
}

function applyTurnRecovery(currentMp: number, currentMaxMp: number) {
  const nextMaxMp = currentMaxMp + 10;
  const recovery = Math.floor(nextMaxMp / 3);
  const nextMp = Math.min(nextMaxMp, currentMp + recovery);
  return { nextMaxMp, recovery, nextMp };
}
