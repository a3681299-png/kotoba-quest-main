import { useState } from "react";
import titleBackgroundUrl from "../assets/UI/title/title.png";
import titleLogoUrl from "../assets/UI/title/title1.png";
import newGameLabelUrl from "../assets/UI/title/title2.png";
import historyLabelUrl from "../assets/UI/title/title4.png";
import continueLabelUrl from "../assets/UI/title/title5.png";
import { auth, getUserProgress, type UserProgressData } from "../lib/firebase";
import "../styles/title-screen.css";

interface TitleScreenProps {
  onStart: () => void;
  onContinue: () => void;
  onLogout: () => void;
  hasSave: boolean;
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

export function TitleScreen({
  onStart,
  onContinue,
  onLogout,
  hasSave,
}: TitleScreenProps) {
  const [notice, setNotice] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [history, setHistory] = useState<UserProgressData | null>(null);

  const showHistory = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setNotice("ログイン情報が確認できませんでした。");
      return;
    }
    setNotice("");
    setIsHistoryOpen(true);
    setIsLoadingHistory(true);
    setHistory(null);
    const data = await getUserProgress(uid);
    setHistory(data);
    setIsLoadingHistory(false);
  };

  const closeHistory = () => {
    setIsHistoryOpen(false);
  };

  const historyEntries = history
    ? Object.entries(history.codes)
        .map(([id, code]) => ({ stageId: Number(id), code }))
        .sort((a, b) => a.stageId - b.stageId)
    : [];

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
            onClick={onContinue}
            disabled={!hasSave}
          />
          <TitleMenuButton
            label="履歴"
            imageUrl={historyLabelUrl}
            onClick={showHistory}
          />
          <button
            className="title-screen__menu-button title-screen__menu-button--text"
            type="button"
            aria-label="ログアウト"
            title="ログアウト"
            onClick={onLogout}
          >
            <span>ログアウト</span>
          </button>
        </nav>

        <p className="title-screen__notice" role="status" aria-live="polite">
          {notice}
        </p>
      </section>

      {isHistoryOpen && (
        <div
          className="title-history-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="title-history-heading"
          onClick={closeHistory}
        >
          <div
            className="title-history-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="title-history-heading">冒険の記録</h2>

            {isLoadingHistory ? (
              <p className="title-history-message">読み込み中…</p>
            ) : history === null ? (
              <p className="title-history-message">
                記録を読み込めませんでした。バックエンド（server）が起動しているか確認してください。
              </p>
            ) : historyEntries.length === 0 ? (
              <p className="title-history-message">
                まだ記録がありません。作戦を実行すると保存されます。
              </p>
            ) : (
              <ul className="title-history-list">
                {historyEntries.map((entry) => (
                  <li key={entry.stageId}>
                    <span className="title-history-stage">
                      ステージ {entry.stageId}
                    </span>
                    <p className="title-history-code">{entry.code}</p>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              className="title-history-close"
              onClick={closeHistory}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
