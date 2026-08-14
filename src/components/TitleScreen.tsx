import { useState } from "react";
import titleBackgroundUrl from "../assets/UI/title/title.png";
import titleLogoUrl from "../assets/UI/title/title1.png";
import newGameLabelUrl from "../assets/UI/title/title2.png";
import quitLabelUrl from "../assets/UI/title/title3.png";
import historyLabelUrl from "../assets/UI/title/title4.png";
import continueLabelUrl from "../assets/UI/title/title5.png";
import "../styles/title-screen.css";

interface TitleScreenProps {
  onStart: () => void;
}

interface TitleMenuButtonProps {
  label: string;
  imageUrl: string;
  onClick?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

function TitleMenuButton({
  label,
  imageUrl,
  onClick,
  disabled = false,
  autoFocus = false,
}: TitleMenuButtonProps) {
  return (
    <button
      className="title-screen__menu-button"
      type="button"
      aria-label={disabled ? `${label}（セーブデータなし）` : label}
      title={disabled ? "セーブデータがありません" : label}
      onClick={onClick}
      disabled={disabled}
      autoFocus={autoFocus}
    >
      <img src={imageUrl} alt="" aria-hidden="true" draggable={false} />
    </button>
  );
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  const [notice, setNotice] = useState("");

  const showHistory = () => {
    setNotice("冒険の記録はまだありません。");
  };

  const quitGame = () => {
    if (window.opener) {
      window.close();
      return;
    }

    setNotice("終了するときは、このブラウザのタブを閉じてください。");
  };

  return (
    <main className="title-screen" aria-label="ことばクエスト タイトル画面">
      <img
        className="title-screen__background"
        src={titleBackgroundUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <div className="title-screen__shade" aria-hidden="true" />

      <h1 className="title-screen__logo">
        <img src={titleLogoUrl} alt="ことばクエスト" draggable={false} />
      </h1>

      <section className="title-screen__panel" aria-label="メインメニュー">
        <nav className="title-screen__menu" aria-label="タイトルメニュー">
          <TitleMenuButton
            label="新たに始める"
            imageUrl={newGameLabelUrl}
            onClick={onStart}
            autoFocus
          />
          <TitleMenuButton
            label="つづきから"
            imageUrl={continueLabelUrl}
            disabled
          />
          <TitleMenuButton
            label="履歴"
            imageUrl={historyLabelUrl}
            onClick={showHistory}
          />
          <TitleMenuButton
            label="やめる"
            imageUrl={quitLabelUrl}
            onClick={quitGame}
          />
        </nav>

        <p className="title-screen__notice" role="status" aria-live="polite">
          {notice}
        </p>
      </section>
    </main>
  );
}
