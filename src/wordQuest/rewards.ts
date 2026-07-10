import { getEnemy } from "./enemies";
import { createSeededRandom } from "./random";
import type {
  StrategySentence,
  WordId,
  WordInventory,
  WordQuestRunState,
} from "./types";
import { VOCABULARY, VOCABULARY_BY_ID } from "./vocabulary";

export interface VocabularyGrantResult {
  inventory: WordInventory;
  message: string;
  scoreBonus: number;
}

export function grantVocabulary(
  inventory: WordInventory,
  wordId: WordId,
): VocabularyGrantResult {
  const word = VOCABULARY_BY_ID[wordId];
  if (!word) throw new Error(`Unknown vocabulary: ${wordId}`);
  const owned = inventory[wordId];
  if (!owned) {
    return {
      inventory: {
        ...inventory,
        [wordId]: { count: 1, rank: 1 },
      },
      message: `新しい語彙「${word.label}」を獲得した。`,
      scoreBonus: 0,
    };
  }

  const nextRank = Math.min(owned.rank + 1, word.duplicateRule.maxRank);
  const atMaximum = owned.rank >= word.duplicateRule.maxRank;
  return {
    inventory: {
      ...inventory,
      [wordId]: {
        count: owned.count + 1,
        rank: nextRank,
      },
    },
    message: atMaximum
      ? `「${word.label}」は最大強化済み。余剰分を発見点2へ変えた。`
      : `「${word.label}」がランク${nextRank}へ強化された。`,
    scoreBonus: atMaximum ? 2 : 0,
  };
}

function strategyWordIds(strategies: readonly StrategySentence[]): readonly WordId[] {
  return strategies.flatMap((sentence) =>
    [
      sentence.subject,
      sentence.condition,
      sentence.connector,
      sentence.action,
      sentence.target,
      sentence.modifier,
    ].filter((wordId): wordId is WordId => Boolean(wordId)),
  );
}

export function generateRewardChoices(
  run: Pick<
    WordQuestRunState,
    "seed" | "battleIndex" | "currentBattle" | "inventory" | "strategies"
  >,
): readonly WordId[] {
  const enemy = getEnemy(run.currentBattle.enemyId);
  const usedWords = new Set(strategyWordIds(run.strategies));
  const pool = VOCABULARY.filter(
    (word) =>
      word.unlockAfterBattle <= run.battleIndex &&
      word.rarity !== "basic",
  ).map((word) => {
    const owned = run.inventory[word.id];
    let weight = word.rewardWeight;
    if (enemy.rewardPool.includes(word.id)) weight *= 3.2;
    if (!owned) weight *= 1.8;
    else if (owned.rank < word.duplicateRule.maxRank) weight *= 0.85;
    else weight *= 0.22;
    if (usedWords.has(word.id)) weight *= 1.35;
    return { id: word.id, weight };
  });

  const random = createSeededRandom(
    `${run.seed}:reward:${run.battleIndex}:${enemy.id}`,
  );
  const remaining = [...pool];
  const selected: WordId[] = [];

  while (selected.length < 3 && remaining.length > 0) {
    const total = remaining.reduce((sum, item) => sum + item.weight, 0);
    let roll = random() * total;
    let pickedIndex = remaining.length - 1;
    for (let index = 0; index < remaining.length; index += 1) {
      roll -= remaining[index]?.weight ?? 0;
      if (roll <= 0) {
        pickedIndex = index;
        break;
      }
    }
    const [picked] = remaining.splice(pickedIndex, 1);
    if (picked) selected.push(picked.id);
  }

  if (selected.length < 3) {
    for (const wordId of enemy.rewardPool) {
      if (!selected.includes(wordId) && VOCABULARY_BY_ID[wordId]) {
        selected.push(wordId);
      }
      if (selected.length === 3) break;
    }
  }

  return selected.slice(0, 3);
}
