import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCrossfaderGains,
  beatsToSeconds,
  calculateQuantizedEchoDelay,
  calculateBeatPhase,
  formatTime,
  pitchToPlaybackRate,
} from './audioMath.js';

test('calculateCrossfaderGains works for smooth equal-power curve', () => {
  // Center: x = 0 -> both channels ~0.707 (equal power)
  const center = calculateCrossfaderGains(0, 'smooth');
  assert.equal(Math.round(center.gainA * 100), 71);
  assert.equal(Math.round(center.gainB * 100), 71);

  // Full Left: x = -1 -> gainA = 1, gainB = 0
  const fullLeft = calculateCrossfaderGains(-1, 'smooth');
  assert.equal(fullLeft.gainA, 1);
  assert.equal(fullLeft.gainB, 0);

  // Full Right: x = 1 -> gainA = 0, gainB = 1
  const fullRight = calculateCrossfaderGains(1, 'smooth');
  assert.equal(fullRight.gainA, 0);
  assert.equal(fullRight.gainB, 1);
});

test('calculateCrossfaderGains works for scratch cut curve', () => {
  // Center has full volume on both
  const center = calculateCrossfaderGains(0, 'scratch');
  assert.equal(center.gainA, 1);
  assert.equal(center.gainB, 1);

  // Hard cut at far left
  const cutLeft = calculateCrossfaderGains(-1, 'scratch');
  assert.equal(cutLeft.gainA, 1);
  assert.equal(cutLeft.gainB, 0);
});

test('beatsToSeconds accurately converts musical timing', () => {
  // 120 BPM: 60/120 = 0.5s per beat. 4 beats = 2.0s
  assert.equal(beatsToSeconds(4, 120), 2.0);
  // 128 BPM: 4 beats = 4 * (60/128) = 1.875s
  assert.equal(beatsToSeconds(4, 128), 1.875);
  // 1 beat at 60 BPM = 1.0s
  assert.equal(beatsToSeconds(1, 60), 1.0);
});

test('calculateBeatPhase handles beatgrid phase calculation', () => {
  // At 120 BPM (0.5s per beat), at time 1.25s:
  // totalBeats = 1.25 / 0.5 = 2.5 beats
  // beat = 2, phase = 0.5
  const res = calculateBeatPhase(1.25, 120, 0);
  assert.equal(res.beat, 2);
  assert.equal(res.phase, 0.5);
});

test('formatTime produces clean timecodes', () => {
  assert.equal(formatTime(75), '01:15');
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(125.4, true), '02:05.4');
});

test('pitchToPlaybackRate scales rate accurately', () => {
  assert.equal(pitchToPlaybackRate(0), 1.0);
  assert.equal(pitchToPlaybackRate(8), 1.08);
  assert.equal(pitchToPlaybackRate(-8), 0.92);
});

test('calculateQuantizedEchoDelay calculates beat delays and respects boundaries', () => {
  // 120 BPM: 1 beat = 0.5s, 1/2 beat = 0.25s, 1/4 beat = 0.125s
  assert.equal(calculateQuantizedEchoDelay(0.5, 120), 0.25);
  assert.equal(calculateQuantizedEchoDelay(0.25, 120), 0.125);
  assert.equal(calculateQuantizedEchoDelay(1.0, 120), 0.5);

  // Clamps to min boundary of 0.05s
  assert.equal(calculateQuantizedEchoDelay(0.01, 200), 0.05);

  // Clamps to max boundary of 2.0s
  assert.equal(calculateQuantizedEchoDelay(8, 60), 2.0);
});
