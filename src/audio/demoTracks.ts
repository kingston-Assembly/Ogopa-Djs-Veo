/**
 * High-Quality Real Audio Demo Track Synthesizer for Ogopa DJ's
 * Generates energetic, multi-layered club tracks completely client-side in Web Audio.
 */

import { DJTrack } from '../utils/crateLogic.js';

export interface DemoTrackDefinition {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  camelot: string;
  genre: string;
  duration: number; // seconds
  isVideo?: boolean;
}

export const DEMO_TRACK_METADATA: DemoTrackDefinition[] = [
  {
    id: 'demo-1',
    title: 'Nairobi Nightfall (VJ Video Mix)',
    artist: 'Ogopa All-Stars',
    bpm: 124,
    key: 'A minor',
    camelot: '8A',
    genre: 'Amapiano',
    duration: 38.7, // ~20 bars loopable
    isVideo: true,
  },
  {
    id: 'demo-2',
    title: 'Kilimani Sunset (VJ Video Mix)',
    artist: 'DJ Shiti & The Groove',
    bpm: 126,
    key: 'G Major',
    camelot: '9B',
    genre: 'Afro-House',
    duration: 38.1,
    isVideo: true,
  },
  {
    id: 'demo-3',
    title: 'Gengetone Heat',
    artist: 'Ethic Sound System',
    bpm: 105,
    key: 'G minor',
    camelot: '6A',
    genre: 'Gengetone',
    duration: 36.5,
  },
  {
    id: 'demo-4',
    title: 'Electric Serengeti',
    artist: 'Mombasa Tech Syndicate',
    bpm: 128,
    key: 'C Major',
    camelot: '8B',
    genre: 'Peak-Time Tech',
    duration: 37.5,
  },
];

/**
 * Synthesizes an AudioBuffer for a given demo track
 */
