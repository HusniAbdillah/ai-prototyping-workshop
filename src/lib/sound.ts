/**
 * Web Audio API Synthesizer — membunyikan alarm peringatan halus (dual-tone
 * 880Hz -> 440Hz) TANPA aset audio eksternal, sesuai docs/04 & docs/06.
 */

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) audioContext = new Ctor();
  return audioContext;
}

/** Mainkan nada chime dual-tone 880Hz -> 440Hz. Aman dipanggil tanpa interaksi. */
export function playWarningChime(): void {
  const ctx = getContext();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    // Fade-in halus dan fade-out agar tidak menyentak.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    // Dual-tone: 880Hz lalu 440Hz.
    const tones = [880, 440];
    tones.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const startAt = now + index * 0.18;
      osc.frequency.setValueAtTime(freq, startAt);
      osc.connect(gain);
      osc.start(startAt);
      osc.stop(startAt + 0.28);
    });
  } catch {
    // Autoplay policy / environment tanpa audio: gagal senyap.
  }
}
