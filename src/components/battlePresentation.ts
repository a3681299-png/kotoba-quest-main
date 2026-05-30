import type { BattlePhase } from "../store/useGameStore";

interface BattleFieldPresentation {
  className: string;
  overlayLabel: string;
}

const PRESENTATION_BY_PHASE: Record<BattlePhase, BattleFieldPresentation> = {
  player_turn: {
    className: "battle-field phase-player-turn",
    overlayLabel: "入力待機中",
  },
  executing: {
    className: "battle-field phase-executing",
    overlayLabel: "コード詠唱中",
  },
  show_intent: {
    className: "battle-field phase-show-intent",
    overlayLabel: "敵予兆表示中",
  },
  enemy_turn: {
    className: "battle-field phase-enemy-turn",
    overlayLabel: "敵行動中",
  },
  victory: {
    className: "battle-field phase-victory",
    overlayLabel: "勝利",
  },
  defeat: {
    className: "battle-field phase-defeat",
    overlayLabel: "敗北",
  },
};

export function getBattleFieldPresentation(
  battlePhase: BattlePhase,
): BattleFieldPresentation {
  return PRESENTATION_BY_PHASE[battlePhase];
}
