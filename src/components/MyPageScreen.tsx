import "../styles/my-page.css";

interface MyPageScreenProps {
  userName: string;
  onClose: () => void;
  onLogout: () => void;
}

export function MyPageScreen({ userName, onClose, onLogout }: MyPageScreenProps) {
  return (
    <main className="my-page">
      <div className="my-page__panel">
        <button type="button" className="my-page__close" onClick={onClose}>
          ← 戻る
        </button>

        <p className="my-page__eyebrow">マイページ</p>
        <h1 className="my-page__name">{userName}</h1>

        <section className="my-page__section">
          <h2 className="my-page__section-title">戦績</h2>
          <p className="my-page__placeholder">
            語彙遠征の戦闘ログはここに表示予定です（準備中）。
          </p>
        </section>

        <button type="button" className="my-page__logout" onClick={onLogout}>
          🚪 ログアウト
        </button>
      </div>
    </main>
  );
}
