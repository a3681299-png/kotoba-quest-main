"use client";

import { useState, useCallback, useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";
import { getStage } from "@/data/stageData";
import { parse } from "@/parser/parser";
import { runWave } from "@/engine/waveRunner";
import { countEffectiveChars } from "@/engine/charCounter";
import { calcAdaptation } from "@/engine/adaptation";
import { BattleAnimator } from "./BattleAnimator";
import type { WaveResult } from "@/engine/waveRunner";
import type { EnemyData } from "@/engine/types";

const ELEMENT_COLOR: Record<string, string> = {
  火: "#fc8181", 水: "#63b3ed", 雷: "#f6e05e", 氷: "#b2f5ea", 風: "#9ae6b4",
};

type Phase = "editing" | "animating";
type EditorTab = "player" | "npc";

export function BattleScreen() {
  const { currentWave, currentCode, setCode, finishWave, goToStageSelect } = useGameStore();
  const [parseError, setParseError] = useState<string | null>(null);
  const [npcParseError, setNpcParseError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("editing");
  const [waveResult, setWaveResult] = useState<WaveResult | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>("player");
  const [npcCode, setNpcCode] = useState<string>("");

  if (!currentWave) return null;
  const stage = getStage(currentWave.stageNumber);
  const wave = stage.waves[currentWave.waveIndex];
  const totalWaves = stage.waves.length;
  const hasNpc = !!wave?.npc;

  // Wave が切り替わったら NPC コードを buggyCode で初期化
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (wave?.npc) setNpcCode(wave.npc.buggyCode);
  }, [currentWave.waveIndex, currentWave.stageNumber]);

  if (!wave) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16 }}>
        <div style={{ fontSize: 40 }}>🚧</div>
        <p style={{ color: "#a0aec0" }}>このステージはまだ準備中です</p>
        <button style={{ padding: "10px 20px", background: "#2b6cb0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }} onClick={goToStageSelect}>
          ステージ選択へ戻る
        </button>
      </div>
    );
  }

  function handleRun() {
    if (!currentWave) return;
    setParseError(null);
    setNpcParseError(null);

    const parsed = parse(currentCode);
    if (!parsed.ok) {
      setParseError(parsed.message ?? "構文エラー");
      setActiveTab("player");
      return;
    }

    // NPC コードをパース（存在する場合）
    let npcAst = undefined;
    if (hasNpc && npcCode.trim()) {
      const npcParsed = parse(npcCode);
      if (!npcParsed.ok) {
        setNpcParseError(npcParsed.message ?? "NPC コードの構文エラー");
        setActiveTab("npc");
        return;
      }
      npcAst = npcParsed.ast;
    }

    // Stage 6 学習型ラスボス: 行動履歴から適応設定を計算
    const hasAdaptiveEnemy = wave.enemies.some((e) => e.adaptive);
    const adaptation = hasAdaptiveEnemy
      ? calcAdaptation(useGameStore.getState().actionHistory)
      : undefined;

    const result = runWave(
      parsed.ast, wave, stage.config,
      currentWave.playerHp, currentWave.playerMp,
      npcAst,
      currentCode,   // 有効文字数チェック用
      adaptation,
    );
    setWaveResult(result);
    setPhase("animating");
  }

  const handleEdit = useCallback(() => {
    setPhase("editing");
    setWaveResult(null);
  }, []);

  const handleFinished = useCallback(() => {
    if (waveResult) finishWave(waveResult);
  }, [waveResult, finishWave]);

  return (
    <div style={s.root}>
      {/* ヘッダー */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={goToStageSelect}>← ステージ選択</button>
        <span style={s.stageLabel}>Stage {currentWave.stageNumber}: {stage.title}</span>
        <span style={s.waveLabel}>Wave {currentWave.waveIndex + 1} / {totalWaves}</span>
        <div style={s.statusBar}>
          <SmallBar label="HP" value={currentWave.playerHp} max={100} color="#68d391" />
          <SmallBar label="MP" value={currentWave.playerMp} max={stage.config.initialMaxMp + 50} color="#63b3ed" />
        </div>
      </div>

      {/* 編集モード */}
      {phase === "editing" && (
        <div style={s.body}>
          <div style={s.left}>
            {/* タブ（NPC がいる場合のみ） */}
            {hasNpc && (
              <div style={s.tabs}>
                <button
                  style={{ ...s.tab, ...(activeTab === "player" ? s.tabActive : {}) }}
                  onClick={() => setActiveTab("player")}
                >
                  👤 プレイヤーのコード
                </button>
                <button
                  style={{ ...s.tab, ...(activeTab === "npc" ? s.tabActive : {}) }}
                  onClick={() => setActiveTab("npc")}
                >
                  🤝 {wave.npc!.name}のコード（修正）
                </button>
              </div>
            )}

            {/* プレイヤーエディタ */}
            {(!hasNpc || activeTab === "player") && (
              <>
                {!hasNpc && <div style={s.sectionLabel}>コード入力</div>}
                <textarea
                  value={currentCode}
                  onChange={(e) => setCode(e.target.value)}
                  style={s.editor}
                  spellCheck={false}
                  placeholder={"繰り返す(敵が生きている あいだ):\n  魔法(フレイム)"}
                />
                {parseError && <div style={s.error}>⚠ {parseError}</div>}
                {wave.simultaneous && <CharCounter code={currentCode} limit={80} />}
                {wave.codeExample && wave.codeExample !== currentCode && (
                  <button style={s.sampleBtn} onClick={() => setCode(wave.codeExample!)}>
                    📋 サンプルコードを使う
                  </button>
                )}
              </>
            )}

            {/* NPC エディタ */}
            {hasNpc && activeTab === "npc" && (
              <>
                <div style={s.npcSpeech}>💬 {wave.npc!.npcSpeech}</div>
                <textarea
                  value={npcCode}
                  onChange={(e) => setNpcCode(e.target.value)}
                  style={{ ...s.editor, borderColor: "#d6bcfa" }}
                  spellCheck={false}
                />
                {npcParseError && <div style={s.error}>⚠ {npcParseError}</div>}
                <NpcHintBox bugDescription={wave.npc!.bugDescription} />
              </>
            )}

            <button style={s.runBtn} onClick={handleRun}>▶ 実行</button>
          </div>

          {/* 右: Wave情報 */}
          <div style={s.right}>
            <div style={s.waveTitle}>{wave.title}</div>
            <p style={s.waveDesc}>{wave.description}</p>
            <div style={s.sectionLabel}>登場する敵</div>
            {wave.enemies.map((e, i) => <EnemyCard key={i} enemy={e} index={i} />)}
            {hasNpc && (
              <div style={s.npcInfo}>
                <span style={s.npcIcon}>🤝</span>
                <span style={{ color: "#d6bcfa", fontWeight: 700 }}>{wave.npc!.name}</span>
                <span style={{ color: "#718096", fontSize: 12 }}>が一緒に戦う</span>
              </div>
            )}
            <MagicList />
            <HintBox hint={wave.hint} />
          </div>
        </div>
      )}

      {/* アニメーションモード */}
      {phase === "animating" && waveResult && (
        <BattleAnimator
          waveResult={waveResult}
          wave={wave}
          code={currentCode}
          startPlayerHp={currentWave.playerHp}
          startPlayerMp={currentWave.playerMp}
          onEdit={handleEdit}
          onFinished={handleFinished}
        />
      )}
    </div>
  );
}

