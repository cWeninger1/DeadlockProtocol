// Original synthesized cues; no external audio assets.
export function createObjectiveAudio() {
  let context: AudioContext | undefined;
  return {
    unlock() {
      try {
        context ??= new AudioContext();
        if (context.state === "suspended")
          void context.resume().catch(() => {});
      } catch {
        /* Gameplay remains usable when audio is unavailable. */
      }
    },
    cue(kind: "planted" | "defused" | "detonated") {
      if (!context || context.state !== "running") return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const time = context.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(
        kind === "planted" ? 660 : kind === "defused" ? 880 : 120,
        time,
      );
      oscillator.frequency.exponentialRampToValueAtTime(
        kind === "detonated" ? 40 : 440,
        time + 0.4,
      );
      gain.gain.setValueAtTime(0.06, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(time);
      oscillator.stop(time + 0.5);
    },
    dispose() {
      if (context) void context.close().catch(() => {});
    },
  };
}
