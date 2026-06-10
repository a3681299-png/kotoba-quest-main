import type { CSSProperties } from "react";
import dialogueWindowUrl from "../assets/dialogue/dialogue_window.png";
import namePlateUrl from "../assets/hud/name_plate.png";
import type { StageDialogueLine } from "../data/stages";

interface IntroDialogueProps {
  line: StageDialogueLine;
  isLastLine: boolean;
  onNext: () => void;
  onSkip: () => void;
}

export function IntroDialogue({
  line,
  isLastLine,
  onNext,
  onSkip,
}: IntroDialogueProps) {
  const assetStyle = {
    "--dialogue-window-image": `url(${dialogueWindowUrl})`,
    "--name-plate-image": `url(${namePlateUrl})`,
  } as CSSProperties;

  return (
    <div
      className="intro-dialogue-layer"
      aria-label="導入会話"
      style={assetStyle}
    >
      <div className="intro-dialogue-frame" aria-hidden="true" />
      <div
        className={`intro-portrait enemy ${
          line.speaker === "enemy" ? "active" : "inactive"
        }`}
        aria-hidden="true"
      >
        <span>{line.speaker === "enemy" ? line.name : "影"}</span>
      </div>
      <div
        className={`intro-portrait player ${
          line.speaker === "player" ? "active" : "inactive"
        }`}
        aria-hidden="true"
      >
        <span>{line.speaker === "player" ? line.name : "導き手"}</span>
      </div>

      <section className="intro-dialogue-box">
        <div className="intro-speaker">
          <span className="intro-speaker-role">
            {line.speaker === "player" ? "導き手" : "相手"}
          </span>
          <span className="intro-speaker-name">{line.name}</span>
        </div>
        <p className="intro-dialogue-text">{line.text}</p>
        <div className="intro-dialogue-actions">
          <button type="button" className="intro-skip-button" onClick={onSkip}>
            SKIP
          </button>
          <button type="button" className="intro-next-button" onClick={onNext}>
            {isLastLine ? "戦闘へ" : "NEXT"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default IntroDialogue;
