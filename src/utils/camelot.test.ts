import test from 'node:test';
import assert from 'node:assert/strict';
import { getCamelotCode, getHarmonicCompatibility } from './camelot.js';

test('getCamelotCode resolves major and minor keys accurately', () => {
  assert.equal(getCamelotCode('A minor'), '8A');
  assert.equal(getCamelotCode('C Major'), '8B');
  assert.equal(getCamelotCode('D minor'), '7A');
  assert.equal(getCamelotCode('G Major'), '9B');
  assert.equal(getCamelotCode('e minor'), '9A');
});

test('getHarmonicCompatibility identifies exact matches and relative keys', () => {
  // Same key
  const matchA = getHarmonicCompatibility('8A', '8A');
  assert.equal(matchA.level, 'perfect');
  assert.equal(matchA.score, 100);

  // Relative major (8A A minor <-> 8B C Major)
  const relativeMatch = getHarmonicCompatibility('8A', '8B');
  assert.equal(relativeMatch.level, 'relative');
  assert.equal(relativeMatch.score, 90);

  // Adjacent keys (8A <-> 9A, 8A <-> 7A)
  const adjacentUp = getHarmonicCompatibility('8A', '9A');
  assert.equal(adjacentUp.level, 'adjacent');

  const adjacentDown = getHarmonicCompatibility('8A', '7A');
  assert.equal(adjacentDown.level, 'adjacent');

  // Wrap around clock (12A <-> 1A)
  const wrapMatch = getHarmonicCompatibility('12A', '1A');
  assert.equal(wrapMatch.level, 'adjacent');

  // Energy boost (+2)
  const energy = getHarmonicCompatibility('8A', '10A');
  assert.equal(energy.level, 'energy-boost');

  // Incompatible (e.g. 8A to 2A)
  const clash = getHarmonicCompatibility('8A', '2A');
  assert.equal(clash.level, 'incompatible');
});
