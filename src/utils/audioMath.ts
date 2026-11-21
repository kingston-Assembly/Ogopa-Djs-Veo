/**
 * Pure Audio & Beat Math calculations for DJ Console
 */

export interface CrossfaderGains {
  gainA: number;
  gainB: number;
}

/**
 * Calculates deck A and deck B gains based on crossfader position (-1 to 1) and curve type.
 * -1 = 100% Deck A, 0 = Center, +1 = 100% Deck B.
 */
export function calculateCrossfaderGains(
  position: number,
  curve: 'smooth' | 'scratch' = 'smooth'
): CrossfaderGains {
  // Clamp between -1 and 1
  const x = Math.max(-1, Math.min(1, position));

  if (curve === 'scratch') {
    // Sharp cut: full volume almost everywhere, quick steep dip at extreme ends
    const gainA = x > 0.9 ? Math.max(0, (1 - x) / 0.1) : 1;
    const gainB = x < -0.9 ? Math.max(0, (x + 1) / 0.1) : 1;
    return {
      gainA: Math.round(gainA * 1000) / 1000,
      gainB: Math.round(gainB * 1000) / 1000,
    };
  }

  // Smooth Equal Power Curve (Constant Power)
  // Normalized position [0, 1] where 0 = A, 1 = B
  const norm = (x + 1) / 2;
  const angle = norm * (Math.PI / 2);
  const gainA = Math.cos(angle);
  const gainB = Math.sin(angle);

  return {
    gainA: Math.round(gainA * 1000) / 1000,
    gainB: Math.round(gainB * 1000) / 1000,
  };
}

/**
 * Converts musical beat count to duration in seconds at a given BPM.
 */
export function beatsToSeconds(beats: number, bpm: number): number {
  if (bpm <= 0) return 0;
  const secondsPerBeat = 60 / bpm;
  return beats * secondsPerBeat;
}

/**
 * Calculates quantized echo delay time in seconds for a given beat division and BPM,
 * clamping to safe Web Audio delay boundaries [0.05s, 2.0s].
 */
export function calculateQuantizedEchoDelay(beats: number, bpm: number): number {
  const sec = beatsToSeconds(beats, bpm);
  return Math.max(0.05, Math.min(2.0, sec));
}

/**
 * Calculates current beat index and normalized beat phase (0.0 to 1.0)
 */
export function calculateBeatPhase(currentTime: number, bpm: number, firstBeatOffset = 0): { beat: number; phase: number } {
  if (bpm <= 0 || currentTime < firstBeatOffset) {
    return { beat: 0, phase: 0 };
  }
  const timeSinceFirst = currentTime - firstBeatOffset;
  const beatDuration = 60 / bpm;
  const totalBeats = timeSinceFirst / beatDuration;
  const beat = Math.floor(totalBeats);
  const phase = totalBeats - beat;
  return { beat, phase };
}

/**
 * Formats time in seconds to mm:ss.f display
 */
export function formatTime(seconds: number, includeSubseconds = false): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const mm = mins.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');

  if (includeSubseconds) {
    const tenths = Math.floor((seconds % 1) * 10);
    return `${mm}:${ss}.${tenths}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Calculates playback rate from pitch percentage offset (-8 to +8, etc.)
 */
export function pitchToPlaybackRate(pitchPercent: number): number {
  return Math.max(0.2, Math.min(2.0, 1 + pitchPercent / 100));
}
