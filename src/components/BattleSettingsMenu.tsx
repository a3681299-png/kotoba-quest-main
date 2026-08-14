import { useEffect, useRef, useState } from "react";
import settingsIconUrl from "../assets/UI/icon/hud/settings_icon.png";
import "../styles/battle-settings-menu.css";

interface BattleSettingsMenuProps {
  isBattleBusy: boolean;
  restartLabel?: string;
  restartDescription?: string;
  busyMessage?: string;
  onRestart: () => void;
  onReturnToTitle: () => void;
}

export function BattleSettingsMenu({
  isBattleBusy,
  restartLabel = "ステージをやり直す",
  restartDescription = "このステージの最初に戻ります",
  busyMessage = "処理が終わるまで、やり直しとタイトルへの移動はできません。",
  onRestart,
  onReturnToTitle,
}: BattleSettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const trigger = triggerRef.current;
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      if (document.contains(trigger)) {
        trigger?.focus();
      }
    };
  }, [isOpen]);

  const runMenuAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <>
      <button
        ref={triggerRef}
        className="battle-settings-trigger"
        type="button"
        aria-label="設定を開く"
        aria-expanded={isOpen}
        aria-controls="battle-settings-dialog"
        onClick={() => setIsOpen(true)}
      >
        <img src={settingsIconUrl} alt="" aria-hidden="true" draggable={false} />
      </button>

      {isOpen && (
        <div
          className="battle-settings-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <section
            id="battle-settings-dialog"
            className="battle-settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="battle-settings-title"
            aria-describedby="battle-settings-description"
          >
            <header className="battle-settings-dialog__header">
              <div>
                <span>GAME MENU</span>
                <h2 id="battle-settings-title">設定</h2>
              </div>
              <button
                ref={closeButtonRef}
                className="battle-settings-dialog__close"
                type="button"
                onClick={() => setIsOpen(false)}
              >
                閉じる
              </button>
            </header>

            <p
              id="battle-settings-description"
              className="battle-settings-dialog__description"
            >
              戦闘の続行、やり直し、タイトルへの移動を選べます。
            </p>

            <div className="battle-settings-actions">
              <button type="button" onClick={() => setIsOpen(false)}>
                <strong>戦闘に戻る</strong>
                <span>現在の戦闘を続けます</span>
              </button>
              <button
                type="button"
                disabled={isBattleBusy}
                onClick={() => runMenuAction(onRestart)}
              >
                <strong>{restartLabel}</strong>
                <span>{restartDescription}</span>
              </button>
              <button
                className="is-caution"
                type="button"
                disabled={isBattleBusy}
                onClick={() => runMenuAction(onReturnToTitle)}
              >
                <strong>タイトルへ戻る</strong>
                <span>現在の画面を閉じてタイトルへ移動します</span>
              </button>
            </div>

            {isBattleBusy && (
              <p className="battle-settings-dialog__busy" role="status">
                {busyMessage}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
