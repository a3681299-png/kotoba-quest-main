import type { PlayerActionSemanticId } from "../../readingLoop/types";
import { EncounterScene } from "./EncounterScene";
import { MagicCirclePreview } from "./MagicCirclePreview";
import type {
  EncounterVisualState,
  ExtractedFragmentView,
  StrategyChoiceView,
  StrategyDisplayState,
} from "./types";

interface StrategyWorkbenchProps {
  conditionLabel: string;
  choices: readonly StrategyChoiceView[];
  selectedAction: PlayerActionSemanticId | null;
  sentenceText: string;
  syntaxState: StrategyDisplayState;
  evidenceFragments: readonly ExtractedFragmentView[];
  onSelectAction: (action: PlayerActionSemanticId) => void;
  onValidate: () => void;
}

function getPreviewState(action: PlayerActionSemanticId | null): EncounterVisualState {
  switch (action) {
    case "player.dodge_side":
      return "dodge";
    case "player.guard_front":
      return "guard";
    case "player.attack":
      return "attack";
    default:
      return "telegraph";
  }
}

export function StrategyWorkbench({
  conditionLabel,
  choices,
  selectedAction,
  sentenceText,
  syntaxState,
  evidenceFragments,
  onSelectAction,
  onValidate,
}: StrategyWorkbenchProps) {
  const selectedChoice = choices.find((choice) => choice.id === selectedAction) ?? null;

  return (
    <section className="reading-stage reading-strategy" aria-labelledby="reading-strategy-title">
      <header className="reading-stage__header">
        <div>
          <p className="reading-stage__eyebrow">第三章・作戦</p>
          <h1 id="reading-strategy-title" tabIndex={-1}>
            兆しに返す行動を選ぶ
          </h1>
          <p>条件は写し取った。次は、その瞬間に自分がどう動くかを決める。</p>
        </div>
        <span className="reading-stage__objective">選ぶもの：自分の行動</span>
      </header>

      <div className="reading-strategy__layout">
        <div className="reading-strategy__preview-column">
          <EncounterScene
            state={getPreviewState(selectedAction)}
            selectedAction={selectedAction}
            label={
              selectedChoice
                ? `${conditionLabel}時に${selectedChoice.label}。結果はまだ分からない`
                : `${conditionLabel}時の行動はまだ決まっていない`
            }
            showQuestion
            compact
          />
          <div className="reading-action-choices" aria-label="作戦に置く行動">
            {choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                aria-pressed={selectedAction === choice.id}
                onClick={() => onSelectAction(choice.id)}
              >
                <span className="reading-action-choices__rune" aria-hidden="true">
                  {choice.id === "player.dodge_side"
                    ? "↗"
                    : choice.id === "player.guard_front"
                      ? "盾"
                      : "剣"}
                </span>
                <span>
                  <strong>{choice.label}</strong>
                  <small>{choice.description}</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="reading-strategy__workbench">
          <MagicCirclePreview
            conditionLabel={conditionLabel}
            actionLabel={selectedChoice?.label}
            action={selectedAction}
            state={syntaxState}
          />

          <div className="reading-strategy-sentence" aria-live="polite">
            <span className="reading-strategy-sentence__label">作戦文</span>
            <p>{sentenceText}</p>
            <div className="reading-strategy-sentence__route" aria-hidden="true">
              <span className="is-filled">もし</span>
              <span className="is-filled">{conditionLabel}</span>
              <span className="is-filled">なら</span>
              <span className={selectedChoice ? "is-filled" : "is-open"}>
                {selectedChoice?.shortLabel ?? "行動"}
              </span>
            </div>
          </div>

          <details className="reading-evidence-reminder">
            <summary>根拠の原文を見返す</summary>
            <ul>
              {evidenceFragments.map((fragment) => (
                <li key={fragment.id}>
                  <span>{fragment.roleLabel}</span>
                  <q>{fragment.text}</q>
                </li>
              ))}
            </ul>
          </details>

          <button
            type="button"
            className="reading-primary-action"
            disabled={!selectedAction}
            onClick={onValidate}
          >
            実戦で検証する
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
