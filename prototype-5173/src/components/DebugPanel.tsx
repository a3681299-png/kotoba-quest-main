import { useGameStore } from "../store/useGameStore";
import "./DebugPanel.css";

/**
 * デバッグパネル（変数ウォッチ）
 *
 * - 現在の実行状態を表示
 * - HP/変数の値をリアルタイム表示
 * - ステップ実行の「次へ」ボタン
 */
export function DebugPanel() {
  const {
    playerHp,
    maxPlayerHp,
    enemyHp,
    maxEnemyHp,
    variables,
    executionStatus,
    isStepMode,
    currentLine,
    logs,
    setStepMode,
    nextStep,
  } = useGameStore();

  // 変数をエントリー配列に変換
  const variableEntries = Array.from(variables.entries());

  // ステータスの日本語表示
  const statusLabels: Record<string, string> = {
    idle: "⏸️ 待機中",
    running: "▶️ 実行中",
    stepping: "🔄 ステップ実行中",
    paused: "⏯️ 一時停止",
    completed: "✅ 完了",
    error: "❌ エラー",
  };

  return (
    <div className="debug-panel">
      <div className="debug-panel-header">
        <h3 className="debug-panel-title">🔍 デバッグパネル</h3>
        <div className="step-mode-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={isStepMode}
              onChange={(e) => setStepMode(e.target.checked)}
              className="toggle-input"
            />
            <span className="toggle-slider" />
            <span className="toggle-text">ステップ実行</span>
          </label>
        </div>
      </div>

      {/* 実行状態 */}
      <div className="debug-section">
        <div className="debug-section-title">📊 実行状態</div>
        <div className="status-display">
          <span className="status-label">
            {statusLabels[executionStatus] || executionStatus}
          </span>
          {currentLine !== null && (
            <span className="current-line">（{currentLine}行目）</span>
          )}
        </div>

        {/* ステップ実行ボタン */}
        {executionStatus === "paused" && (
          <button className="next-step-button" onClick={nextStep}>
            ➡️ 次へ進む
          </button>
        )}
      </div>

      {/* HP表示 */}
      <div className="debug-section">
        <div className="debug-section-title">❤️ ステータス</div>
        <div className="hp-display">
          <div className="hp-row">
            <span className="hp-label">🧙 プレイヤー</span>
            <span className="hp-value">
              {playerHp} / {maxPlayerHp}
            </span>
            <div className="hp-bar-mini">
              <div
                className="hp-bar-fill player"
                style={{ width: `${(playerHp / maxPlayerHp) * 100}%` }}
              />
            </div>
          </div>
          <div className="hp-row">
            <span className="hp-label">👾 敵</span>
            <span className="hp-value">
              {enemyHp} / {maxEnemyHp}
            </span>
            <div className="hp-bar-mini">
              <div
                className="hp-bar-fill enemy"
                style={{ width: `${(enemyHp / maxEnemyHp) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 変数ウォッチ */}
      <div className="debug-section">
        <div className="debug-section-title">📝 変数</div>
        {variableEntries.length > 0 ? (
          <div className="variables-list">
            {variableEntries.map(([name, value]) => (
              <div key={name} className="variable-row">
                <span className="variable-name">{name}</span>
                <span className="variable-equals">=</span>
                <span className="variable-value">
                  {typeof value === "string" ? `"${value}"` : value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-variables">変数なし</div>
        )}
      </div>

      {/* 実行ログ */}
      {logs.length > 0 && (
        <div className="debug-section">
          <div className="debug-section-title">📜 ログ</div>
          <div className="logs-list">
            {logs.slice(-5).map((log, index) => (
              <div key={index} className="log-row">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DebugPanel;
