import test from 'node:test';
import assert from 'node:assert/strict';
import { filterAndSortTracks, DJTrack } from './crateLogic.js';

const mockTracks: DJTrack[] = [
  { id: '1', title: 'Nairobi Nightfall', artist: 'Ogopa All-Stars', duration: 180, bpm: 124, key: 'A minor', camelot: '8A', genre: 'Amapiano', isFavorite: true, rating: 5 },
  { id: '2', title: 'Kilimani Sunset', artist: 'DJ Shiti', duration: 200, bpm: 126, key: 'G Major', camelot: '9B', genre: 'House', isFavorite: false, rating: 4 },
  { id: '3', title: 'Gengetone Heat', artist: 'Ethic Vibes', duration: 150, bpm: 105, key: 'G minor', camelot: '6A', genre: 'Gengetone', isFavorite: true, rating: 5 },
  { id: '4', title: 'Electric Serengeti', artist: 'Mombasa Beats', duration: 210, bpm: 128, key: 'C Major', camelot: '8B', genre: 'Tech', isFavorite: false, rating: 3 },
];

test('filterAndSortTracks filters by search query across fields', () => {
  const result = filterAndSortTracks(mockTracks, { searchQuery: 'amapiano' });
  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'Nairobi Nightfall');

  const artistResult = filterAndSortTracks(mockTracks, { searchQuery: 'ethic' });
  assert.equal(artistResult.length, 1);
  assert.equal(artistResult[0].title, 'Gengetone Heat');
});

test('filterAndSortTracks filters favorites', () => {
  const favorites = filterAndSortTracks(mockTracks, { crateId: 'favorites' });
  assert.equal(favorites.length, 2);
  assert.equal(favorites.every(t => t.isFavorite), true);
});

test('filterAndSortTracks filters by BPM range', () => {
  const highBpm = filterAndSortTracks(mockTracks, { minBpm: 125, maxBpm: 130 });
  assert.equal(highBpm.length, 2);
  assert.equal(highBpm[0].bpm >= 125, true);
  assert.equal(highBpm[1].bpm >= 125, true);
});

test('filterAndSortTracks sorts by harmonic match to active deck', () => {
  // If active deck is 8A (Nairobi Nightfall):
  // 8A (Nairobi Nightfall) has 100 score
  // 8B (Electric Serengeti) has 90 score (relative)
  // 9B has adjacent/compatibility
  // 6A is further
  const sorted = filterAndSortTracks(mockTracks, {
    activeDeckCamelot: '8A',
    sortBy: 'harmonic',
    sortOrder: 'asc', // high score first
  });
  assert.equal(sorted[0].camelot, '8A');
  assert.equal(sorted[1].camelot, '8B');
});
