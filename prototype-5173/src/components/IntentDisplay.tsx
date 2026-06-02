import { useGameStore } from "../store/useGameStore";
import "./IntentDisplay.css";

/**
 * Intent（予兆）表示コンポーネント
 *
 * 敵の次の行動を予告し、対策のヒントを表示する
 */
export function IntentDisplay() {
  const { currentIntent, currentStage } = useGameStore();

  // Intentがなければ何も表示しない
  if (!currentIntent) {
    return null;
  }

  // ステージ1は特別表示（攻撃なし）
  const isStage1 = currentStage === 1;

  return (
    <div className={`intent-display ${currentIntent.type}`}>
      <div className="intent-header">
        <span className="intent-warning-icon">⚠️</span>
        <span className="intent-title">次のターン予告</span>
      </div>

      <div className="intent-content">
        <span className="intent-icon">{currentIntent.icon}</span>
        <span className="intent-description">{currentIntent.description}</span>
      </div>

      {/* ダメージ予告（ステージ1以外） */}
      {!isStage1 && currentIntent.damage > 0 && (
        <div className="intent-damage">
          予想ダメージ:{" "}
          <span className="damage-value">{currentIntent.damage}</span>
        </div>
      )}

      {/* ヒント表示 */}
      {currentIntent.hint && (
        <div className="intent-hint">
          <span className="hint-icon">💡</span>
          <span className="hint-text">{currentIntent.hint}</span>
        </div>
      )}
    </div>
  );
}

export default IntentDisplay;