// ─── サブコンポーネント ────────────────────────────────

function CharCounter({ code, limit }: { code: string; limit: number }) {
  const count = countEffectiveChars(code);
  const over = count > limit;
  const ratio = count / limit;
  const barColor = over ? "#fc8181" : ratio >= 0.85 ? "#f6e05e" : "#68d391";
  return (
    <div style={{ background: "#1a202c", border: `1px solid ${over ? "#fc8181" : "#2d3748"}`, borderRadius: 6, padding: "6px 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#a0aec0" }}>有効文字数</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: barColor, fontFamily: "monospace" }}>
          {count} / {limit}
          {over && <span style={{ fontSize: 11, marginLeft: 6 }}>（超過：ダメージ {Math.floor(limit / count * 100)}%）</span>}
        </span>
      </div>
      <div style={{ height: 4, background: "#2d3748", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, ratio * 100)}%`, height: "100%", background: barColor, borderRadius: 2, transition: "width 0.1s" }} />
      </div>
    </div>
  );
}

function SmallBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 10, color: "#718096", width: 18 }}>{label}</span>
      <div style={{ width: 60, height: 5, background: "#2d3748", borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 10, color: "#a0aec0" }}>{value}</span>
    </div>
  );
}

function EnemyCard({ enemy, index }: { enemy: EnemyData; index: number }) {
  return (
    <div style={s.enemyCard}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={s.enemyName}>{index + 1}. {enemy.name}</span>
        {enemy.element && (
          <span style={{ ...s.elemBadge, background: ELEMENT_COLOR[enemy.element] }}>
            {enemy.element}属性
          </span>
        )}
      </div>
      <div style={s.enemyStats}>
        HP {enemy.maxHp} ／ 防御力 {enemy.defense}
        {enemy.attackPatterns[0].maxDamage === 0
          ? " ／ 攻撃なし"
          : ` ／ 攻撃 ${enemy.attackPatterns[0].minDamage}〜${enemy.attackPatterns[0].maxDamage}`}
      </div>
    </div>
  );
}

const MAGIC_INFO = [
  { element: "火", name: "フレイム", cost: 10 },
  { element: "水", name: "アクア",   cost: 10 },
  { element: "雷", name: "スパーク", cost: 10 },
  { element: "氷", name: "フロスト", cost: 10 },
  { element: "風", name: "ゲイル",   cost: 10 },
] as const;

function MagicList() {
  const unlockedAttributes = useGameStore((s) => s.unlockedAttributes);
  const available = MAGIC_INFO.filter((m) => unlockedAttributes.includes(m.element as never));

  return (
    <div style={s.hintBox}>
      <div style={{ padding: "8px 12px", fontSize: 11, color: "#a0aec0", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
        ✨ 使用できる魔法
      </div>
      <div style={{ padding: "0 8px 8px" }}>
        {available.map((m) => (
          <div key={m.element} style={ml.row}>
            <span style={{ ...ml.badge, background: ELEMENT_COLOR[m.element] }}>{m.element}</span>
            <code style={ml.code}>魔法({m.name})</code>
            <span style={ml.cost}>MP {m.cost}</span>
          </div>
        ))}
        <div style={ml.combo}>
          <span style={ml.comboIcon}>⚡</span>
          <span style={{ color: "#f6e05e", fontSize: 11 }}>3種類以上同時使用 → 合体魔法（MP 80〜）</span>
        </div>
      </div>
    </div>
  );
}

const ml: Record<string, React.CSSProperties> = {
  row: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "4px 4px", borderRadius: 4,
  },
  badge: {
    padding: "1px 7px", borderRadius: 999,
    fontSize: 11, fontWeight: 700, color: "#1a202c",
    flexShrink: 0,
  },
  code: {
    flex: 1, fontFamily: "'SFMono-Regular', Consolas, monospace",
    fontSize: 12, color: "#e2e8f0",
    background: "#2d3748", padding: "1px 6px", borderRadius: 3,
  },
  cost: { fontSize: 11, color: "#63b3ed", flexShrink: 0 },
  combo: {
    display: "flex", alignItems: "center", gap: 6,
    marginTop: 6, padding: "5px 4px",
    borderTop: "1px solid #2d3748",
  },
  comboIcon: { fontSize: 13 },
};

function HintBox({ hint }: { hint: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={s.hintBox}>
      <button style={s.hintToggle} onClick={() => setOpen(!open)}>
        💡 ヒント {open ? "▲" : "▼"}
      </button>
      {open && <p style={s.hintText}>{hint}</p>}
    </div>
  );
}

function NpcHintBox({ bugDescription }: { bugDescription: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ ...s.hintBox, borderColor: "#553c9a" }}>
      <button style={{ ...s.hintToggle, color: "#d6bcfa" }} onClick={() => setOpen(!open)}>
        🔍 バグのヒント {open ? "▲" : "▼"}
      </button>
      {open && <p style={s.hintText}>{bugDescription}</p>}
    </div>
  );
}

// ─── スタイル ─────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root: { maxWidth: 1000, margin: "0 auto", padding: "16px" },
  header: {
    display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
    padding: "10px 14px", background: "#1a202c", borderRadius: 8, flexWrap: "wrap",
  },
  backBtn: { padding: "4px 10px", background: "#2d3748", color: "#a0aec0", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12 },
  stageLabel: { fontWeight: 700, color: "#f6e05e", fontSize: 14, flex: 1 },
  waveLabel: { fontSize: 13, color: "#a0aec0" },
  statusBar: { display: "flex", gap: 10 },
  body: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" },
  left: { display: "flex", flexDirection: "column", gap: 10 },
  right: { display: "flex", flexDirection: "column", gap: 10 },
  tabs: { display: "flex", gap: 4 },
  tab: {
    padding: "7px 14px", fontSize: 12, fontWeight: 600,
    background: "#2d3748", color: "#a0aec0",
    borderTop: "1px solid #4a5568",
    borderLeft: "1px solid #4a5568",
    borderRight: "1px solid #4a5568",
    borderBottom: "none",
    borderRadius: "6px 6px 0 0",
    cursor: "pointer",
  },
  tabActive: { background: "#1a202c", color: "#e2e8f0" },
  sectionLabel: { fontSize: 11, color: "#718096", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 },
  editor: {
    width: "100%", height: 280,
    fontFamily: "'SFMono-Regular', Consolas, monospace",
    fontSize: 14, lineHeight: 1.7, padding: "10px 12px",
    background: "#1a202c", color: "#e2e8f0",
    border: "1px solid #4a5568", borderRadius: 6,
    resize: "vertical", outline: "none", boxSizing: "border-box",
  },
  error: { color: "#fc8181", fontSize: 13, padding: "6px 8px", background: "#2d1515", borderRadius: 4 },
  runBtn: {
    padding: "12px 0", background: "#276749", color: "#fff",
    border: "none", borderRadius: 6, fontSize: 16, fontWeight: 700, cursor: "pointer",
  },
  npcSpeech: {
    padding: "8px 12px", background: "#2d1b4e", border: "1px solid #553c9a",
    borderRadius: 6, fontSize: 13, color: "#d6bcfa", lineHeight: 1.5,
  },
  sampleBtn: { padding: "8px 12px", background: "#2d3748", color: "#a0aec0", border: "1px solid #4a5568", borderRadius: 6, cursor: "pointer", fontSize: 12 },
  waveTitle: { fontSize: 16, fontWeight: 700, color: "#e2e8f0" },
  waveDesc: { fontSize: 13, color: "#a0aec0", lineHeight: 1.6 },
  enemyCard: { background: "#1a202c", border: "1px solid #2d3748", borderRadius: 6, padding: "10px 12px" },
  enemyName: { fontWeight: 600, color: "#e2e8f0", fontSize: 14 },
  elemBadge: { padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#1a202c" },
  enemyStats: { fontSize: 12, color: "#718096", marginTop: 4 },
  npcInfo: { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#2d1b4e", borderRadius: 6, border: "1px solid #553c9a" },
  npcIcon: { fontSize: 18 },
  hintBox: { background: "#1a202c", border: "1px solid #2d3748", borderRadius: 6, overflow: "hidden" },
  hintToggle: { width: "100%", padding: "8px 12px", background: "transparent", color: "#f6e05e", border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: 600 },
  hintText: { padding: "4px 12px 12px", fontSize: 13, color: "#a0aec0", lineHeight: 1.6, margin: 0 },
};
