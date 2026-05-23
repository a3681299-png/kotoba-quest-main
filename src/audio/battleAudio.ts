type SoundKind =
  | "cast"
  | "attack"
  | "heal"
  | "defend"
  | "enemyAttack"
  | "victory"
  | "defeat"
  | "ui";

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

async function ensureRunningContext() {
  const context = getAudioContext();
  if (!context) return null;

  if (context.state === "suspended") {
    await context.resume();
  }

  return context;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  gainValue: number,
  options?: { frequencyEnd?: number; detune?: number },
) {
  const context = getAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, context.currentTime);

  if (options?.frequencyEnd !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, options.frequencyEnd),
      context.currentTime + duration / 1000,
    );
  }

  if (options?.detune !== undefined) {
    oscillator.detune.value = options.detune;
  }

  gainNode.gain.setValueAtTime(0.0001, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    gainValue,
    context.currentTime + 0.02,
  );
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    context.currentTime + duration / 1000,
  );

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + duration / 1000 + 0.05);
}

function playChime(pattern: Array<[number, number, OscillatorType?]>) {
  let offset = 0;

  for (const [frequency, duration, type = "sine"] of pattern) {
    window.setTimeout(() => {
      playTone(frequency, duration, type, 0.12);
    }, offset);

    offset += duration + 35;
  }
}

export async function unlockBattleAudio() {
  await ensureRunningContext();
}

export function playBattleSound(kind: SoundKind) {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    void context.resume();
  }

  switch (kind) {
    case "cast":
      playTone(660, 120, "triangle", 0.08, { frequencyEnd: 920 });
      break;
    case "attack":
      playTone(520, 110, "square", 0.08, { frequencyEnd: 180 });
      break;
    case "heal":
      playTone(440, 120, "sine", 0.08, { frequencyEnd: 660 });
      window.setTimeout(() => playTone(660, 150, "sine", 0.07), 90);
      break;
    case "defend":
      playTone(300, 140, "triangle", 0.07, { frequencyEnd: 420 });
      break;
    case "enemyAttack":
      playTone(180, 180, "sawtooth", 0.06, { frequencyEnd: 90 });
      break;
    case "victory":
      playChime([
        [523.25, 120],
        [659.25, 120],
        [783.99, 160],
        [1046.5, 220],
      ]);
      break;
    case "defeat":
      playChime([
        [220, 160, "sawtooth"],
        [185, 180, "sawtooth"],
        [147, 220, "sawtooth"],
      ]);
      break;
    case "ui":
      playTone(880, 70, "sine", 0.04, { frequencyEnd: 990 });
      break;
  }
}