export function synthesizeDemoTrack(
  ctx: AudioContext,
  trackId: string
): { buffer: AudioBuffer; track: DJTrack } {
  const meta = DEMO_TRACK_METADATA.find((t) => t.id === trackId) || DEMO_TRACK_METADATA[0];
  const sampleRate = ctx.sampleRate;
  const numChannels = 2;
  const duration = meta.duration;
  const numSamples = Math.floor(sampleRate * duration);

  const buffer = ctx.createBuffer(numChannels, numSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const bpm = meta.bpm;
  const beatSec = 60 / bpm;
  const stepSec = beatSec / 4; // 16th notes
  const totalSteps = Math.floor(duration / stepSec);

  // Musical note frequencies (A minor / C major pentatonic, etc.)
  const notesAminor = [110, 130.81, 146.83, 164.81, 196.0, 220, 261.63, 293.66, 329.63, 392.0];
  const notesGmajor = [98, 123.47, 146.83, 164.81, 196.0, 246.94, 293.66, 329.63, 392.0, 493.88];
  const notesGminor = [98, 116.54, 130.81, 146.83, 174.61, 196.0, 233.08, 261.63, 293.66, 349.23];
  const notesCmajor = [130.81, 146.83, 164.81, 174.61, 196.0, 220, 246.94, 261.63, 329.63, 392.0];

  const scale =
    meta.id === 'demo-1'
      ? notesAminor
      : meta.id === 'demo-2'
      ? notesGmajor
      : meta.id === 'demo-3'
      ? notesGminor
      : notesCmajor;

  // Sound generator helpers
  for (let s = 0; s < totalSteps; s++) {
    const stepTime = s * stepSec;
    const startSample = Math.floor(stepTime * sampleRate);
    const stepInBar = s % 16;
    const bar = Math.floor(s / 16);

    // 1. KICK DRUM: steps 0, 4, 8, 12 (or Gengetone rhythm on 0, 3, 6, 10, 12)
    const isGengetone = meta.id === 'demo-3';
    const isKick = isGengetone
      ? stepInBar === 0 || stepInBar === 6 || stepInBar === 10
      : stepInBar === 0 || stepInBar === 4 || stepInBar === 8 || stepInBar === 12;

    if (isKick) {
      const kickLen = Math.floor(sampleRate * 0.35);
      for (let i = 0; i < kickLen && startSample + i < numSamples; i++) {
        const t = i / sampleRate;
        const freq = 140 * Math.exp(-t * 28) + 42;
        const amp = Math.exp(-t * 14);
        const val = Math.sin(2 * Math.PI * freq * t) * amp * 0.65;
        left[startSample + i] += val;
        right[startSample + i] += val;
      }
    }

    // 2. SNARE / CLAP / RIMSHOT: steps 4, 12 (Gengetone syncopation on 4, 7, 12)
    const isSnare = isGengetone
      ? stepInBar === 4 || stepInBar === 7 || stepInBar === 12
      : stepInBar === 4 || stepInBar === 12;

    if (isSnare) {
      const snareLen = Math.floor(sampleRate * 0.22);
      for (let i = 0; i < snareLen && startSample + i < numSamples; i++) {
        const t = i / sampleRate;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 22);
        const body = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 30);
        const val = (noise * 0.6 + body * 0.4) * 0.45;
        left[startSample + i] += val * 0.95;
        right[startSample + i] += val * 1.05;
      }
    }

    // 3. HI-HATS & SHAKERS: every 16th or offbeats
    const isHiHat = s % 2 === 1 || s % 4 === 2;
    if (isHiHat) {
      const hatLen = Math.floor(sampleRate * 0.08);
      const isAccent = s % 4 === 2;
      const vol = isAccent ? 0.25 : 0.14;
      for (let i = 0; i < hatLen && startSample + i < numSamples; i++) {
        const t = i / sampleRate;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * (isAccent ? 45 : 75));
        left[startSample + i] += noise * vol * (isAccent ? 1.2 : 0.8);
        right[startSample + i] += noise * vol * (isAccent ? 0.8 : 1.2);
      }
    }

    // 4. BASSLINE: Rolling syncopated bass (Log Drum / Acid / Sub)
    const bassSteps = [0, 2, 3, 6, 8, 10, 11, 14];
    if (bassSteps.includes(stepInBar)) {
      const bassLen = Math.floor(sampleRate * 0.28);
      const noteIdx = (bar * 2 + Math.floor(stepInBar / 4)) % 4;
      const freq = scale[noteIdx % scale.length];
      for (let i = 0; i < bassLen && startSample + i < numSamples; i++) {
        const t = i / sampleRate;
        // Warm saturated log drum / reese bass
        const fundamental = Math.sin(2 * Math.PI * freq * t);
        const harmonic = Math.sin(2 * Math.PI * (freq * 2) * t) * 0.4;
        const sub = Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.5;
        const env = Math.exp(-t * 8);
        const val = (fundamental + harmonic + sub) * env * 0.48;
        left[startSample + i] += val;
        right[startSample + i] += val;
      }
    }

    // 5. SYNTH CHORDS / PLUCKS (Melody)
    if (stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) {
      const chordLen = Math.floor(sampleRate * 0.45);
      const root = scale[(bar + 2) % scale.length];
      const third = scale[(bar + 4) % scale.length];
      const fifth = scale[(bar + 6) % scale.length];

      for (let i = 0; i < chordLen && startSample + i < numSamples; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 6.5);
        const osc1 = Math.sin(2 * Math.PI * root * t);
        const osc2 = Math.sin(2 * Math.PI * third * t);
        const osc3 = Math.sin(2 * Math.PI * fifth * t);
        const val = ((osc1 + osc2 + osc3) / 3) * env * 0.35;
        // Stereo panning
        left[startSample + i] += val * 1.15;
        right[startSample + i] += val * 0.85;
      }
    }

    // 6. VOCAL CHOP / SHOUT HOOKS (Every 8 bars or syncopated)
    if (bar % 4 === 3 && (stepInBar === 0 || stepInBar === 4 || stepInBar === 8)) {
      const chopLen = Math.floor(sampleRate * 0.25);
      const formantFreq = 650 + (stepInBar * 80);
      for (let i = 0; i < chopLen && startSample + i < numSamples; i++) {
        const t = i / sampleRate;
        const carrier = Math.sin(2 * Math.PI * 220 * t) + 0.3 * Math.sin(2 * Math.PI * 440 * t);
        const formant = Math.sin(2 * Math.PI * formantFreq * t);
        const env = Math.sin(Math.min(Math.PI, (t / 0.25) * Math.PI));
        const val = carrier * formant * env * 0.38;
        left[startSample + i] += val;
        right[startSample + i] += val;
      }
    }
  }

  // Soft master limiting to prevent clipping
  for (let i = 0; i < numSamples; i++) {
    left[i] = Math.tanh(left[i] * 0.95);
    right[i] = Math.tanh(right[i] * 0.95);
  }

  // Pre-generate peaks
  const numPeaks = 400;
  const blockSize = Math.floor(numSamples / numPeaks);
  const peaks: number[] = [];
  for (let b = 0; b < numPeaks; b++) {
    let max = 0;
    const start = b * blockSize;
    for (let i = 0; i < blockSize; i += 8) {
      const val = Math.abs(left[start + i]);
      if (val > max) max = val;
    }
    peaks.push(Math.min(1, max * 1.1));
  }

  const djTrack: DJTrack = {
    id: meta.id,
    title: meta.title,
    artist: meta.artist,
    duration: meta.duration,
    bpm: meta.bpm,
    key: meta.key,
    camelot: meta.camelot,
    genre: meta.genre,
    crateId: meta.isVideo ? 'video' : meta.genre.toLowerCase(),
    waveformPeaks: peaks,
    isDemo: true,
    isVideo: meta.isVideo,
    rating: 5,
    isFavorite: meta.id === 'demo-1' || meta.id === 'demo-3',
  };

  return { buffer, track: djTrack };
}
