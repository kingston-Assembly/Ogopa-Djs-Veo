import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAspectRect,
  calculateColorDistance,
  calculateChromaKeyAlpha,
  calculatePiPRect,
  crossfaderToBlendRatio,
} from './videoMath.js';

test('calculateAspectRect handles stretch mode correctly', () => {
  const rect = calculateAspectRect(1920, 1080, 800, 600, 'stretch');
  assert.deepEqual(rect, { x: 0, y: 0, width: 800, height: 600 });
});

test('calculateAspectRect letterboxes wide video in square canvas', () => {
  const rect = calculateAspectRect(1920, 1080, 1000, 1000, 'fit');
  // 16:9 in 1:1 has width 1000 and height 1000 / (16/9) = 562.5, centered vertically
  assert.equal(rect.x, 0);
  assert.equal(rect.width, 1000);
  assert.equal(Math.round(rect.height), 563);
  assert.equal(Math.round(rect.y), 219);
});

test('calculateAspectRect crops to fill when requested', () => {
  const rect = calculateAspectRect(1920, 1080, 1000, 1000, 'fill');
  // Fill 16:9 into 1:1 scales height to 1000 and width to 1000 * 16/9 = 1777.77, centered horizontally
  assert.equal(rect.y, 0);
  assert.equal(rect.height, 1000);
  assert.equal(Math.round(rect.width), 1778);
  assert.equal(Math.round(rect.x), -389);
});

test('calculateColorDistance correctly measures distance between identical colors', () => {
  const dist = calculateColorDistance(0, 255, 0, 0, 255, 0);
  assert.equal(dist, 0);
});

test('calculateColorDistance measures distance between contrasting colors', () => {
  const dist = calculateColorDistance(255, 0, 0, 0, 255, 0);
  assert.ok(dist > 0.5);
});

test('calculateChromaKeyAlpha isolates green screen pixels', () => {
  // Pure green should be keyed out (alpha = 0)
  const greenAlpha = calculateChromaKeyAlpha(0, 255, 0, 0, 255, 0, 0.2, 0.1);
  assert.equal(greenAlpha, 0);

  // Red pixel should be preserved (alpha = 1.0)
  const redAlpha = calculateChromaKeyAlpha(255, 0, 0, 0, 255, 0, 0.2, 0.1);
  assert.equal(redAlpha, 1.0);
});

test('calculatePiPRect places picture-in-picture in specified corners', () => {
  const dstW = 1000;
  const dstH = 600;
  const padding = 20;
  const scale = 0.3;

  const tr = calculatePiPRect(dstW, dstH, 'top-right', scale, padding);
  assert.ok(tr);
  assert.equal(tr.width, 300);
  assert.equal(tr.height, 180);
  assert.equal(tr.x, 1000 - 300 - 20); // 680
  assert.equal(tr.y, 20);

  const bl = calculatePiPRect(dstW, dstH, 'bottom-left', scale, padding);
  assert.ok(bl);
  assert.equal(bl.x, 20);
  assert.equal(bl.y, 600 - 180 - 20); // 400

  const off = calculatePiPRect(dstW, dstH, 'off');
  assert.equal(off, null);
});

test('crossfaderToBlendRatio maps -1 to 0 and +1 to 1', () => {
  assert.equal(crossfaderToBlendRatio(-1), 0);
  assert.equal(crossfaderToBlendRatio(0), 0.5);
  assert.equal(crossfaderToBlendRatio(1), 1.0);
  // Clamping
  assert.equal(crossfaderToBlendRatio(-1.5), 0);
  assert.equal(crossfaderToBlendRatio(2.0), 1.0);
});
