export interface SentenceTimelineControls {
  play: () => void;
  pause: () => void;
  restart: () => void;
  seek: (seconds: number) => void;
  setSpeed: (speed: number) => void;
  skip: () => void;
  kill: () => void;
  isKilled: () => boolean;
}

export function createSentenceTimelineControls(
  timeline: gsap.core.Timeline,
  cleanup: () => void,
): SentenceTimelineControls {
  let killed = false;
  const whenAlive = (operation: () => void) => {
    if (!killed) operation();
  };

  return {
    play: () => whenAlive(() => timeline.play()),
    pause: () => whenAlive(() => timeline.pause()),
    restart: () => whenAlive(() => timeline.restart()),
    seek: (seconds) =>
      whenAlive(() =>
        timeline.seek(
          Math.max(0, Math.min(seconds, timeline.duration())),
          false,
        ),
      ),
    setSpeed: (speed) =>
      whenAlive(() => timeline.timeScale(Math.max(0.05, speed))),
    skip: () => whenAlive(() => timeline.progress(1, false)),
    kill: () => {
      if (killed) return;
      killed = true;
      timeline.pause();
      timeline.kill();
      cleanup();
    },
    isKilled: () => killed,
  };
}
