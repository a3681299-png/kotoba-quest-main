import gazeIdolBattleUrl from "../assets/characters/battle/1/1-1/敵/見張りの石像2.png";
import echoMothBattleUrl from "../assets/characters/battle/1/1-2/敵/反響の翅2.png";
import emberMawBattleUrl from "../assets/characters/battle/1/1-3/敵/火喰らいの獣2.png";
import forgottenKingBattleUrl from "../assets/characters/battle/1/1-4/敵/亡名神2.png";
import lottaBattleUrl from "../assets/characters/battle/1/1-1/プレイヤー/Lotta_Rouge_dot.png";
import cecileBattleUrl from "../assets/characters/battle/2/Cécile_Asteria_dot.png";
import lisetteBattleUrl from "../assets/characters/battle/3/Lisette_Rosalia_dot.png";
import edgarBattleUrl from "../assets/characters/battle/4/Edgar_Grey_dot.png";
import eleanorBattleUrl from "../assets/characters/battle/5/Eleanor_Veil_dot.png";
import shionBattleUrl from "../assets/characters/battle/6/Shion_Yoizuki_dot.png";
import lucienBattleUrl from "../assets/characters/battle/7/Lucien_Valmont_dot.png";

export interface SpriteSheetDefinition {
  src: string;
  columns: number;
  rows: number;
}

export interface CharacterSheetDefinition {
  idle: SpriteSheetDefinition;
  attack: SpriteSheetDefinition;
  damage: SpriteSheetDefinition;
  targetHeight: number;
  displayScale: number;
}

function createStaticCharacterDefinition(
  src: string,
  displayScale = 1,
): CharacterSheetDefinition {
  return {
    idle: { src, columns: 1, rows: 1 },
    attack: { src, columns: 1, rows: 1 },
    damage: { src, columns: 1, rows: 1 },
    targetHeight: 220,
    displayScale,
  };
}

export const PLAYER_SHEETS = createStaticCharacterDefinition(lottaBattleUrl);

export const STAGE_PLAYER_SHEETS: Readonly<
  Record<number, CharacterSheetDefinition>
> = {
  1: createStaticCharacterDefinition(edgarBattleUrl),
  2: createStaticCharacterDefinition(lisetteBattleUrl),
  3: createStaticCharacterDefinition(shionBattleUrl),
  4: createStaticCharacterDefinition(cecileBattleUrl),
  5: createStaticCharacterDefinition(eleanorBattleUrl),
  6: createStaticCharacterDefinition(lucienBattleUrl),
};

const GAZE_IDOL_SHEETS = createStaticCharacterDefinition(gazeIdolBattleUrl);
const ECHO_MOTH_SHEETS = createStaticCharacterDefinition(echoMothBattleUrl);
const EMBER_MAW_SHEETS = createStaticCharacterDefinition(emberMawBattleUrl);
const FORGOTTEN_KING_SHEETS = createStaticCharacterDefinition(
  forgottenKingBattleUrl,
  1.25,
);

export const ENEMY_SHEETS_BY_ID: Readonly<
  Record<string, CharacterSheetDefinition>
> = {
  "gaze-idol": GAZE_IDOL_SHEETS,
  "echo-moth": ECHO_MOTH_SHEETS,
  "ember-maw": EMBER_MAW_SHEETS,
  "forgotten-king": FORGOTTEN_KING_SHEETS,
};

// Word Quest以外の旧戦闘画面では火喰らいの獣を使う。
export const ENEMY_SHEETS = EMBER_MAW_SHEETS;

export function getEnemySheets(enemyId: string): CharacterSheetDefinition {
  return ENEMY_SHEETS_BY_ID[enemyId] ?? ENEMY_SHEETS;
}
