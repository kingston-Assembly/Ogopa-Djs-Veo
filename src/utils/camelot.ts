/**
 * Camelot Wheel & Musical Key Compatibility Logic
 * Used by Ogopa DJ's Harmonic Mixing Assistant
 */

export interface KeyInfo {
  name: string;        // e.g. "A minor", "C Major"
  camelot: string;     // e.g. "8A", "8B"
  pitchClass: number;  // 0-11 (0=C, 1=C#, 2=D, ..., 9=A, etc.)
  mode: 'major' | 'minor';
}

// Camelot mapping: 1A = Ab minor, 1B = B Major, ..., 8A = A minor, 8B = C Major
export const CAMELOT_MAP: Record<string, { camelot: string; mode: 'major' | 'minor'; pitchClass: number }> = {
  // Minor Keys (A)
  'G# minor': { camelot: '1A', mode: 'minor', pitchClass: 8 },
  'Ab minor': { camelot: '1A', mode: 'minor', pitchClass: 8 },
  'D# minor': { camelot: '2A', mode: 'minor', pitchClass: 3 },
  'Eb minor': { camelot: '2A', mode: 'minor', pitchClass: 3 },
  'A# minor': { camelot: '3A', mode: 'minor', pitchClass: 10 },
  'Bb minor': { camelot: '3A', mode: 'minor', pitchClass: 10 },
  'F minor':  { camelot: '4A', mode: 'minor', pitchClass: 5 },
  'C minor':  { camelot: '5A', mode: 'minor', pitchClass: 0 },
  'G minor':  { camelot: '6A', mode: 'minor', pitchClass: 7 },
  'D minor':  { camelot: '7A', mode: 'minor', pitchClass: 2 },
  'A minor':  { camelot: '8A', mode: 'minor', pitchClass: 9 },
  'E minor':  { camelot: '9A', mode: 'minor', pitchClass: 4 },
  'B minor':  { camelot: '10A', mode: 'minor', pitchClass: 11 },
  'F# minor': { camelot: '11A', mode: 'minor', pitchClass: 6 },
  'Gb minor': { camelot: '11A', mode: 'minor', pitchClass: 6 },
  'C# minor': { camelot: '12A', mode: 'minor', pitchClass: 1 },
  'Db minor': { camelot: '12A', mode: 'minor', pitchClass: 1 },

  // Major Keys (B)
  'B Major':  { camelot: '1B', mode: 'major', pitchClass: 11 },
  'F# Major': { camelot: '2B', mode: 'major', pitchClass: 6 },
  'Gb Major': { camelot: '2B', mode: 'major', pitchClass: 6 },
  'C# Major': { camelot: '3B', mode: 'major', pitchClass: 1 },
  'Db Major': { camelot: '3B', mode: 'major', pitchClass: 1 },
  'G# Major': { camelot: '4B', mode: 'major', pitchClass: 8 },
  'Ab Major': { camelot: '4B', mode: 'major', pitchClass: 8 },
  'D# Major': { camelot: '5B', mode: 'major', pitchClass: 3 },
  'Eb Major': { camelot: '5B', mode: 'major', pitchClass: 3 },
  'A# Major': { camelot: '6B', mode: 'major', pitchClass: 10 },
  'Bb Major': { camelot: '6B', mode: 'major', pitchClass: 10 },
  'F Major':  { camelot: '7B', mode: 'major', pitchClass: 5 },
  'C Major':  { camelot: '8B', mode: 'major', pitchClass: 0 },
  'G Major':  { camelot: '9B', mode: 'major', pitchClass: 7 },
  'D Major':  { camelot: '10B', mode: 'major', pitchClass: 2 },
  'A Major':  { camelot: '11B', mode: 'major', pitchClass: 9 },
  'E Major':  { camelot: '12B', mode: 'major', pitchClass: 4 },
};

/**
 * Normalizes key string and returns Camelot code
 */
export function getCamelotCode(keyName: string): string {
  const clean = keyName.trim();
  if (CAMELOT_MAP[clean]) {
    return CAMELOT_MAP[clean].camelot;
  }
  // Try case insensitive match
  for (const [k, v] of Object.entries(CAMELOT_MAP)) {
    if (k.toLowerCase() === clean.toLowerCase()) {
      return v.camelot;
    }
  }
  return '8A'; // Fallback
}

export type HarmonicMatchLevel = 'perfect' | 'adjacent' | 'relative' | 'energy-boost' | 'incompatible';

export interface HarmonicCompatibility {
  level: HarmonicMatchLevel;
  score: number; // 0 - 100
  description: string;
}

/**
 * Checks harmonic mixing compatibility between two Camelot codes
 */
export function getHarmonicCompatibility(camelotA: string, camelotB: string): HarmonicCompatibility {
  if (!camelotA || !camelotB) {
    return { level: 'incompatible', score: 0, description: 'Unknown Key' };
  }

  const parse = (code: string) => {
    const num = parseInt(code.slice(0, -1), 10);
    const letter = code.slice(-1).toUpperCase();
    return { num, letter };
  };

  const a = parse(camelotA);
  const b = parse(camelotB);

  // Exact same key
  if (a.num === b.num && a.letter === b.letter) {
    return { level: 'perfect', score: 100, description: 'Same Key (Seamless Blend)' };
  }

  // Relative Major / Minor (same number, different letter)
  if (a.num === b.num && a.letter !== b.letter) {
    return { level: 'relative', score: 90, description: 'Relative Major/Minor (Harmonic Shift)' };
  }

  // Adjacent hour on wheel (+1 or -1 hour, same letter)
  const diff = Math.abs(a.num - b.num);
  const isAdjacent = diff === 1 || diff === 11;

  if (isAdjacent && a.letter === b.letter) {
    return { level: 'adjacent', score: 85, description: 'Adjacent Key (Harmonic Transition)' };
  }

  // Energy boost (+2 or +7 hours)
  const forwardStep = (b.num - a.num + 12) % 12;
  if (forwardStep === 2 && a.letter === b.letter) {
    return { level: 'energy-boost', score: 75, description: 'Energy Boost (+2 Camelot)' };
  }

  if (forwardStep === 7 && a.letter === b.letter) {
    return { level: 'energy-boost', score: 70, description: 'Dominant Fifth (+7 Camelot)' };
  }

  return { level: 'incompatible', score: 30, description: 'Clashing Key (Use Drop Mix or EQ Kill)' };
}
