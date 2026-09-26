let ctx: AudioContext | null = null;

export function chime(freq = 520, duration = 0.12, volume = 0.045): void {
  const AudioCtx = window.AudioContext;
  if (!AudioCtx) return;
  try {
    ctx ??= new AudioCtx();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Sound is optional. A blocked audio device should not stop practice.
  }
}
