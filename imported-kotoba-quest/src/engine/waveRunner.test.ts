import { describe, it, expect } from "vitest";
import { runWave, calcWaveTransition } from "./waveRunner";
import { parse } from "../parser/parser";
import { STAGE1, STAGE2 } from "../data/stageData";

function code(src: string) {
  const r = parse(src);
  if (!r.ok) throw new Error(`パース失敗: ${r.message}`);
  return r.ast;
}

const SIMPLE_MAGIC_CODE = code([
  "繰り返す(敵が生きている あいだ):",
  "  魔法(フレイム)",
].join("\n"));

const WAIT_CODE = code([
  "繰り返す(敵が生きている あいだ):",
  "  待機()",
].join("\n"));

// ─── Wave runner テスト ───────────────────────────────

describe("waveRunner", () => {
  it("Wave1（1体）を勝利できる", () => {
    const wave = STAGE1.waves[0];
    const result = runWave(SIMPLE_MAGIC_CODE, wave, STAGE1.config, 100, 50);
    expect(result.outcome).toBe("victory");
    expect(result.enemyResults[0].outcome).toBe("defeated");
  });

  it("待機し続けると敗北する", () => {
    const wave = STAGE1.waves[2]; // Wave3 ボス（強い）
    const result = runWave(WAIT_CODE, wave, STAGE1.config, 100, 50);
    // 待機しかしないとボスに倒される
    expect(result.outcome).not.toBe("victory");
  });

  it("Wave2（2体）を順番に倒せる", () => {
    const wave = STAGE1.waves[1]; // 2体のWave
    expect(wave.enemies).toHaveLength(2);
    const result = runWave(SIMPLE_MAGIC_CODE, wave, STAGE1.config, 100, 50);
    expect(result.enemyResults).toHaveLength(2);
    // フレイムで2体とも倒せるはず
    if (result.outcome === "victory") {
      expect(result.enemyResults.every(r => r.outcome === "defeated")).toBe(true);
    }
  });

  it("1体目で敗北したら2体目はスキップされる", () => {
    const wave = STAGE1.waves[1]; // 2体のWave
    // 既にHP0でWaveを開始したケース
    const result = runWave(SIMPLE_MAGIC_CODE, wave, STAGE1.config, 1, 0);
    // HP1 + MP0 でフレイム不発、すぐ敗北する可能性
    expect(result.enemyResults).toHaveLength(2);
    if (result.outcome !== "victory") {
      // 2体目はサバイブ扱いになっているはず
      expect(result.enemyResults[1].outcome).toBe("survived");
    }
  });

  it("Wave勝利後にHP/MPがWave開始時の値へリセットされる", () => {
    const wave = STAGE1.waves[0];
    const waveResult = runWave(SIMPLE_MAGIC_CODE, wave, STAGE1.config, 100, 50);
    if (waveResult.outcome === "victory") {
      const transition = calcWaveTransition(waveResult, STAGE1.config);
      expect(transition.nextPlayerHp).toBe(100);
      expect(transition.nextPlayerMp).toBe(STAGE1.config.initialMaxMp);
    }
  });
});

// ─── ステージデータ整合性テスト ─────────────────────────

describe("stageData", () => {
  it("Stage1 は3Waveある", () => {
    expect(STAGE1.waves).toHaveLength(3);
  });

  it("Stage2 は3Waveある", () => {
    expect(STAGE2.waves).toHaveLength(3);
  });

  it("全WaveにenemiesとhintとcodeExampleがある", () => {
    for (const wave of [...STAGE1.waves, ...STAGE2.waves]) {
      expect(wave.enemies.length).toBeGreaterThan(0);
      expect(wave.hint).toBeTruthy();
      expect(wave.codeExample).toBeTruthy();
    }
  });

  it("Stage2クリア報酬は氷属性の解放", () => {
    expect(STAGE2.clearReward.unlocksAttribute).toBe("氷");
  });

  it("Stage1の敵HPが適切な範囲にある", () => {
    const w1Enemy = STAGE1.waves[0].enemies[0];
    const w3Enemy = STAGE1.waves[2].enemies[0];
    expect(w1Enemy.maxHp).toBeLessThan(w3Enemy.maxHp); // Wave3の方が強い
  });
});
