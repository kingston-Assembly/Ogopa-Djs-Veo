import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Disc3, RefreshCw, Key, VolumeX, Trash2, FolderOpen, Upload, Video, Activity } from 'lucide-react';
import { DeckAudioChannel } from '../audio/audioEngine.js';
import { VideoEngine } from '../video/videoEngine.js';
import { Waveform } from './Waveform.js';
import { JogWheel } from './JogWheel.js';
import { formatTime } from '../utils/audioMath.js';

interface DeckProps {
  channel: DeckAudioChannel;
  colorScheme: 'cyan' | 'magenta';
  onSync: () => void;
  onOpenCrateToLoad: () => void;
  onDirectFileSelect?: (deckId: 'A' | 'B', file: File) => void;
  videoEngine?: VideoEngine;
}

export const Deck: React.FC<DeckProps> = ({
  channel,
  colorScheme,
  onSync,
  onOpenCrateToLoad,
  onDirectFileSelect,
  videoEngine = VideoEngine.getInstance(),
}) => {
  const [showTimeRemaining, setShowTimeRemaining] = useState(false);
  const [deleteCueMode, setDeleteCueMode] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [displayMode, setDisplayMode] = useState<'waveform' | 'video'>('waveform');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const deckCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const deck = channel.state;
  const videoChannel = channel.id === 'A' ? videoEngine.deckA : videoEngine.deckB;

  const isCyan = colorScheme === 'cyan';
  const badgeBorder = isCyan ? 'border-cyan-500/40 text-cyan-400' : 'border-rose-500/40 text-rose-400';
  const activeGlow = isCyan ? 'border-cyan-500 shadow-cyan-500/20' : 'border-rose-500 shadow-rose-500/20';

  const timeDisplay = showTimeRemaining
    ? `-${formatTime(Math.max(0, deck.duration - deck.currentTime), true)}`
    : formatTime(deck.currentTime, true);

  // Animation frame loop to render video preview when in video mode
  useEffect(() => {
    let animId: number;
    const renderMini = () => {
      if (deckCanvasRef.current && videoChannel.offscreenCanvas) {
        const ctx = deckCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            videoChannel.offscreenCanvas,
            0,
            0,
            deckCanvasRef.current.width,
            deckCanvasRef.current.height
          );
        }
      }
      animId = requestAnimationFrame(renderMini);
    };
    animId = requestAnimationFrame(renderMini);
    return () => cancelAnimationFrame(animId);
  }, [videoChannel]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && onDirectFileSelect) {
      onDirectFileSelect(channel.id, files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onDirectFileSelect) {
      onDirectFileSelect(channel.id, files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowLoadMenu(false);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col bg-[#0d101d] rounded-2xl border ${
        isDragOver ? (isCyan ? 'border-cyan-400 ring-2 ring-cyan-400 bg-cyan-950/20' : 'border-rose-400 ring-2 ring-rose-400 bg-rose-950/20') : badgeBorder
      } p-3 md:p-4 shadow-xl transition-all relative overflow-hidden`}
    >
      {/* Drag Over Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-4 text-center">
          <Upload className={`w-10 h-10 mb-2 ${isCyan ? 'text-cyan-400' : 'text-rose-400'} animate-bounce`} />
          <h4 className="text-base font-bold text-white">Drop to Load Deck {channel.id}</h4>
          <p className="text-xs text-slate-300 mt-1">Accepts Audio & Video files (MP4, WebM, WAV, MP3)</p>
        </div>
      )}

      {/* Hidden direct file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*,.mp4,.webm,.mov"
        onChange={handleFileInput}
        className="hidden"
        id={`deck-file-input-${channel.id}`}
      />

      {/* Deck Header & Track Info */}
      <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-800/80 relative">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`flex items-center justify-center w-7 h-7 rounded-lg font-black text-sm ${
            isCyan ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}>
            {channel.id}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate leading-tight flex items-center gap-1.5">
              <span>{deck.track ? deck.track.title : 'No Track Loaded'}</span>
              {deck.track?.isVideo && (
                <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-700/80 text-[9px] font-mono font-bold text-cyan-300">
                  VIDEO
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 truncate">
              {deck.track ? `${deck.track.artist} · ${deck.track.genre}` : 'Select track or drag audio/video here'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Key / Camelot Pill */}
          {deck.track && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 px-2 py-0.5 rounded-md text-xs font-mono-numbers">
              <span className="font-bold text-amber-400">{deck.track.camelot}</span>
              <span className="text-slate-400 text-[10px]">({deck.track.key})</span>
            </div>
          )}

          {/* Load Track Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowLoadMenu(!showLoadMenu)}
              aria-label={`Load track into Deck ${channel.id}`}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95"
            >
              <Disc3 className="w-3.5 h-3.5" />
              <span>Load</span>
            </button>

            {/* Load Menu Popover */}
            {showLoadMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-40 w-48 rounded-xl bg-[#121626] border border-slate-700 shadow-2xl p-1 flex flex-col gap-0.5 text-xs">
                <button
                  onClick={() => {
                    setShowLoadMenu(false);
                    onOpenCrateToLoad();
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-slate-800 text-left transition"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Browse Crate Library</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-slate-800 text-left transition"
                >
                  <Upload className="w-3.5 h-3.5 text-rose-400" />
                  <span>Load Audio/Video File...</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timecode & BPM Display Strip + View Toggle */}
      <div className="flex items-center justify-between py-1.5 px-1">
        <button
          onClick={() => setShowTimeRemaining(!showTimeRemaining)}
          title="Toggle Elapsed / Remaining Time"
          className="text-lg md:text-xl font-bold font-mono-numbers text-white hover:text-cyan-300 transition"
        >
          {timeDisplay}
        </button>

        {/* View Switcher: Waveform vs Video Monitor */}
        <div className="flex items-center gap-1 bg-[#090b14] p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setDisplayMode('waveform')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition ${
              displayMode === 'waveform'
                ? isCyan ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-2.5 h-2.5" />
            <span>Wave</span>
          </button>
          <button
            onClick={() => setDisplayMode('video')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition ${
              displayMode === 'video'
                ? isCyan ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-2.5 h-2.5" />
            <span>Video</span>
          </button>
        </div>

        <div className="flex items-center gap-3 font-mono-numbers">
          <div className="text-right">
            <span className="text-sm md:text-base font-bold text-white">{deck.currentBpm.toFixed(1)}</span>
            <span className="text-[11px] text-slate-400 ml-1">BPM</span>
          </div>
          <div className={`text-xs font-semibold ${deck.pitchPercent === 0 ? 'text-slate-400' : deck.pitchPercent > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {deck.pitchPercent >= 0 ? `+${deck.pitchPercent.toFixed(1)}%` : `${deck.pitchPercent.toFixed(1)}%`}
          </div>
        </div>
      </div>

      {/* Main Visual Display: Waveform OR Video Monitor */}
      {displayMode === 'waveform' ? (
        <Waveform
          deck={deck}
          colorScheme={colorScheme}
          onSeek={(time) => channel.jumpToTime(time)}
        />
      ) : (
        <div className="relative aspect-[16/7] w-full bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
          <canvas ref={deckCanvasRef} width={640} height={280} className="w-full h-full object-cover" />
          <div className="absolute top-1.5 left-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[9px] font-mono font-bold text-white flex items-center gap-1.5 border border-slate-700/60">
            <span className={`w-2 h-2 rounded-full ${isCyan ? 'bg-cyan-400' : 'bg-rose-400'} animate-pulse`} />
            <span>
              {videoChannel.mode === 'video'
                ? 'VIDEO FILE FEED'
                : `BEAT VISUALIZER: ${videoChannel.visualizerPreset.toUpperCase()}`}
            </span>
          </div>
        </div>
      )}

      {/* Center Console: Jog Wheel + Pitch Slider */}
      <div className="grid grid-cols-12 gap-2 my-1.5 items-center">
        {/* Jog Wheel Platter (Cols 8) */}
        <div className="col-span-8 flex justify-center">
          <JogWheel deckChannel={channel} colorScheme={colorScheme} size={130} />
        </div>

        {/* Pitch Slider Controls (Cols 4) */}
        <div className="col-span-4 flex flex-col items-center bg-[#0a0d16] p-1.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between w-full mb-0.5">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tempo</span>
            <button
              onClick={() => channel.setPitch(0)}
              title="Reset Pitch to 0%"
              className="text-[9px] text-slate-400 hover:text-white px-1 rounded bg-slate-800"
            >
              0%
            </button>
          </div>

          {/* Vertical Pitch Fader */}
          <div className="h-20 w-full flex items-center justify-center my-0.5">
            <input
              type="range"
              min={-deck.pitchRange}
              max={deck.pitchRange}
              step={0.1}
              value={deck.pitchPercent}
              onChange={(e) => channel.setPitch(parseFloat(e.target.value))}
              aria-label={`Deck ${channel.id} Pitch Slider`}
              className="pitch-fader"
            />
          </div>

          {/* Key Lock & Range Selector */}
          <div className="flex items-center justify-between w-full mt-0.5">
            <button
              onClick={() => {
                deck.keyLock = !deck.keyLock;
              }}
              title="Master Tempo / Key Lock"
              className={`p-0.5 px-1 rounded text-[9px] font-bold flex items-center gap-0.5 ${
                deck.keyLock ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Key className="w-2.5 h-2.5" />
              <span>MT</span>
            </button>

            <select
              value={deck.pitchRange}
              onChange={(e) => {
                deck.pitchRange = parseInt(e.target.value, 10) as 8 | 16 | 50;
              }}
              aria-label="Pitch Range"
              className="bg-slate-800 text-slate-300 text-[9px] rounded px-1 py-0.5 border border-slate-700"
            >
              <option value={8}>±8%</option>
              <option value={16}>±16%</option>
              <option value={50}>±50%</option>
            </select>
          </div>
        </div>
      </div>

      {/* Auto Loop & Beat Length Selector */}
      <div className="flex items-center justify-between gap-1 bg-[#0a0d16] p-1.5 rounded-xl border border-slate-800/80 my-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => channel.toggleLoop()}
          aria-label={deck.loopActive ? 'Exit Loop' : 'Activate Auto Loop'}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition active:scale-95 shrink-0 ${
            deck.loopActive
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {deck.loopActive ? 'Loop Active' : 'Auto Loop'}
        </button>

        <button
          onClick={() => channel.halveLoop()}
          disabled={!deck.loopActive}
          title="Halve Loop (/2)"
          className="px-2 py-0.5 text-xs font-bold rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
        >
          /2
        </button>

        <div className="flex items-center gap-1">
          {[0.5, 1, 2, 4, 8, 16].map((beats) => (
            <button
              key={beats}
              onClick={() => channel.setLoop(beats)}
              className={`px-1.5 py-0.5 text-[11px] font-mono-numbers font-bold rounded transition ${
                deck.loopActive && deck.loopBeats === beats
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800/70 text-slate-400 hover:text-white'
              }`}
            >
              {beats >= 1 ? `${beats}` : `1/2`}
            </button>
          ))}
        </div>

        <button
          onClick={() => channel.doubleLoop()}
          disabled={!deck.loopActive}
          title="Double Loop (2x)"
          className="px-2 py-0.5 text-xs font-bold rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
        >
          2x
        </button>
      </div>

      {/* 8 Color-Coded Hot Cue Pads */}
      <div className="bg-[#0a0d16] p-2 rounded-xl border border-slate-800/80 my-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hot Cues</span>
          <button
            onClick={() => setDeleteCueMode(!deleteCueMode)}
            title="Toggle Delete Cue Mode"
            className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition ${
              deleteCueMode ? 'bg-rose-900 text-rose-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trash2 className="w-3 h-3" />
            <span>{deleteCueMode ? 'Delete Active' : 'Clear'}</span>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
            const cue = deck.hotCues.find((c) => c.id === index);
            const isAssigned = !!cue;

            return (
              <button
                key={index}
                onClick={() => {
                  if (deleteCueMode) {
                    channel.deleteHotCue(index);
                  } else {
                    channel.triggerHotCue(index);
                  }
                }}
                aria-label={`Hot Cue Pad ${index}`}
                style={{
                  borderColor: isAssigned ? cue.color : '#23283c',
                  backgroundColor: isAssigned ? `${cue.color}20` : '#121522',
                }}
                className={`flex flex-col items-center justify-center h-8 rounded-lg border text-xs font-bold transition active:scale-95 ${
                  isAssigned ? 'shadow-sm text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className="font-mono-numbers">{index}</span>
                {isAssigned && (
                  <span className="text-[8px] font-mono-numbers text-slate-300 leading-none">
                    {formatTime(cue.time)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Stem Isolation Switches */}
      <div className="grid grid-cols-4 gap-1 bg-[#0a0d16] p-1.5 rounded-xl border border-slate-800/80 my-1">
        <button
          onClick={() => channel.toggleStemMute('vocals')}
          className={`flex items-center justify-center gap-1 py-1 rounded text-[10px] font-bold transition ${
            deck.stemVocalsMute ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {deck.stemVocalsMute && <VolumeX className="w-2.5 h-2.5" />}
          <span>Vocal</span>
        </button>

        <button
          onClick={() => channel.toggleStemMute('drums')}
          className={`flex items-center justify-center gap-1 py-1 rounded text-[10px] font-bold transition ${
            deck.stemDrumsMute ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {deck.stemDrumsMute && <VolumeX className="w-2.5 h-2.5" />}
          <span>Drums</span>
        </button>

        <button
          onClick={() => channel.toggleStemMute('bass')}
          className={`flex items-center justify-center gap-1 py-1 rounded text-[10px] font-bold transition ${
            deck.stemBassMute ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {deck.stemBassMute && <VolumeX className="w-2.5 h-2.5" />}
          <span>Bass</span>
        </button>

        <button
          onClick={() => channel.toggleStemMute('melody')}
          className={`flex items-center justify-center gap-1 py-1 rounded text-[10px] font-bold transition ${
            deck.stemMelodyMute ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {deck.stemMelodyMute && <VolumeX className="w-2.5 h-2.5" />}
          <span>Melody</span>
        </button>
      </div>

      {/* Main Transport Bar: CUE, PLAY/PAUSE, SYNC */}
      <div className="grid grid-cols-3 gap-2 mt-1.5 pt-1.5 border-t border-slate-800/80">
        {/* CUE Button */}
        <button
          onClick={() => channel.cue()}
          aria-label={`Deck ${channel.id} CUE`}
          className="h-10 rounded-xl bg-amber-600/30 hover:bg-amber-600/40 border-2 border-amber-500/80 text-amber-300 font-black text-xs flex items-center justify-center gap-1 shadow-lg shadow-amber-900/20 active:scale-95 transition"
        >
          <span>CUE</span>
        </button>

        {/* PLAY / PAUSE Button */}
        <button
          onClick={() => (deck.isPlaying ? channel.pause() : channel.play())}
          aria-label={deck.isPlaying ? `Deck ${channel.id} Pause` : `Deck ${channel.id} Play`}
          className={`h-10 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition ${
            deck.isPlaying
              ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-500/30 animate-pulse'
              : 'bg-emerald-950/60 hover:bg-emerald-900/60 border-emerald-600 text-emerald-400'
          }`}
        >
          {deck.isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{deck.isPlaying ? 'PAUSE' : 'PLAY'}</span>
        </button>

        {/* SYNC Button */}
        <button
          onClick={onSync}
          aria-label={`Deck ${channel.id} Beat Sync`}
          className={`h-10 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-1 active:scale-95 transition ${
            isCyan
              ? 'bg-cyan-950/60 hover:bg-cyan-900/60 border-cyan-500 text-cyan-300 shadow-cyan-500/20'
              : 'bg-rose-950/60 hover:bg-rose-900/60 border-rose-500 text-rose-300 shadow-rose-500/20'
          }`}
        >
          <RefreshCw className="w-3 h-3" />
          <span>SYNC</span>
        </button>
      </div>
    </div>
  );
};
