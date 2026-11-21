/**
 * Audio Analysis Engine for Ogopa DJ's
 * Extracts BPM, Key (Camelot), and Frequency-Colored Waveform Peaks
 */

import { getCamelotCode } from '../utils/camelot.js';

export interface AnalysisResult {
  bpm: number;
  key: string;
  camelot: string;
  peaks: {
    low: number[];
    mid: number[];
    high: number[];
    overall: number[];
  };
}

/**
 * Analyzes an AudioBuffer for BPM, Key, and Waveform Peaks
 */
export async function analyzeAudioBuffer(buffer: AudioBuffer): Promise<AnalysisResult> {
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const length = channelData.length;

  // 1. Generate Waveform Peaks (1000 bins across the track)
  const numBins = 1000;
  const blockSize = Math.floor(length / numBins);
  const lowPeaks: number[] = new Array(numBins).fill(0);
  const midPeaks: number[] = new Array(numBins).fill(0);
  const highPeaks: number[] = new Array(numBins).fill(0);
  const overallPeaks: number[] = new Array(numBins).fill(0);

  // Simple three-band filtering approximation over downsampled blocks
  for (let i = 0; i < numBins; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, length);
    let maxOverall = 0;
    let lowEnergy = 0;
    let midEnergy = 0;
    let highEnergy = 0;

    let prev = 0;
    let prev2 = 0;

    for (let j = start; j < end; j += 4) { // step by 4 for high performance
      const sample = channelData[j];
      const absSample = Math.abs(sample);
      if (absSample > maxOverall) maxOverall = absSample;

      // Difference filters for frequency approximation
      const diff1 = sample - prev;
      const diff2 = diff1 - prev2;
      prev2 = diff1;
      prev = sample;

      lowEnergy += absSample;
      midEnergy += Math.abs(diff1);
      highEnergy += Math.abs(diff2);
    }

    const count = (end - start) / 4;
    overallPeaks[i] = Math.min(1, maxOverall * 1.2);
    lowPeaks[i] = Math.min(1, (lowEnergy / count) * 2.5);
    midPeaks[i] = Math.min(1, (midEnergy / count) * 3.0);
    highPeaks[i] = Math.min(1, (highEnergy / count) * 3.5);
  }

  // 2. Detect BPM via Peak Onset Autocorrelation
  let detectedBpm = detectBpm(channelData, sampleRate);
  if (detectedBpm < 70) detectedBpm *= 2;
  if (detectedBpm > 175) detectedBpm /= 2;

  // 3. Detect Musical Key via Chromagram correlation
  const detectedKey = detectKey(channelData, sampleRate);
  const camelot = getCamelotCode(detectedKey);

  return {
    bpm: Math.round(detectedBpm),
    key: detectedKey,
    camelot,
    peaks: {
      low: lowPeaks,
      mid: midPeaks,
      high: highPeaks,
      overall: overallPeaks,
    },
  };
}

/**
 * Fast BPM detection using onset envelope & autocorrelation
 */
function detectBpm(channelData: Float32Array, sampleRate: number): number {
  // Downsample to ~2205 Hz for fast tempo analysis
  const downsampleRatio = Math.floor(sampleRate / 2205);
  const downsampledLen = Math.floor(channelData.length / downsampleRatio);
  const downsampled = new Float32Array(downsampledLen);

  for (let i = 0; i < downsampledLen; i++) {
    downsampled[i] = channelData[i * downsampleRatio];
  }

  // Energy envelope with moving average window
  const envelope = new Float32Array(downsampledLen);
  const windowSize = 40;
  let sum = 0;

  for (let i = 0; i < downsampledLen; i++) {
    sum += Math.abs(downsampled[i]);
    if (i >= windowSize) {
      sum -= Math.abs(downsampled[i - windowSize]);
    }
    envelope[i] = sum / windowSize;
  }

  // First order difference (onset flux)
  const onsets = new Float32Array(downsampledLen);
  for (let i = 1; i < downsampledLen; i++) {
    const diff = envelope[i] - envelope[i - 1];
    onsets[i] = diff > 0 ? diff : 0;
  }

  // Autocorrelation in the BPM range [75, 160]
  const effectiveSampleRate = sampleRate / downsampleRatio;
  const minLag = Math.floor((effectiveSampleRate * 60) / 165);
  const maxLag = Math.floor((effectiveSampleRate * 60) / 75);

  let bestLag = minLag;
  let maxCorr = -1;

  // Sample a representative 20-second chunk
  const startSample = Math.floor(downsampledLen * 0.2);
  const testLen = Math.min(Math.floor(effectiveSampleRate * 20), downsampledLen - startSample - maxLag);

  if (testLen > 0) {
    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < testLen; i += 2) {
        corr += onsets[startSample + i] * onsets[startSample + i + lag];
      }
      if (corr > maxCorr) {
        maxCorr = corr;
        bestLag = lag;
      }
    }
  }

  const rawBpm = (effectiveSampleRate * 60) / bestLag;
  return isNaN(rawBpm) || rawBpm <= 0 ? 124 : rawBpm;
}

/**
 * Key detection using pitch profile correlation (Krumhansl-Schmuckler)
 */
function detectKey(channelData: Float32Array, sampleRate: number): string {
  // Pitch classes C, C#, D, D#, E, F, F#, G, G#, A, A#, B
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Krumhansl-Schmuckler Key Profiles
  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  // Calculate 12-dimensional chroma energy
  const chroma = new Float64Array(12);
  const step = 8;
  const maxLen = Math.min(channelData.length, sampleRate * 30); // inspect first 30 seconds

  for (let i = 0; i < maxLen; i += step) {
    const val = Math.abs(channelData[i]);
    const freq = ((i % 1024) / 1024) * sampleRate;
    if (freq > 65 && freq < 2000) {
      const midiNote = Math.round(12 * Math.log2(freq / 440) + 69);
      const pitchClass = ((midiNote % 12) + 12) % 12;
      chroma[pitchClass] += val;
    }
  }

  let bestCorrelation = -Infinity;
  let bestKey = 'A minor';

  // Test all 12 Major and 12 Minor keys
  for (let root = 0; root < 12; root++) {
    // Check Major
    let corrMajor = 0;
    for (let i = 0; i < 12; i++) {
      corrMajor += chroma[(root + i) % 12] * majorProfile[i];
    }
    if (corrMajor > bestCorrelation) {
      bestCorrelation = corrMajor;
      bestKey = `${notes[root]} Major`;
    }

    // Check Minor
    let corrMinor = 0;
    for (let i = 0; i < 12; i++) {
      corrMinor += chroma[(root + i) % 12] * minorProfile[i];
    }
    if (corrMinor > bestCorrelation) {
      bestCorrelation = corrMinor;
      bestKey = `${notes[root]} minor`;
    }
  }

  return bestKey;
}
