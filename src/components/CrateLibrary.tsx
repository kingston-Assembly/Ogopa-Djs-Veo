import React, { useState, useRef } from 'react';
import { Search, Upload, Music, Check, HardDrive, Trash2, Disc3, Loader2, Video, Film } from 'lucide-react';
import { DJTrack, filterAndSortTracks } from '../utils/crateLogic.js';
import { getHarmonicCompatibility } from '../utils/camelot.js';
import { formatTime } from '../utils/audioMath.js';
import { analyzeAudioBuffer } from '../audio/analyzer.js';
import {
  saveTrackWithBlob,
  deleteTrackFromDb,
  requestPersistentStorage,
  audioBufferCache,
  extractVideoThumbnail,
} from '../db/libraryDb.js';

interface CrateLibraryProps {
  tracks: DJTrack[];
  onLoadTrack: (deckId: 'A' | 'B', track: DJTrack, buffer?: AudioBuffer) => Promise<void> | void;
  activeDeckCamelot?: string;
  onTrackImported: (track: DJTrack, buffer: AudioBuffer) => void;
  onTrackDeleted?: (trackId: string) => void;
  targetDeck?: 'A' | 'B' | null;
  onClearTargetDeck?: () => void;
}

export const CrateLibrary: React.FC<CrateLibraryProps> = ({
  tracks,
  onLoadTrack,
  activeDeckCamelot = '8A',
  onTrackImported,
  onTrackDeleted,
  targetDeck = null,
  onClearTargetDeck,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrate, setSelectedCrate] = useState('all');
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'bpm' | 'harmonic' | 'key'>('harmonic');
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [loadingAction, setLoadingAction] = useState<{ trackId: string; deckId: 'A' | 'B' } | null>(null);
  const [storageStatus, setStorageStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const crates = [
    { id: 'all', name: 'All Crates' },
    { id: 'video', name: 'Music Videos (VJ)' },
    { id: 'imported', name: 'Imported' },
    { id: 'amapiano', name: 'Amapiano' },
    { id: 'afro-house', name: 'Afro-House' },
    { id: 'gengetone', name: 'Gengetone' },
    { id: 'tech', name: 'Peak-Time Tech' },
    { id: 'favorites', name: 'Favorites' },
  ];

  const filteredTracks = filterAndSortTracks(
    selectedCrate === 'video'
      ? tracks.filter((t) => !!t.isVideo)
      : tracks,
    {
      searchQuery,
      crateId: selectedCrate === 'video' ? 'all' : selectedCrate,
      activeDeckCamelot,
      sortBy,
      sortOrder: 'asc',
    }
  );

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);

  // Handle local audio & video file import & analysis
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    setStorageStatus(`Processing ${files.length} media file(s)...`);

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideoFile = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(file.name);

        let thumbnailUrl = '';
        let duration = 30;

        if (isVideoFile) {
          const thumbData = await extractVideoThumbnail(file);
          thumbnailUrl = thumbData.thumbnailUrl;
          duration = thumbData.duration;
        }

        let audioBuffer: AudioBuffer;
        try {
          const arrayBuffer = await file.arrayBuffer();
          audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          duration = audioBuffer.duration;
        } catch {
          // If silent video or audio decode fails, synthesize a basic sync track buffer
          const rate = ctx.sampleRate;
          audioBuffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
        }

        // Perform fast Web Audio BPM and Key analysis
        const analysis = await analyzeAudioBuffer(audioBuffer);

        const newTrack: DJTrack = {
          id: `imported-${Date.now()}-${i}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: isVideoFile ? 'Video VJ Clip' : 'Local Import',
          duration: audioBuffer.duration,
          bpm: analysis.bpm || 124,
          key: analysis.key,
          camelot: analysis.camelot,
          genre: isVideoFile ? 'Music Video' : 'Imported',
          crateId: isVideoFile ? 'video' : 'imported',
          waveformPeaks: analysis.peaks.overall,
          audioBlob: file,
          isVideo: isVideoFile,
          videoBlob: isVideoFile ? file : undefined,
          thumbnailUrl,
          rating: 5,
          isFavorite: false,
          isDemo: false,
        };

        // Cache decoded buffer in memory immediately
        audioBufferCache.set(newTrack.id, audioBuffer);

        // Save metadata & audio/video blob to storage
        await saveTrackWithBlob(newTrack, file, isVideoFile ? file : undefined);

        // Notify parent
        onTrackImported(newTrack, audioBuffer);
        setSelectedTrackId(newTrack.id);
      }

      setStorageStatus(`Successfully imported & analyzed ${files.length} track(s)!`);
      setTimeout(() => setStorageStatus(null), 3500);
    } catch (err) {
      console.error('Import error:', err);
      setStorageStatus('Failed to decode one or more files.');
      setTimeout(() => setStorageStatus(null), 3500);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePersistClick = async () => {
    const persisted = await requestPersistentStorage();
    setStorageStatus(persisted ? 'Persistent storage granted!' : 'Storage persistent');
    setTimeout(() => setStorageStatus(null), 3000);
  };

  const handleDeckLoadClick = async (deckId: 'A' | 'B', track: DJTrack, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLoadingAction({ trackId: track.id, deckId });
    try {
      const cached = audioBufferCache.get(track.id);
      await onLoadTrack(deckId, track, cached);
      setStorageStatus(`Loaded "${track.title}" into Deck ${deckId}!`);
      setTimeout(() => setStorageStatus(null), 2500);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteTrack = async (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteTrackFromDb(trackId);
    if (onTrackDeleted) {
      onTrackDeleted(trackId);
    }
    if (selectedTrackId === trackId) {
      setSelectedTrackId(null);
    }
    setStorageStatus('Track removed from library.');
    setTimeout(() => setStorageStatus(null), 2500);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0d16] rounded-2xl border border-slate-800 p-3 sm:p-4 shadow-xl">
      {/* Target Deck Banner (when user clicked Load on Deck A or B) */}
      {targetDeck && (
        <div className="mb-3 p-2.5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-black ${
                targetDeck === 'A' ? 'bg-cyan-500 text-slate-950' : 'bg-rose-500 text-white'
              }`}
            >
              Deck {targetDeck}
            </span>
            <span className="text-xs text-slate-200 font-semibold">
              Select any track below to load directly into Deck {targetDeck}
            </span>
          </div>
          {onClearTargetDeck && (
            <button
              onClick={onClearTargetDeck}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Top Bar: Search, Sort, Import & Storage */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, artist, BPM, or key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search track crate"
              className="w-full bg-[#121626] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Sort & Storage Actions */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Sort crate tracks"
            className="bg-[#121626] border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
          >
            <option value="harmonic">Sort: Harmonic Match</option>
            <option value="bpm">Sort: BPM</option>
            <option value="title">Sort: Title</option>
            <option value="artist">Sort: Artist</option>
            <option value="key">Sort: Key (Camelot)</option>
          </select>

          <button
            onClick={handlePersistClick}
            title="Request Persistent Offline Storage"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
          >
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Offline Cache</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*,.mp4,.webm,.mov"
            multiple
            onChange={handleFileChange}
            className="hidden"
            id="audio-file-upload-crate"
          />
          <label
            htmlFor="audio-file-upload-crate"
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer select-none ${
              isImporting
                ? 'bg-cyan-900 text-cyan-300 animate-pulse'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md active:scale-95'
            }`}
          >
            {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>{isImporting ? 'Analyzing...' : 'Import Audio & Video'}</span>
          </label>
        </div>
      </div>

      {/* Storage Notification Toast */}
      {storageStatus && (
        <div className="my-2 p-2 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-cyan-400" />
          <span>{storageStatus}</span>
        </div>
      )}

      {/* Crate Filter Buttons */}
      <div className="flex items-center gap-1.5 py-2 overflow-x-auto scrollbar-none">
        {crates.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCrate(c.id)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              selectedCrate === c.id
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Selected Track Action Bar (if a track is selected) */}
      {selectedTrack && (
        <div className="mb-2 p-2.5 rounded-xl bg-[#141828] border border-cyan-500/40 flex flex-wrap items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedTrack.thumbnailUrl ? (
              <img
                src={selectedTrack.thumbnailUrl}
                alt="thumb"
                className="w-12 h-8 rounded object-cover border border-slate-700 shrink-0"
              />
            ) : (
              <Disc3 className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <div className="min-w-0">
              <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                <span>Selected: {selectedTrack.title}</span>
                {selectedTrack.isVideo && (
                  <span className="px-1.5 py-0.2 rounded bg-purple-950 border border-purple-700 text-purple-300 text-[9px] font-bold">
                    VIDEO
                  </span>
                )}
              </span>
              <span className="text-[11px] text-slate-400 truncate block">
                {selectedTrack.artist} · {selectedTrack.bpm} BPM · Key {selectedTrack.camelot} ({selectedTrack.key})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDeckLoadClick('A', selectedTrack)}
              disabled={loadingAction?.trackId === selectedTrack.id}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow transition active:scale-95 disabled:opacity-50"
            >
              {loadingAction?.trackId === selectedTrack.id && loadingAction?.deckId === 'A' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : null}
              <span>Load into Deck A</span>
            </button>

            <button
              onClick={() => handleDeckLoadClick('B', selectedTrack)}
              disabled={loadingAction?.trackId === selectedTrack.id}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-500 hover:bg-rose-400 text-white shadow transition active:scale-95 disabled:opacity-50"
            >
              {loadingAction?.trackId === selectedTrack.id && loadingAction?.deckId === 'B' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : null}
              <span>Load into Deck B</span>
            </button>

            {!selectedTrack.isDemo && (
              <button
                onClick={(e) => handleDeleteTrack(selectedTrack.id, e)}
                title="Remove imported song from library"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Track List Table */}
      <div className="flex-1 overflow-y-auto mt-1 space-y-1.5 max-h-[360px] pr-1">
        {filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <Music className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No tracks found matching your filter</p>
            <p className="text-xs text-slate-400 mt-1">Import your own audio/video files or select another crate</p>
          </div>
        ) : (
          filteredTracks.map((track) => {
            const harmonic = getHarmonicCompatibility(activeDeckCamelot, track.camelot);
            const isPerfect = harmonic.level === 'perfect';
            const isRelative = harmonic.level === 'relative';
            const isAdjacent = harmonic.level === 'adjacent';
            const isSelected = selectedTrackId === track.id;

            return (
              <div
                key={track.id}
                onClick={() => {
                  if (targetDeck) {
                    handleDeckLoadClick(targetDeck, track);
                  } else {
                    setSelectedTrackId(track.id);
                  }
                }}
                className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                  isSelected
                    ? 'bg-[#181d33] border-cyan-500/80 shadow-md ring-1 ring-cyan-500/50'
                    : 'bg-[#111422] hover:bg-[#15192c] border-slate-800'
                }`}
              >
                {/* Track Title & Artist */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {track.thumbnailUrl ? (
                    <img
                      src={track.thumbnailUrl}
                      alt="preview"
                      className="w-10 h-8 rounded object-cover border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      track.isVideo
                        ? 'bg-cyan-950/80 border border-cyan-700 text-cyan-300'
                        : track.isDemo
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-purple-950/80 border border-purple-800 text-purple-300'
                    }`}>
                      {track.isVideo ? <Video className="w-4 h-4 text-cyan-400" /> : track.isDemo ? <Music className="w-4 h-4" /> : 'MP3'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
                      {track.isVideo && (
                        <span className="px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 text-[9px] font-semibold uppercase tracking-wider shrink-0">
                          Video VJ
                        </span>
                      )}
                      {!track.isDemo && !track.isVideo && (
                        <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 text-[9px] font-semibold uppercase tracking-wider shrink-0">
                          Imported
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {track.artist} · <span className="text-slate-400">{track.genre}</span>
                    </p>
                  </div>
                </div>

                {/* Technical Metadata: BPM, Key & Harmonic Assist */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-mono-numbers font-bold text-white">{track.bpm}</span>
                    <span className="text-[10px] text-slate-400 ml-1">BPM</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono-numbers font-bold text-amber-400">
                      {track.camelot}
                    </span>
                    {activeDeckCamelot && (
                      <span
                        title={harmonic.description}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isPerfect
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : isRelative
                            ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                            : isAdjacent
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {harmonic.score}%
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-mono-numbers text-slate-400 hidden sm:inline">
                    {formatTime(track.duration)}
                  </span>
                </div>

                {/* Deck Loading Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => handleDeckLoadClick('A', track, e)}
                    disabled={loadingAction?.trackId === track.id}
                    aria-label={`Load ${track.title} to Deck A`}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 transition active:scale-95 disabled:opacity-50"
                  >
                    {loadingAction?.trackId === track.id && loadingAction?.deckId === 'A' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : null}
                    <span>Deck A</span>
                  </button>

                  <button
                    onClick={(e) => handleDeckLoadClick('B', track, e)}
                    disabled={loadingAction?.trackId === track.id}
                    aria-label={`Load ${track.title} to Deck B`}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 transition active:scale-95 disabled:opacity-50"
                  >
                    {loadingAction?.trackId === track.id && loadingAction?.deckId === 'B' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : null}
                    <span>Deck B</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
