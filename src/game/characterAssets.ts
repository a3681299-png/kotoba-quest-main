import enemyAttackUrl from "../assets/characters/battle/チュートリアル/敵/攻撃/body_export_攻撃.png";
import enemyDamageUrl from "../assets/characters/battle/チュートリアル/敵/ダメージ/body_export_ダメージ.png";
import enemyIdleUrl from "../assets/characters/battle/チュートリアル/敵/待機/body_export_待機.png";
import playerAttackUrl from "../assets/characters/battle/チュートリアル/プレイヤー/atk.png";
import playerDamageUrl from "../assets/characters/battle/チュートリアル/プレイヤー/dmg.png";
import playerIdleUrl from "../assets/characters/battle/チュートリアル/プレイヤー/idle.png";

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

export const PLAYER_SHEETS: CharacterSheetDefinition = {
  idle: { src: playerIdleUrl, columns: 1, rows: 1 },
  attack: { src: playerAttackUrl, columns: 1, rows: 1 },
  damage: { src: playerDamageUrl, columns: 1, rows: 1 },
  targetHeight: 220,
};

export const ENEMY_SHEETS: CharacterSheetDefinition = {
  idle: { src: enemyIdleUrl, columns: 8, rows: 8 },
  attack: { src: enemyAttackUrl, columns: 6, rows: 5 },
  damage: { src: enemyDamageUrl, columns: 6, rows: 5 },
  targetHeight: 220,
};
