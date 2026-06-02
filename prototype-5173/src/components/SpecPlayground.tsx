import { useEffect, useMemo, useState } from "react";
import CodeEditor from "./CodeEditor";
import {
  MAGIC_COSTS,
  SPEC_STAGES,
  getAffinityLabel,
  getStageSpecById,
  getStressLabel,
  type EnemySpec,
} from "../data/specPlayground";
import "./SpecPlayground.css";

export type LabMode = "spec" | "stage1" | "prototype";

function nextTurnValues(currentMp: number, currentMaxMp: number) {
  const nextMaxMp = currentMaxMp + 10;
  const recovery = Math.floor(nextMaxMp / 3);
  const nextMp = Math.min(nextMaxMp, currentMp + recovery);
  return { nextMaxMp, recovery, nextMp };
}

export function SpecPlayground() {
  const [selectedStageId, setSelectedStageId] = useState<number>(1);
  const [selectedWaveIndex, setSelectedWaveIndex] = useState<number>(0);
  const [selectedEnemyIndex, setSelectedEnemyIndex] = useState<number>(0);
  const [currentTurn, setCurrentTurn] = useState<number>(1);
  const [currentMaxMp, setCurrentMaxMp] = useState<number>(50);
  const [currentMp, setCurrentMp] = useState<number>(50);
  const [playerCode, setPlayerCode] = useState<string>("");
  const [npcCode, setNpcCode] = useState<string>("");
  const [showHiddenInfo, setShowHiddenInfo] = useState<boolean>(false);
  const [labLog, setLabLog] = useState<string[]>([]);

  const stage = useMemo(
    () => getStageSpecById(selectedStageId),
    [selectedStageId],
  );
  const wave = stage.waves[selectedWaveIndex] ?? stage.waves[0];
  const enemy = wave.enemies[selectedEnemyIndex] ?? wave.enemies[0];

  useEffect(() => {
    setSelectedWaveIndex(0);
    setSelectedEnemyIndex(0);
    setCurrentTurn(1);
    setCurrentMaxMp(stage.startMaxMp);
    setCurrentMp(stage.startMaxMp);
    setPlayerCode(stage.samplePlayerCode);
    setNpcCode(stage.sampleNpcCode ?? "");
    setShowHiddenInfo(false);
    setLabLog([
      `Stage ${stage.id}「${stage.name}」を読み込みました。`,
      `開始時最大MPは ${stage.startMaxMp} です。`,
    ]);
  }, [stage]);

  useEffect(() => {
    setSelectedEnemyIndex(0);
  }, [selectedWaveIndex]);

  const canCastThree = currentMp >= MAGIC_COSTS.fusion3;
  const canCastFour = currentMp >= MAGIC_COSTS.fusion4;
  const canCastFive = currentMp >= MAGIC_COSTS.fusion5;

  const appendLog = (message: string) => {
    setLabLog((prev) => [message, ...prev].slice(0, 8));
  };

  const resetSimulator = () => {
    setCurrentTurn(1);
    setCurrentMaxMp(stage.startMaxMp);
    setCurrentMp(stage.startMaxMp);
    setLabLog([
      `Stage ${stage.id} のシミュレータをリセットしました。`,
      `開始時最大MPは ${stage.startMaxMp} です。`,
      `変数はターンごとにリセットされる前提です。`,
    ]);
  };

  const advanceTurn = () => {
    const { nextMaxMp, recovery, nextMp } = nextTurnValues(
      currentMp,
      currentMaxMp,
    );
    setCurrentTurn((prev) => prev + 1);
    setCurrentMaxMp(nextMaxMp);
    setCurrentMp(nextMp);
    appendLog(
      `${currentTurn + 1} ターン目へ。最大MP +10、回復 ${recovery}、現在MP ${nextMp}/${nextMaxMp}`,
    );
  };

  const spendMp = (cost: number, label: string) => {
    if (currentMp < cost) {
      appendLog(`${label} は MP が足りず発動できません。`);
      return;
    }
    setCurrentMp((prev) => prev - cost);
    appendLog(`${label} を使用。MP ${cost} 消費。`);
  };

  return (
    <div className="spec-lab">
      <header className="spec-lab-hero">
        <div className="spec-lab-hero-copy">
          <p className="spec-lab-kicker">Kotoba Quest Internal Lab</p>
          <h1>仕様プレイグラウンド</h1>
          <p>
            `docs` にある現在仕様を、UI とルールの両方から試すための検証ページです。
            構文はまだ仮置きのため、ここではバトルルールと敵データの確認を主に行います。
          </p>
        </div>
        <div className="spec-lab-hero-badges">
          <span>単属性魔法: 5種</span>
          <span>複合は 3 属性以上のみ</span>
          <span>if は特定敵ギミック専用</span>
          <span>小学校タブレット想定</span>
        </div>
      </header>

      <div className="spec-lab-layout">
        <aside className="spec-stage-rail">
          <div className="spec-panel">
            <h2>ステージ一覧</h2>
            <p className="spec-panel-caption">
              現在の docs に沿った進行順です。
            </p>
            <div className="spec-stage-buttons">
              {SPEC_STAGES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`spec-stage-button ${
                    item.id === stage.id ? "active" : ""
                  }`}
                  onClick={() => setSelectedStageId(item.id)}
                >
                  <span className="spec-stage-button-id">Stage {item.id}</span>
                  <strong>{item.name}</strong>
                  <span>{item.theme}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="spec-main">
          <section className="spec-overview-grid">
            <article className="spec-panel stage-summary-panel">
              <div className="stage-summary-header">
                <div>
                  <p className="spec-panel-kicker">選択中ステージ</p>
                  <h2>
                    Stage {stage.id}: {stage.name}
                  </h2>
                </div>
                <span className="stage-wave-badge">{stage.waveCount} Waves</span>
              </div>
              <p className="stage-theme">{stage.theme}</p>
              <div className="stage-summary-metrics">
                <div>
                  <span>開始時最大MP</span>
                  <strong>{stage.startMaxMp}</strong>
                </div>
                <div>
                  <span>使用可能属性</span>
                  <strong>{stage.unlockedElements.join(" / ")}</strong>
                </div>
                <div>
                  <span>クリア報酬</span>
                  <strong>{stage.clearReward ?? "追加なし"}</strong>
                </div>
              </div>
              <ul className="spec-note-list">
                {stage.specNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </article>

            <article className="spec-panel simulator-panel">
              <div className="stage-summary-header">
                <div>
                  <p className="spec-panel-kicker">MP シミュレータ</p>
                  <h2>現在ルールの確認</h2>
                </div>
                <button
                  type="button"
                  className="spec-secondary-button"
                  onClick={resetSimulator}
                >
                  リセット
                </button>
              </div>
              <div className="simulator-stats">
                <div>
                  <span>ターン</span>
                  <strong>{currentTurn}</strong>
                </div>
                <div>
                  <span>最大MP</span>
                  <strong>{currentMaxMp}</strong>
                </div>
                <div>
                  <span>現在MP</span>
                  <strong>{currentMp}</strong>
                </div>
              </div>
              <div className="simulator-actions">
                <button type="button" onClick={advanceTurn}>
                  次のターンへ
                </button>
                <button
                  type="button"
                  onClick={() =>
                    spendMp(MAGIC_COSTS.single, "単属性魔法")
                  }
                >
                  単属性魔法 -{MAGIC_COSTS.single}
                </button>
                <button
                  type="button"
                  disabled={!canCastThree}
                  onClick={() =>
                    spendMp(MAGIC_COSTS.fusion3, "3属性合体魔法")
                  }
                >
                  3属性合体 -{MAGIC_COSTS.fusion3}
                </button>
                <button
                  type="button"
                  disabled={!canCastFour}
                  onClick={() =>
                    spendMp(MAGIC_COSTS.fusion4, "4属性合体魔法")
                  }
                >
                  4属性合体 -{MAGIC_COSTS.fusion4}
                </button>
                <button
                  type="button"
                  disabled={!canCastFive}
                  onClick={() =>
                    spendMp(MAGIC_COSTS.fusion5, "5属性合体魔法")
                  }
                >
                  5属性合体 -{MAGIC_COSTS.fusion5}
                </button>
              </div>
              <div className="simulator-hint-row">
                <span>3属性合体は {MAGIC_COSTS.fusion3} MP 以上で発動可能</span>
                <span>
                  {stage.startMaxMp < MAGIC_COSTS.fusion3
                    ? "序盤ステージでは数ターン待つ必要があります。"
                    : "このステージでは開幕から 3 属性合体を視野に入れられます。"}
                </span>
                <span>変数はターン終了で消えるため、次のターンへは持ち越しません。</span>
              </div>
              <div className="spec-log">
                {labLog.map((entry) => (
                  <div key={entry} className="spec-log-entry">
                    {entry}
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="spec-detail-grid">
            <article className="spec-panel wave-panel">
              <div className="stage-summary-header">
                <div>
                  <p className="spec-panel-kicker">Wave 設計</p>
                  <h2>波ごとの狙い</h2>
                </div>
              </div>
              <div className="wave-tabs">
                {stage.waves.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`wave-tab ${
                      index === selectedWaveIndex ? "active" : ""
                    }`}
                    onClick={() => setSelectedWaveIndex(index)}
                  >
                    <span>Wave {item.id}</span>
                    <strong>{item.name}</strong>
                    <small>ストレス {getStressLabel(item.stress)}</small>
                  </button>
                ))}
              </div>
              <div className="wave-summary">
                <h3>{wave.name}</h3>
                <p>{wave.goal}</p>
                <ul className="spec-note-list">
                  {wave.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>

              <div className="enemy-selector">
                {wave.enemies.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`enemy-chip ${
                      index === selectedEnemyIndex ? "active" : ""
                    }`}
                    onClick={() => setSelectedEnemyIndex(index)}
                  >
                    {item.name}
                  </button>
                ))}
              </div>

              <EnemyPanel
                enemy={enemy}
                showHiddenInfo={showHiddenInfo}
                onToggleHidden={() => setShowHiddenInfo((prev) => !prev)}
              />
            </article>

            <article className="spec-panel code-panel">
              <div className="stage-summary-header">
                <div>
                  <p className="spec-panel-kicker">仮構文メモ</p>
                  <h2>サンプルコード</h2>
                </div>
              </div>
              <div className="draft-syntax-banner">
                この欄は現在仕様を試すための仮コードです。既存パーサーとはまだ接続しておらず、`使用(...)` 連続で合体魔法判定する前提をメモしています。
              </div>
              <div className="code-editors">
                <div className="code-editor-block">
                  <div className="code-editor-header">
                    <h3>プレイヤーコード</h3>
                    <span>Stage {stage.id} の叩き台</span>
                  </div>
                  <CodeEditor
                    value={playerCode}
                    onChange={setPlayerCode}
                    placeholder="プレイヤーコード"
                  />
                </div>

                {stage.sampleNpcCode && (
                  <div className="code-editor-block">
                    <div className="code-editor-header">
                      <h3>NPCコード</h3>
                      <span>Stage3 系の連携確認用</span>
                    </div>
                    <CodeEditor
                      value={npcCode}
                      onChange={setNpcCode}
                      placeholder="NPCコード"
                    />
                  </div>
                )}
              </div>
              <div className="syntax-rule-grid">
                <div>
                  <span>単属性魔法</span>
                  <strong>使用(フレイム) 形式</strong>
                </div>
                <div>
                  <span>合体魔法</span>
                  <strong>使用(...) が 3 種以上そろうと発動</strong>
                </div>
                <div>
                  <span>if 文</span>
                  <strong>特定敵ギミック専用</strong>
                </div>
                <div>
                  <span>変数寿命</span>
                  <strong>ターンリセット</strong>
                </div>
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}

