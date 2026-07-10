import type { CSSProperties } from "react";
import tutorialGroundUrl from "../../assets/backgrounds/チュートリアル/ground.png";
import tutorialPillarUrl from "../../assets/backgrounds/チュートリアル/pillar.png";
import tutorialWallUrl from "../../assets/backgrounds/チュートリアル/wall.png";
import { ENEMY_SHEETS, PLAYER_SHEETS } from "../../game/characterAssets";
import type { PlayerActionSemanticId } from "../../readingLoop/types";
import type { EncounterVisualState } from "./types";

interface EncounterSceneProps {
  state: EncounterVisualState;
  label: string;
  selectedAction?: PlayerActionSemanticId | null;
  showQuestion?: boolean;
  compact?: boolean;
}

const SCENE_STYLE = {
  "--reading-wall": `url("${tutorialWallUrl}")`,
  "--reading-pillar": `url("${tutorialPillarUrl}")`,
  "--reading-ground": `url("${tutorialGroundUrl}")`,
  "--reading-enemy": `url("${ENEMY_SHEETS.idle.src}")`,
} as CSSProperties;

export function EncounterScene({
  state,
  label,
  selectedAction = null,
  showQuestion = false,
  compact = false,
}: EncounterSceneProps) {
  const className = [
    "reading-encounter",
    `is-${state}`,
    selectedAction ? `has-${selectedAction.replaceAll(".", "-")}` : "",
    compact ? "is-compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <figure className={className} style={SCENE_STYLE} aria-label={label}>
      <div className="reading-encounter__backdrop" aria-hidden="true" />
      <div className="reading-encounter__mist" aria-hidden="true" />
      <div className="reading-encounter__signal" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="reading-encounter__enemy" aria-hidden="true" />
      <div className="reading-encounter__player-wrap" aria-hidden="true">
        <img className="reading-encounter__player" src={PLAYER_SHEETS.idle.src} alt="" />
        <img className="reading-encounter__player-ghost" src={PLAYER_SHEETS.idle.src} alt="" />
        <span className="reading-encounter__shield" />
        <span className="reading-encounter__slash" />
      </div>
      <div className="reading-encounter__collision" aria-hidden="true">
        {showQuestion && <span>?</span>}
      </div>
      <figcaption className="reading-loop__sr-only">{label}</figcaption>
    </figure>
  );
}
