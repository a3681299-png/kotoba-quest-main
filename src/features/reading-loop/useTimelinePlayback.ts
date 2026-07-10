import { useCallback, useEffect, useState } from "react";

interface TimelinePlaybackOptions {
  itemCount: number;
  intervalMs?: number;
}

export function useTimelinePlayback({
  itemCount,
  intervalMs = 1500,
}: TimelinePlaybackOptions) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(itemCount > 1);

  useEffect(() => {
    if (!isPlaying || itemCount <= 0) return;

    const timerId = window.setTimeout(() => {
      setActiveIndex((current) => {
        if (current >= itemCount - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, intervalMs);

    return () => window.clearTimeout(timerId);
  }, [activeIndex, intervalMs, isPlaying, itemCount]);

  const play = useCallback(() => {
    setActiveIndex((current) => (current >= itemCount - 1 ? 0 : current));
    setIsPlaying(true);
  }, [itemCount]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const replay = useCallback(() => {
    setActiveIndex(0);
    setIsPlaying(true);
  }, []);

  const jumpTo = useCallback((index: number) => {
    setActiveIndex(index);
    setIsPlaying(false);
  }, []);

  return {
    activeIndex,
    isPlaying,
    play,
    pause,
    replay,
    jumpTo,
  };
}
