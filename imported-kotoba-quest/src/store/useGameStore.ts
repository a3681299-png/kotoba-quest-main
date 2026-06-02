import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Element } from "../parser/ast";
import type { WaveResult } from "../engine/waveRunner";
import { getStage } from "../data/stageData";
import { calcWaveTransition } from "../engine/waveRunner";

// ─── 型定義 ───────────────────────────────────────────

export type GameScreen =
  | "title"
  | "stageSelect"
  | "battle"
  | "waveResult"
  | "stageResult";

export interface WaveProgress {
  stageNumber: number;
  waveIndex: number;        // 0-based
  playerHp: number;         // Wave開始時のHP
  playerMp: number;         // Wave開始時のMP（ステージ設定値）
}

// ─── ストア型定義 ─────────────────────────────────────

interface GameState {
  // 画面制御
  screen: GameScreen;

  // 進行中のWave情報
  currentWave: WaveProgress | null;

  // 最後のWave実行結果
  lastWaveResult: WaveResult | null;

  // 現在エディタに入力されているコード
  currentCode: string;

  // 永続化: クリア済みステージ
  clearedStages: number[];

  // 永続化: 解放済み属性
  unlockedAttributes: Element[];

  // 永続化: Stage6用の行動履歴（属性ごとの使用回数）
  actionHistory: ActionHistory;
}

export interface ActionHistory {
  magicUsage: Record<string, number>;   // { フレイム: 42, アクア: 30, ... }
  comboCount: number;
  defendCount: number;
  healCount: number;
  totalRounds: number;                  // 総バトルラウンド数（学習型ラスボス用）
  totalBattles: number;                 // 総バトル数（学習型ラスボス用）
}

// ─── アクション型定義 ─────────────────────────────────

interface GameActions {
  // 画面遷移
  goToTitle: () => void;
  goToStageSelect: () => void;
  startStage: (stageNumber: number) => void;
  startWave: (stageNumber: number, waveIndex: number, hp: number, mp: number) => void;
  finishWave: (result: WaveResult) => void;
  retryWave: () => void;
  proceedToNextWave: () => void;
  completeStage: (stageNumber: number, unlockedAttr: Element | null) => void;

  // コード編集
  setCode: (code: string) => void;

  // 行動履歴の更新（Stage6用）
  recordAction: (type: keyof Omit<ActionHistory, "magicUsage">) => void;
  recordMagicUse: (magic: string) => void;
}

// ─── ストア実装 ───────────────────────────────────────

const INITIAL_ACTION_HISTORY: ActionHistory = {
  magicUsage: {},
  comboCount: 0,
  defendCount: 0,
  healCount: 0,
  totalRounds: 0,
  totalBattles: 0,
};

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      // ─── 初期状態 ─────────────────────────────────────
      screen: "title",
      currentWave: null,
      lastWaveResult: null,
      currentCode: "",
      clearedStages: [],
      unlockedAttributes: ["火", "水", "雷"], // 初期解放済み
      actionHistory: INITIAL_ACTION_HISTORY,

      // ─── 画面遷移アクション ───────────────────────────
      goToTitle: () => set({ screen: "title", currentWave: null, lastWaveResult: null }),

      goToStageSelect: () => set({ screen: "stageSelect", currentWave: null }),

      startStage: (stageNumber) => {
        const stage = getStage(stageNumber);
        set({
          screen: "battle",
          currentWave: {
            stageNumber,
            waveIndex: 0,
            playerHp: 100,
            playerMp: stage.config.initialMaxMp,
          },
          lastWaveResult: null,
          currentCode: stage.waves[0]?.codeExample ?? "",
        });
      },

      startWave: (stageNumber, waveIndex, hp, mp) => {
        set({
          screen: "battle",
          currentWave: { stageNumber, waveIndex, playerHp: hp, playerMp: mp },
          lastWaveResult: null,
        });
      },

      finishWave: (result) => {
        // 行動履歴の集計（Stage 6 学習型ラスボス用）
        if (result.stats) {
          const h = get().actionHistory;
          const newMagicUsage = { ...h.magicUsage };
          for (const [magic, count] of Object.entries(result.stats.magicUsage)) {
            newMagicUsage[magic] = (newMagicUsage[magic] ?? 0) + count;
          }
          set({
            actionHistory: {
              magicUsage: newMagicUsage,
              comboCount: h.comboCount + result.stats.comboCount,
              defendCount: h.defendCount + result.stats.defendCount,
              healCount: h.healCount + result.stats.healCount,
              totalRounds: h.totalRounds + result.stats.rounds,
              totalBattles: h.totalBattles + 1,
            },
          });
        }
        set({ lastWaveResult: result, screen: "waveResult" });
      },

      retryWave: () => {
        // 同じWaveを同じHPでリトライ（コードはそのまま）
        const wave = get().currentWave;
        if (!wave) return;
        set({ screen: "battle", lastWaveResult: null });
      },

      proceedToNextWave: () => {
        const { currentWave, lastWaveResult } = get();
        if (!currentWave || !lastWaveResult) return;
        const stage = getStage(currentWave.stageNumber);
        const { nextPlayerHp, nextPlayerMp } = calcWaveTransition(lastWaveResult, stage.config);
        const nextWaveIndex = currentWave.waveIndex + 1;
        set({
          currentWave: {
            ...currentWave,
            waveIndex: nextWaveIndex,
            playerHp: nextPlayerHp,
            playerMp: nextPlayerMp,
          },
          screen: "battle",
          lastWaveResult: null,
          currentCode: stage.waves[nextWaveIndex]?.codeExample ?? get().currentCode,
        });
      },

      completeStage: (stageNumber, unlockedAttr) => {
        const { clearedStages, unlockedAttributes } = get();
        const newCleared = clearedStages.includes(stageNumber)
          ? clearedStages
          : [...clearedStages, stageNumber];
        const newUnlocked =
          unlockedAttr && !unlockedAttributes.includes(unlockedAttr)
            ? [...unlockedAttributes, unlockedAttr]
            : unlockedAttributes;

        set({
          clearedStages: newCleared,
          unlockedAttributes: newUnlocked,
          screen: "stageResult",
        });
      },

      // ─── コード編集 ───────────────────────────────────
      setCode: (code) => set({ currentCode: code }),

      // ─── 行動履歴 ─────────────────────────────────────
      recordAction: (type) => {
        const h = get().actionHistory;
        set({
          actionHistory: {
            ...h,
            [type]: (h[type] as number) + 1,
          },
        });
      },

      recordMagicUse: (magic) => {
        const h = get().actionHistory;
        set({
          actionHistory: {
            ...h,
            magicUsage: {
              ...h.magicUsage,
              [magic]: (h.magicUsage[magic] ?? 0) + 1,
            },
          },
        });
      },
    }),
    {
      name: "kotoba-quest-save",
      // 永続化する項目だけ選択
      partialize: (state) => ({
        clearedStages: state.clearedStages,
        unlockedAttributes: state.unlockedAttributes,
        actionHistory: state.actionHistory,
      }),
    }
  )
);

// ─── セレクタ ─────────────────────────────────────────

export const selectIsStageCleared = (stageNumber: number) =>
  (state: GameState) => state.clearedStages.includes(stageNumber);

export const selectIsStageUnlocked = (stageNumber: number) =>
  (state: GameState) =>
    stageNumber === 1 || state.clearedStages.includes(stageNumber - 1);
