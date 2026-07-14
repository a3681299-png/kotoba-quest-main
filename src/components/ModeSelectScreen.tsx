import "../styles/mode-select.css";

export type GameMode = "card" | "combine";

interface ModeSelectScreenProps {
  onSelect: (mode: GameMode) => void;
}

export function ModeSelectScreen({ onSelect }: ModeSelectScreenProps) {
  return (
    <main className="mode-select">
      <div className="mode-select__inner">
        <header className="mode-select__header">
          <p className="mode-select__eyebrow">ことばクエスト</p>
          <h1 className="mode-select__title">どちらで進める？</h1>
          <p className="mode-select__lead">
            遊び方を選んでください。
          </p>
        </header>

        <div className="mode-select__cards">
          <button
            type="button"
            className="mode-card mode-card--card"
            onClick={() => onSelect("card")}
          >
            <span className="mode-card__glyph" aria-hidden="true">🃏</span>
            <span className="mode-card__name">カードモード</span>
            <span className="mode-card__desc">
              まずは条件分岐の練習を
              <br />
              カードゲームで学ぼう
            </span>
            <span className="mode-card__go">はじめる →</span>
          </button>

          <button
            type="button"
            className="mode-card mode-card--combine"
            onClick={() => onSelect("combine")}
          >
            <span className="mode-card__glyph" aria-hidden="true">📖</span>
            <span className="mode-card__name">組み合わせモード</span>
            <span className="mode-card__desc">
              プログラミングの基礎を
              <br />
              日本語で学ぼう！
            </span>
            <span className="mode-card__go">はじめる →</span>
          </button>
        </div>
      </div>
    </main>
  );
}
