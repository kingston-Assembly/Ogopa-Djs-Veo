import { getHarmonicCompatibility } from './camelot.js';

export interface DJTrack {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  bpm: number;
  key: string;      // e.g. "A minor"
  camelot: string;  // e.g. "8A"
  genre: string;
  crateId?: string;
  isFavorite?: boolean;
  rating?: number;  // 1 - 5
  waveformPeaks?: number[]; // normalized peaks 0-1
  audioUrl?: string; // object URL or data URL
  audioBlob?: Blob;
  isVideo?: boolean;
  videoUrl?: string;
  videoBlob?: Blob;
  thumbnailUrl?: string;
  videoWidth?: number;
  videoHeight?: number;
  isDemo?: boolean;
}

export interface TrackFilterOptions {
  searchQuery?: string;
  crateId?: string;
  minBpm?: number;
  maxBpm?: number;
  activeDeckCamelot?: string; // if provided, can sort or score by harmonic match
  sortBy?: 'title' | 'artist' | 'bpm' | 'key' | 'harmonic' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export function filterAndSortTracks(tracks: DJTrack[], options: TrackFilterOptions): DJTrack[] {
  let filtered = [...tracks];

  // 1. Search filter
  if (options.searchQuery && options.searchQuery.trim() !== '') {
    const q = options.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q) ||
        t.key.toLowerCase().includes(q) ||
        t.camelot.toLowerCase().includes(q)
    );
  }

  // 2. Crate filter
  if (options.crateId && options.crateId !== 'all') {
    const targetCrate = options.crateId;
    if (targetCrate === 'favorites') {
      filtered = filtered.filter((t) => !!t.isFavorite);
    } else {
      filtered = filtered.filter((t) => t.crateId === targetCrate || t.genre.toLowerCase() === targetCrate.toLowerCase());
    }
  }

  // 3. BPM Range filter
  if (options.minBpm !== undefined && options.minBpm > 0) {
    filtered = filtered.filter((t) => t.bpm >= options.minBpm!);
  }
  if (options.maxBpm !== undefined && options.maxBpm > 0) {
    filtered = filtered.filter((t) => t.bpm <= options.maxBpm!);
  }

  // 4. Sorting
  const sortBy = options.sortBy || 'title';
  const sortOrder = options.sortOrder || 'asc';
  const mult = sortOrder === 'asc' ? 1 : -1;

  filtered.sort((a, b) => {
    if (sortBy === 'harmonic' && options.activeDeckCamelot) {
      const matchA = getHarmonicCompatibility(options.activeDeckCamelot, a.camelot);
      const matchB = getHarmonicCompatibility(options.activeDeckCamelot, b.camelot);
      return (matchB.score - matchA.score) * mult;
    }
    if (sortBy === 'bpm') {
      return (a.bpm - b.bpm) * mult;
    }
    if (sortBy === 'rating') {
      return ((b.rating || 0) - (a.rating || 0)) * mult;
    }
    if (sortBy === 'artist') {
      return a.artist.localeCompare(b.artist) * mult;
    }
    if (sortBy === 'key') {
      return a.camelot.localeCompare(b.camelot) * mult;
    }
    return a.title.localeCompare(b.title) * mult;
  });

  return filtered;
}
