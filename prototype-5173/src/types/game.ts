// ゲーム内で使用する型定義

// キャラクターの種類
export type CharacterType = 'player' | 'enemy';

// キャラクターのステータス
export interface CharacterStats {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
}

// ゲームの状態
export interface GameState {
  stage: number;
  level: number;
  player: CharacterStats;
  enemy: CharacterStats;
  isPlayerTurn: boolean;
  battleLog: string[];
}

// 攻撃の種類
export interface AttackType {
  name: string;
  damage: number;
  element: 'fire' | 'ice' | 'thunder' | 'normal';
  animation: string;
}

// ステージ情報
export interface StageInfo {
  id: number;
  name: string;
  description: string;
  enemy: CharacterStats;
  requiredConcept: string; // 学習する概念
  hint: string;
}
