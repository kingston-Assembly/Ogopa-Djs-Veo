import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_PADS } from './sampler.js';

test('SAMPLE_PADS contains exactly 8 performance pads', () => {
  assert.equal(SAMPLE_PADS.length, 8);
});

test('SAMPLE_PADS has sequential IDs from 1 to 8', () => {
  const ids = SAMPLE_PADS.map((p) => p.id);
  assert.deepEqual(ids, [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('Each sample pad has valid UI metadata (name, color, category, defaultPitch)', () => {
  for (const pad of SAMPLE_PADS) {
    assert.ok(pad.name.length > 2, `Pad ${pad.id} name should be valid`);
    assert.ok(pad.color.startsWith('#'), `Pad ${pad.id} color should be a valid hex string`);
    assert.ok(pad.category.length > 0, `Pad ${pad.id} category should be present`);
    assert.ok(pad.defaultPitch > 0, `Pad ${pad.id} defaultPitch should be positive`);
  }
});
