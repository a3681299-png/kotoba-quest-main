import type { ReadingChapter } from "./types";

interface ChapterNavProps {
  current: ReadingChapter;
  available: readonly ReadingChapter[];
  onSelect?: (chapter: ReadingChapter) => void;
}

const CHAPTERS = [
  { id: "observation", number: "I", label: "観察" },
  { id: "reading", number: "II", label: "読み解き" },
  { id: "strategy", number: "III", label: "作戦" },
  { id: "validation", number: "IV", label: "検証" },
] as const;

export function ChapterNav({ current, available, onSelect }: ChapterNavProps) {
  return (
    <nav className="reading-loop__chapters" aria-label="魔導書の章">
      <ol>
        {CHAPTERS.map((chapter) => {
          const isAvailable = available.includes(chapter.id);
          const isCurrent = current === chapter.id;
          return (
            <li key={chapter.id}>
              <button
                type="button"
                className={isCurrent ? "is-current" : ""}
                aria-current={isCurrent ? "step" : undefined}
                disabled={!isAvailable}
                onClick={() => onSelect?.(chapter.id)}
              >
                <span aria-hidden="true" className="reading-loop__chapter-seal">
                  {chapter.number}
                </span>
                <span>{chapter.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