function EnemyPanel({
  enemy,
  showHiddenInfo,
  onToggleHidden,
}: {
  enemy: EnemySpec;
  showHiddenInfo: boolean;
  onToggleHidden: () => void;
}) {
  return (
    <div className="enemy-panel-body">
      <div className="enemy-panel-header">
        <div>
          <h3>{enemy.name}</h3>
          <p>
            {enemy.role} / HP {enemy.hp}
          </p>
        </div>
        <div className="enemy-panel-actions">
          <button
            type="button"
            className="spec-secondary-button"
            onClick={onToggleHidden}
          >
            {showHiddenInfo ? "内部情報を隠す" : "内部情報を見る"}
          </button>
        </div>
      </div>

      <div className="enemy-grid">
        <section>
          <h4>最初から見える情報</h4>
          <ul className="spec-note-list">
            {enemy.visibleHints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h4>追加ヒント</h4>
          <ul className="spec-note-list">
            {enemy.analysisHints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="enemy-affinity-table">
        <h4>属性相性</h4>
        <div className="affinity-row affinity-header">
          <span>属性</span>
          <span>判定</span>
        </div>
        {Object.entries(enemy.affinity).map(([element, level]) => (
          <div key={element} className="affinity-row">
            <span>{element}</span>
            <span className={`affinity-pill affinity-${level}`}>{getAffinityLabel(level)}</span>
          </div>
        ))}
      </div>

      <div className="enemy-grid">
        <section>
          <h4>行動とギミック</h4>
          <ul className="spec-note-list">
            {enemy.behaviors.map((item) => (
              <li key={item}>{item}</li>
            ))}
            {(enemy.gimmicks ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h4>内部メモ</h4>
          <ul className="spec-note-list">
            {(showHiddenInfo
              ? enemy.hiddenNotes
              : ["設計メモは隠されています。"]
            ).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export function AppModeTabs({
  mode,
  onChange,
}: {
  mode: LabMode;
  onChange: (mode: LabMode) => void;
}) {
  return (
    <nav className="app-mode-tabs" aria-label="表示モード">
      <button
        type="button"
        className={mode === "spec" ? "active" : ""}
        onClick={() => onChange("spec")}
      >
        仕様プレイグラウンド
      </button>
      <button
        type="button"
        className={mode === "stage1" ? "active" : ""}
        onClick={() => onChange("stage1")}
      >
        Stage1試作
      </button>
      <button
        type="button"
        className={mode === "prototype" ? "active" : ""}
        onClick={() => onChange("prototype")}
      >
        現行プロトタイプ
      </button>
    </nav>
  );
}
