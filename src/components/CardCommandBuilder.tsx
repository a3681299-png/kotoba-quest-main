import { useMemo, useState } from "react";
import {
  appendCardSelection,
  buildCodeFromCardSelection,
  getTacticalCardsForStage,
  removeCardSelection,
  type TacticalCard,
} from "./tacticalCards";

interface CardCommandBuilderProps {
  stageId: number;
  disabled?: boolean;
  onCodeChange: (code: string) => void;
}

const KIND_LABELS: Record<TacticalCard["kind"], string> = {
  logic: "Logic",
  condition: "If",
  action: "Act",
  memory: "Log",
};

export function CardCommandBuilder({
  stageId,
  disabled = false,
  onCodeChange,
}: CardCommandBuilderProps) {
  const cards = useMemo(() => getTacticalCardsForStage(stageId), [stageId]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedCards = selectedIds
    .map((id) => cards.find((card) => card.id === id))
    .filter((card): card is TacticalCard => Boolean(card));

  const chooseCard = (card: TacticalCard) => {
    if (disabled) return;

    const nextSelection = appendCardSelection(selectedIds, card.id);
    setSelectedIds(nextSelection);
    onCodeChange(buildCodeFromCardSelection(cards, nextSelection));
  };

  const removeCard = (index: number) => {
    if (disabled) return;

    const nextSelection = removeCardSelection(selectedIds, index);
    setSelectedIds(nextSelection);
    onCodeChange(buildCodeFromCardSelection(cards, nextSelection));
  };

  return (
    <section className="card-command-builder" aria-label="カード作戦">
      <div className="script-chain" aria-label="作戦ライン">
        <div className="panel-title">作戦ライン</div>
        <div className="chain-slots">
          {selectedCards.length > 0 ? (
            selectedCards.map((card, index) => (
              <button
                key={`${card.id}-${index}`}
                className={`chain-card ${card.kind}`}
                onClick={() => removeCard(index)}
                disabled={disabled}
                type="button"
              >
                <span className="chain-card-index">{index + 1}</span>
                <span className="chain-card-label">{card.label}</span>
              </button>
            ))
          ) : (
            <div className="chain-empty">...</div>
          )}
        </div>
      </div>

      <div className="tactical-hand" aria-label="手札">
        {cards.map((card) => (
          <button
            key={card.id}
            className={`tactical-card ${card.kind}`}
            onClick={() => chooseCard(card)}
            disabled={disabled}
            type="button"
          >
            <span className="card-kind">{KIND_LABELS[card.kind]}</span>
            <span className="card-cost">{card.cost}</span>
            <span className="card-title">{card.label}</span>
            <span className="card-code">{card.code}</span>
            <span className="card-description">{card.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default CardCommandBuilder;
