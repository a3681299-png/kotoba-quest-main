import cecileBattleUrl from "../assets/characters/battle/1/Cécile_Asteria_dot.png";
import lisetteBattleUrl from "../assets/characters/battle/2/Lisette_Rosalia_dot.png";
import edgarBattleUrl from "../assets/characters/battle/3/Edgar_Grey_dot.png";
import eleanorBattleUrl from "../assets/characters/battle/4/Eleanor_Veil_dot.png";
import shionBattleUrl from "../assets/characters/battle/5/Shion_Yoizuki_dot.png";
import lucienBattleUrl from "../assets/characters/battle/6/Lucien_Valmont_dot.png";
import enemyPortraitUrl from "../assets/characters/battle/チュートリアル/敵/火喰らいの獣.png";
import lottaBattleUrl from "../assets/characters/battle/チュートリアル/プレイヤー/Lotta_Rouge_dot.png";

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
}

function createStaticCharacterDefinition(
  src: string,
): CharacterSheetDefinition {
  return {
    idle: { src, columns: 1, rows: 1 },
    attack: { src, columns: 1, rows: 1 },
    damage: { src, columns: 1, rows: 1 },
    targetHeight: 220,
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

export const ENEMY_SHEETS = createStaticCharacterDefinition(enemyPortraitUrl);
