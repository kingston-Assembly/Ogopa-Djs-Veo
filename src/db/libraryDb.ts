/**
 * IndexedDB Persistent Storage for Ogopa DJ's Tracks, Audio Blobs & Playlists
 * Uses idb wrapper for offline-first persistent storage.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { DJTrack } from '../utils/crateLogic.js';
import { synthesizeDemoTrack } from '../audio/demoTracks.js';

interface OgopaDBSchema extends DBSchema {
  tracks: {
    key: string;
    value: DJTrack;
    indexes: {
      'by-bpm': number;
      'by-camelot': string;
      'by-genre': string;
    };
  };
  audioBlobs: {
    key: string;
    value: Blob;
  };
  videoBlobs: {
    key: string;
    value: Blob;
  };
  crates: {
    key: string;
    value: {
      id: string;
      name: string;
      icon?: string;
    };
  };
}

const DB_NAME = 'ogopa-djs-db';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<OgopaDBSchema>> | null = null;

// In-memory audio buffer cache for zero-delay deck loading
export const audioBufferCache = new Map<string, AudioBuffer>();
// In-memory video URL cache
export const videoUrlCache = new Map<string, string>();

export async function getDb(): Promise<IDBPDatabase<OgopaDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<OgopaDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('tracks')) {
          const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
          trackStore.createIndex('by-bpm', 'bpm');
          trackStore.createIndex('by-camelot', 'camelot');
          trackStore.createIndex('by-genre', 'genre');
        }
        if (!db.objectStoreNames.contains('audioBlobs')) {
          db.createObjectStore('audioBlobs');
        }
        if (!db.objectStoreNames.contains('videoBlobs')) {
          db.createObjectStore('videoBlobs');
        }
        if (!db.objectStoreNames.contains('crates')) {
          db.createObjectStore('crates', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Requests browser persistent storage to prevent eviction
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    return isPersisted;
  }
  return false;
}

/**
 * Saves a video file into OPFS (Origin Private File System) if supported,
 * falling back to IndexedDB.
 */
export async function saveVideoFile(trackId: string, blob: Blob): Promise<void> {
  // Try OPFS first
  try {
    if ('storage' in navigator && 'getDirectory' in navigator.storage) {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(`video_${trackId}.webm`, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    }
  } catch (err) {
    console.warn('OPFS write failed, falling back to IndexedDB', err);
  }

  // Fallback to IndexedDB
  const db = await getDb();
  await db.put('videoBlobs', blob, trackId);
}

/**
 * Retrieves a stored video blob from OPFS or IndexedDB
 */
export async function getVideoFile(trackId: string): Promise<Blob | undefined> {
  // Try OPFS first
  try {
    if ('storage' in navigator && 'getDirectory' in navigator.storage) {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(`video_${trackId}.webm`);
      const file = await fileHandle.getFile();
      return file;
    }
  } catch {
    // OPFS file not found, fall back to IndexedDB
  }

  const db = await getDb();
  return db.get('videoBlobs', trackId);
}

export async function saveTrackWithBlob(
  track: DJTrack,
  audioBlob?: Blob,
  videoBlob?: Blob
): Promise<void> {
  const db = await getDb();
  // Don't store huge raw blobs directly inside track metadata object
  const { audioBlob: _ab, videoBlob: _vb, ...metaOnly } = track;
  await db.put('tracks', metaOnly);

  if (audioBlob || track.audioBlob) {
    const targetAudio = audioBlob || track.audioBlob;
    if (targetAudio) {
      await db.put('audioBlobs', targetAudio, track.id);
    }
  }

  if (videoBlob || track.videoBlob) {
    const targetVideo = videoBlob || track.videoBlob;
    if (targetVideo) {
      await saveVideoFile(track.id, targetVideo);
    }
  }
}

export async function getTrackBlob(trackId: string): Promise<Blob | undefined> {
  const db = await getDb();
  return db.get('audioBlobs', trackId);
}

export async function getAllTracksFromDb(): Promise<DJTrack[]> {
  const db = await getDb();
  return db.getAll('tracks');
}

export async function deleteTrackFromDb(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('tracks', id);
  await db.delete('audioBlobs', id);
  await db.delete('videoBlobs', id);
  audioBufferCache.delete(id);
  const cachedUrl = videoUrlCache.get(id);
  if (cachedUrl) {
    URL.revokeObjectURL(cachedUrl);
    videoUrlCache.delete(id);
  }
}

/**
 * Generates a video thumbnail and extracts video duration
 */
export function extractVideoThumbnail(
  fileOrBlob: Blob
): Promise<{ thumbnailUrl: string; duration: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(fileOrBlob);
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    video.onloadeddata = () => {
      // Seek to ~1.0s or 20%
      const seekTime = Math.min(1.0, video.duration * 0.2);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, 320, 180);
          const thumb = canvas.toDataURL('image/jpeg', 0.8);
          URL.revokeObjectURL(url);
          resolve({ thumbnailUrl: thumb, duration: video.duration || 30 });
          return;
        }
      } catch {
        // ignore
      }
      URL.revokeObjectURL(url);
      resolve({ thumbnailUrl: '', duration: video.duration || 30 });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ thumbnailUrl: '', duration: 30 });
    };
  });
}

export async function toggleTrackFavoriteInDb(id: string, isFav: boolean): Promise<void> {
  const db = await getDb();
  const track = await db.get('tracks', id);
  if (track) {
    track.isFavorite = isFav;
    await db.put('tracks', track);
  }
}

/**
 * Resolves an AudioBuffer for any track (in-memory, demo, or decoded from IndexedDB blob)
 */
export async function resolveAudioBufferForTrack(
  track: DJTrack,
  ctx: AudioContext,
  providedBuffer?: AudioBuffer
): Promise<AudioBuffer | null> {
  // 1. Provided directly (e.g. freshly decoded during upload)
  if (providedBuffer) {
    audioBufferCache.set(track.id, providedBuffer);
    return providedBuffer;
  }

  // 2. In-memory cache
  if (audioBufferCache.has(track.id)) {
    return audioBufferCache.get(track.id)!;
  }

  // 3. Demo track synthesis
  if (track.isDemo) {
    const synthesized = synthesizeDemoTrack(ctx, track.id);
    audioBufferCache.set(track.id, synthesized.buffer);
    return synthesized.buffer;
  }

  // 4. In-memory blob on track
  if (track.audioBlob) {
    try {
      const arrayBuffer = await track.audioBlob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      audioBufferCache.set(track.id, decoded);
      return decoded;
    } catch {
      // fallback to indexedDB
    }
  }

  // 5. Retrieve stored Blob from IndexedDB
  try {
    const blob = await getTrackBlob(track.id);
    if (blob) {
      const arrayBuffer = await blob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      audioBufferCache.set(track.id, decoded);
      return decoded;
    }
  } catch (err) {
    console.error('Failed to resolve audio buffer from storage', err);
  }

  // 6. Check if it's a video file containing an audio track
  if (track.videoBlob) {
    try {
      const arrayBuffer = await track.videoBlob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      audioBufferCache.set(track.id, decoded);
      return decoded;
    } catch {
      // ignore
    }
  }

  try {
    const vBlob = await getVideoFile(track.id);
    if (vBlob) {
      const arrayBuffer = await vBlob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      audioBufferCache.set(track.id, decoded);
      return decoded;
    }
  } catch {
    // ignore
  }

  return null;
}
