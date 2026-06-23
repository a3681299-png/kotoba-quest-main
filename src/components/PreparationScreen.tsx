import { useState, type CSSProperties } from "react";
import "../styles/preparation.css";

type PreparationScreenProps = {
  onStartBattle: () => void;
};

type SpellCard = {
  id: string;
  title: string;
  kind: string;
  command: string;
  cost: number;
  power: number;
  icon: string;
  description: string;
  rotation: number;
  offsetX: number;
  offsetY: number;
  zIndex: number;
};

type CardStyle = CSSProperties & {
  "--card-rotation": string;
  "--card-offset-x": string;
  "--card-offset-y": string;
  "--card-z-index": number;
};

const SPELL_CARDS: SpellCard[] = [
  {
    id: "guard",
    title: "守りの構え",
    kind: "防御",
    command: "防御()",
    cost: 0,
    power: 1,
    icon: "🛡️",
    description: "次の攻撃に備えて、受けるダメージを軽くする。",
    rotation: -11,
    offsetX: -190,
    offsetY: 20,
    zIndex: 1,
  },
  {
    id: "fire",
    title: "火のことば",
    kind: "攻撃",
    command: "攻撃(\"ファイア\")",
    cost: 1,
    power: 3,
    icon: "🔥",
    description: "正面の敵に、まっすぐ火の魔法を放つ。",
    rotation: -4,
    offsetX: -80,
    offsetY: 2,
    zIndex: 2,
  },
  {
    id: "loop",
    title: "くり返しの印",
    kind: "連続",
    command: "繰り返す(3)",
    cost: 2,
    power: 2,
    icon: "🔁",
    description: "同じ行動をまとめて実行する準備カード。",
    rotation: 5,
    offsetX: 34,
    offsetY: 10,
    zIndex: 3,
  },
  {
    id: "heal",
    title: "回復の光",
    kind: "回復",
    command: "回復()",
    cost: 1,
    power: 2,
    icon: "✨",
    description: "傷ついたときに、少しだけ体力を戻す。",
    rotation: 12,
    offsetX: 148,
    offsetY: 26,
    zIndex: 4,
  },
];

const PREPARATION_SLOTS = ["1", "2", "3"];

function getCardStyle(card: SpellCard): CardStyle {
  return {
    "--card-rotation": `${card.rotation}deg`,
    "--card-offset-x": `${card.offsetX}px`,
    "--card-offset-y": `${card.offsetY}px`,
    "--card-z-index": card.zIndex,
  };
}

export function PreparationScreen({ onStartBattle }: PreparationScreenProps) {
  const [selectedCardId, setSelectedCardId] = useState(SPELL_CARDS[1].id);
  const selectedCard =
    SPELL_CARDS.find((card) => card.id === selectedCardId) ?? SPELL_CARDS[0];

  return (
    <main className="preparation-screen">
      <section className="preparation-table" aria-label="準備フェーズのテーブル">
        <div className="table-grain table-grain-one" />
        <div className="table-grain table-grain-two" />
        <div className="table-grain table-grain-three" />

        <header className="preparation-header">
          <div>
            <p className="phase-label">PREPARATION PHASE</p>
            <h1>カードを選んで準備する</h1>
          </div>
          <button
            className="start-battle-button"
            type="button"
            onClick={onStartBattle}
          >
            バトルへ進む
          </button>
        </header>

        <div className="table-board">
          <div className="deck-pile" aria-hidden="true">
            <div className="deck-card deck-card-back" />
            <div className="deck-card deck-card-front">山札</div>
          </div>

          <div className="preparation-slots" aria-label="準備スロット">
            {PREPARATION_SLOTS.map((slot) => (
              <div className="preparation-slot" key={slot}>
                <span>{slot}</span>
              </div>
            ))}
          </div>

          <aside className="selected-card-panel" aria-live="polite">
            <span className="selected-card-label">選択中</span>
            <strong>{selectedCard.title}</strong>
            <code>{selectedCard.command}</code>
            <p>{selectedCard.description}</p>
          </aside>
        </div>

        <div className="card-hand" aria-label="手札">
          {SPELL_CARDS.map((card) => {
            const isSelected = card.id === selectedCardId;

            return (
              <button
                aria-pressed={isSelected}
                className={`spell-card ${isSelected ? "is-selected" : ""}`}
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
                style={getCardStyle(card)}
                type="button"
              >
                <span className="card-corner card-corner-top">
                  {card.cost}
                </span>
                <span className="card-corner card-corner-bottom">
                  {card.power}
                </span>

                <span className="card-kind">{card.kind}</span>
                <span className="card-art" aria-hidden="true">
                  {card.icon}
                </span>
                <span className="card-title">{card.title}</span>
                <span className="card-command">{card.command}</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
