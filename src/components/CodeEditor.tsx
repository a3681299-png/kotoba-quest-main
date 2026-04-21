import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import "./CodeEditor.css";

export interface CodeEditorRef {
  highlightLine: (
    lineNumber: number,
    status: "executing" | "complete" | "error" | "clear",
  ) => void;
  focus: () => void;
  clearHighlights: () => void;
  setErrorLine: (lineNumber: number, message: string) => void;
  clearError: () => void;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface LineHighlight {
  status: "executing" | "complete" | "error";
  message?: string;
}

/**
 * 軽量コードエディタコンポーネント
 * - 行番号表示
 * - 実行中/完了/エラー行のハイライト
 * - 日本語入力対応
 */
export const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(
  ({ value, onChange, disabled = false, placeholder }, ref) => {
    const [highlights, setHighlights] = useState<Map<number, LineHighlight>>(
      new Map(),
    );
    const [errorInfo, setErrorInfo] = useState<{
      line: number;
      message: string;
    } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const highlightsRef = useRef<HTMLDivElement>(null);

    // 行数を計算
    const lines = value.split("\n");
    const lineCount = lines.length;

    // スクロール同期
    const handleScroll = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textarea.scrollTop;
      }

      // テキストエリアがスクロールする場合でも、ハイライトが同じ行に重なるように追従させる
      if (highlightsRef.current) {
        highlightsRef.current.style.transform = `translateY(-${textarea.scrollTop}px)`;
      }
    }, []);

    // 外部からハイライト操作を可能にする
    useImperativeHandle(ref, () => ({
      highlightLine: (
        lineNumber: number,
        status: "executing" | "complete" | "error" | "clear",
      ) => {
        setHighlights((prev) => {
          const next = new Map(prev);
          if (status === "clear") {
            next.delete(lineNumber);
          } else {
            next.set(lineNumber, { status });
          }
          return next;
        });
      },
      clearHighlights: () => {
        setHighlights(new Map());
      },
      setErrorLine: (lineNumber: number, message: string) => {
        setErrorInfo({ line: lineNumber, message });
        setHighlights((prev) => {
          const next = new Map(prev);
          next.set(lineNumber, { status: "error", message });
          return next;
        });
      },
      focus: () => {
        textareaRef.current?.focus();
      },
      clearError: () => {
        setErrorInfo(null);
      },
    }));

    // テキストエリアの高さを自動調整（ボタンが画面下に隠れないよう上限付き）
    useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const minHeight = 120;
      const maxHeight =
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 600px)").matches
          ? 180
          : 240;

      textarea.style.height = "auto";
      const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${Math.max(nextHeight, minHeight)}px`;
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";

      // 高さ調整後にハイライト位置も同期しておく
      if (highlightsRef.current) {
        highlightsRef.current.style.transform = `translateY(-${textarea.scrollTop}px)`;
      }
    }, [value]);

    return (
      <div className="code-editor-container">
        {/* 行番号 */}
        <div className="code-editor-line-numbers" ref={lineNumbersRef}>
          {Array.from({ length: lineCount }, (_, i) => {
            const lineNum = i + 1;
            const highlight = highlights.get(lineNum);
            const highlightClass = highlight ? `line-${highlight.status}` : "";
            return (
              <div key={lineNum} className={`line-number ${highlightClass}`}>
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* コード入力エリア */}
        <div className="code-editor-input-wrapper">
          {/* ハイライトオーバーレイ */}
          <div className="code-editor-highlights" ref={highlightsRef}>
            {lines.map((line, i) => {
              const lineNum = i + 1;
              const highlight = highlights.get(lineNum);
              const highlightClass = highlight
                ? `highlight-${highlight.status}`
                : "";
              return (
                <div
                  key={lineNum}
                  className={`highlight-line ${highlightClass}`}
                >
                  {line || " "}
                </div>
              );
            })}
          </div>

          {/* テキストエリア */}
          <textarea
            ref={textareaRef}
            className="code-editor-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            disabled={disabled}
            placeholder={placeholder}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>

        {/* エラーメッセージ表示 */}
        {errorInfo && (
          <div className="code-editor-error">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{errorInfo.message}</span>
          </div>
        )}
      </div>
    );
  },
);

CodeEditor.displayName = "CodeEditor";

export default CodeEditor;
