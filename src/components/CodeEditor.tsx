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

    // 行数を計算
    const lines = value.split("\n");
    const lineCount = lines.length;

    // スクロール同期
    const handleScroll = useCallback(() => {
      if (textareaRef.current && lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
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
      clearError: () => {
        setErrorInfo(null);
      },
    }));

    // テキストエリアの高さを自動調整
    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 120)}px`;
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
          <div className="code-editor-highlights">
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
