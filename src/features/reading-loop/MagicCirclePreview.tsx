import type { PlayerActionSemanticId } from "../../readingLoop/types";
import type { StrategyDisplayState } from "./types";

interface MagicCirclePreviewProps {
  conditionLabel: string;
  actionLabel?: string | null;
  action?: PlayerActionSemanticId | null;
  state: StrategyDisplayState;
  activePart?: "condition" | "connector" | "action" | "outcome";
  compact?: boolean;
}

const STATE_LABELS: Record<StrategyDisplayState, string> = {
  building: "円環を描き始めた",
  incomplete: "行動の印を待っている",
  invalid: "接続が途切れている",
  valid: "文として成立した。実戦では未確認",
  unverified: "文として成立した。実戦では未確認",
  refuted: "文は成立したが、戦闘で反証された",
  confirmed: "戦闘で働きを確認した",
};

export function MagicCirclePreview({
  conditionLabel,
  actionLabel,
  action = null,
  state,
  activePart,
  compact = false,
}: MagicCirclePreviewProps) {
  const className = [
    "reading-magic-circle",
    `is-${state}`,
    activePart ? `is-active-${activePart}` : "",
    compact ? "is-compact" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const flowPath =
    action === "player.dodge_side"
      ? "M221 130 C248 82 280 82 307 130"
      : action === "player.guard_front"
        ? "M221 130 C250 130 278 130 307 130"
        : action === "player.attack"
          ? "M221 130 C248 174 280 174 307 130"
          : "M221 130 C252 96 276 96 307 130";
  const actionGlyph =
    action === "player.dodge_side" ? (
      <>
        <path d="M350 154 C369 112 395 99 423 106" />
        <path d="M410 94 L426 105 L411 116" />
        <text x="386" y="163">避</text>
      </>
    ) : action === "player.guard_front" ? (
      <>
        <path d="M386 84 L423 102 L416 153 Q386 184 356 153 L349 102 Z" />
        <text x="386" y="143">守</text>
      </>
    ) : action === "player.attack" ? (
      <>
        <path d="M358 164 L413 101" />
        <path d="M397 98 L416 97 L415 116" />
        <path d="M354 151 L369 166" />
        <text x="386" y="188">攻</text>
      </>
    ) : null;

  return (
    <figure className={className} aria-label={`作戦の構造。${STATE_LABELS[state]}`}>
      <svg viewBox="0 0 520 260" aria-hidden="true">
        <defs>
          <filter id="reading-rune-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker
            id="reading-rune-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
          >
            <path d="M1 1 L9 5 L1 9 Z" />
          </marker>
        </defs>
        <g className="reading-magic-circle__condition">
          <circle cx="142" cy="130" r="78" />
          <circle cx="142" cy="130" r="58" />
          <path d="M142 63 L176 121 L142 196 L108 121 Z" />
          <text x="142" y="138">兆</text>
          <text className="reading-magic-circle__part-label" x="142" y="222">条件</text>
        </g>
        <g className="reading-magic-circle__connector">
          <path
            className="reading-magic-circle__flow"
            d={flowPath}
            markerEnd="url(#reading-rune-arrow)"
          />
          <circle cx="260" cy="111" r="7" />
          <text className="reading-magic-circle__part-label" x="260" y="170">なら</text>
        </g>
        <g className="reading-magic-circle__action">
          <circle cx="386" cy="130" r="78" />
          <circle cx="386" cy="130" r="58" />
          {actionGlyph ? (
            actionGlyph
          ) : (
            <path className="reading-magic-circle__open-arc" d="M353 179 A58 58 0 1 1 421 177" />
          )}
          <text className="reading-magic-circle__part-label" x="386" y="222">行動</text>
        </g>
      </svg>
      <figcaption>
        <span>{conditionLabel}</span>
        <span aria-hidden="true">→</span>
        <span>{actionLabel ?? "行動を選ぶ"}</span>
        <small>{STATE_LABELS[state]}</small>
      </figcaption>
    </figure>
  );
}
