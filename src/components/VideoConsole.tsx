import React, { useState, useEffect, useRef } from 'react';
import {
  Maximize2,
  Tv,
  Sparkles,
  Link2,
  Link2Off,
  Radio,
  Download,
  RotateCcw,
  Sliders,
  Layers,
  Palette,
  Film,
  Disc,
} from 'lucide-react';
import { VideoEngine, VideoTransitionType, BlendModeType, VisualizerPreset } from '../video/videoEngine.js';
import { PiPPosition, AspectRatioMode } from '../video/videoMath.js';
import { formatTime } from '../utils/audioMath.js';

interface VideoConsoleProps {
  videoEngine: VideoEngine;
}

export const VideoConsole: React.FC<VideoConsoleProps> = ({ videoEngine }) => {
  const masterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const deckACanvasRef = useRef<HTMLCanvasElement | null>(null);
  const deckBCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const masterContainerRef = useRef<HTMLDivElement | null>(null);

  // Local state for controls
  const [videoCrossfader, setVideoCrossfader] = useState(videoEngine.videoCrossfader);
  const [isLinked, setIsLinked] = useState(videoEngine.linkAudioCrossfader);
  const [transition, setTransition] = useState<VideoTransitionType>(videoEngine.transitionType);
  const [blendMode, setBlendMode] = useState<BlendModeType>(videoEngine.blendMode);
  const [pipMode, setPipMode] = useState<PiPPosition>(videoEngine.pipPosition);
  const [aspectA, setAspectA] = useState<AspectRatioMode>(videoEngine.deckA.aspectMode);
  const [aspectB, setAspectB] = useState<AspectRatioMode>(videoEngine.deckB.aspectMode);
  const [presetA, setPresetA] = useState<VisualizerPreset>(videoEngine.deckA.visualizerPreset);
  const [presetB, setPresetB] = useState<VisualizerPreset>(videoEngine.deckB.visualizerPreset);

  // FX state
  const [hue, setHue] = useState(videoEngine.fx.hue);
  const [saturation, setSaturation] = useState(videoEngine.fx.saturation);
  const [brightness, setBrightness] = useState(videoEngine.fx.brightness);
  const [contrast, setContrast] = useState(videoEngine.fx.contrast);
  const [glitch, setGlitch] = useState(videoEngine.fx.glitch);
  const [rgbSplit, setRgbSplit] = useState(videoEngine.fx.rgbSplit);
  const [pixelate, setPixelate] = useState(videoEngine.fx.pixelate);
  const [kaleidoscope, setKaleidoscope] = useState(videoEngine.fx.kaleidoscope);
  const [mirror, setMirror] = useState(videoEngine.fx.mirror);
  const [invert, setInvert] = useState(videoEngine.fx.invert);

  // Chroma Key state
  const [chromaA, setChromaA] = useState(videoEngine.deckA.chromaKey.enabled);
  const [chromaB, setChromaB] = useState(videoEngine.deckB.chromaKey.enabled);

  // Watermark text
  const [watermark, setWatermark] = useState(videoEngine.overlayText);
  const [showLiveBadge, setShowLiveBadge] = useState(videoEngine.showLiveBadge);
  const [textPos, setTextPos] = useState(videoEngine.textPosition);

  // Recording
  const [isRecording, setIsRecording] = useState(videoEngine.isRecording);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<'transitions' | 'fx' | 'overlay' | 'chroma'>('transitions');

  // Animation frame mirror loop for previews
  useEffect(() => {
    let animId: number;

    const renderPreviews = () => {
      // 1. Mirror Master
      if (masterCanvasRef.current && videoEngine.masterCanvas) {
        const mCtx = masterCanvasRef.current.getContext('2d');
        if (mCtx) {
          mCtx.drawImage(
            videoEngine.masterCanvas,
            0,
            0,
            masterCanvasRef.current.width,
            masterCanvasRef.current.height
          );
        }
      }

      // 2. Mirror Deck A
      if (deckACanvasRef.current && videoEngine.deckA.offscreenCanvas) {
        const aCtx = deckACanvasRef.current.getContext('2d');
        if (aCtx) {
          aCtx.drawImage(
            videoEngine.deckA.offscreenCanvas,
            0,
            0,
            deckACanvasRef.current.width,
            deckACanvasRef.current.height
          );
        }
      }

      // 3. Mirror Deck B
      if (deckBCanvasRef.current && videoEngine.deckB.offscreenCanvas) {
        const bCtx = deckBCanvasRef.current.getContext('2d');
        if (bCtx) {
          bCtx.drawImage(
            videoEngine.deckB.offscreenCanvas,
            0,
            0,
            deckBCanvasRef.current.width,
            deckBCanvasRef.current.height
          );
        }
      }

      // Sync crossfader if linked
      if (videoEngine.linkAudioCrossfader) {
        setVideoCrossfader(videoEngine.videoCrossfader);
      }

      if (videoEngine.isRecording) {
        setIsRecording(true);
        setRecordDuration(videoEngine.recordingDuration);
      } else if (isRecording && !videoEngine.isRecording) {
        setIsRecording(false);
      }

      animId = requestAnimationFrame(renderPreviews);
    };

    animId = requestAnimationFrame(renderPreviews);
    return () => cancelAnimationFrame(animId);
  }, [videoEngine, isRecording]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!masterContainerRef.current) return;
    if (!document.fullscreenElement) {
      masterContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Recording handlers
  const handleStartRecording = () => {
    setRecordedVideoUrl(null);
    const success = videoEngine.startAVRecording();
    if (success) {
      setIsRecording(true);
    }
  };

  const handleStopRecording = () => {
    const blob = videoEngine.stopAVRecording();
    setIsRecording(false);
    if (blob) {
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
    }
  };

  const resetAllFX = () => {
    videoEngine.fx.hue = 0;
    videoEngine.fx.saturation = 1.0;
    videoEngine.fx.brightness = 1.0;
    videoEngine.fx.contrast = 1.0;
    videoEngine.fx.glitch = false;
    videoEngine.fx.rgbSplit = false;
    videoEngine.fx.pixelate = false;
    videoEngine.fx.kaleidoscope = false;
    videoEngine.fx.mirror = 'off';
    videoEngine.fx.invert = false;

    setHue(0);
    setSaturation(1.0);
    setBrightness(1.0);
    setContrast(1.0);
    setGlitch(false);
    setRgbSplit(false);
    setPixelate(false);
    setKaleidoscope(false);
    setMirror('off');
    setInvert(false);
  };

  return (
    <div className="flex flex-col gap-4 bg-[#0a0d16] rounded-2xl border border-slate-800 p-3 sm:p-5 shadow-2xl">
      {/* Top Header & Recorder Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <span>Ogopa VJ Master Video Console</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800 text-[10px] font-bold text-cyan-300">
                1080p WebGL Compositor
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Zero-latency dual deck video mixing, beat-reactive visualizers, transitions, and A/V capture.
            </p>
          </div>
        </div>

        {/* Live A/V Record Action */}
        <div className="flex items-center gap-2">
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition active:scale-95"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Record Video Mix</span>
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500 font-bold text-xs shadow-md transition animate-pulse"
            >
              <Disc className="w-3.5 h-3.5 animate-spin" />
              <span>Stop REC ({formatTime(recordDuration)})</span>
            </button>
          )}

          {recordedVideoUrl && (
            <a
              href={recordedVideoUrl}
              download={`ogopa-vj-mix-${new Date().toISOString().slice(0, 10)}.webm`}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download WebM Video</span>
            </a>
          )}
        </div>
      </div>

      {/* Main Monitoring Section: Deck A Preview | Master Monitor | Deck B Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        {/* Left: Deck A Monitor (3 cols on desktop) */}
        <div className="lg:col-span-3 flex flex-col bg-[#0b0e1b] rounded-xl border border-cyan-500/40 p-3 shadow-lg">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-black text-cyan-400">DECK A MONITOR</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-800">
              {videoEngine.deckA.mode === 'video' ? 'VIDEO FILE' : 'VISUALIZER'}
            </span>
          </div>

          {/* Canvas Preview */}
          <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden border border-slate-800 shadow-inner">
            <canvas ref={deckACanvasRef} width={640} height={360} className="w-full h-full object-cover" />
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[9px] font-mono font-bold text-cyan-300 border border-cyan-500/30">
              {videoEngine.deckA.mode === 'video'
                ? videoEngine.deckA.videoName || 'LOADED VIDEO'
                : `VISUALIZER: ${presetA.toUpperCase()}`}
            </div>
          </div>

          {/* Quick Deck A Visual Controls */}
          <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Visualizer Style</label>
              <select
                value={presetA}
                onChange={(e) => {
                  const val = e.target.value as VisualizerPreset;
                  videoEngine.deckA.visualizerPreset = val;
                  setPresetA(val);
                }}
                className="w-full bg-[#121626] border border-slate-700 rounded px-1.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="cyber-grid">Cyber Grid (Synthwave)</option>
                <option value="spectrum-tunnel">Spectrum Tunnel</option>
                <option value="particle-vortex">Particle Vortex</option>
                <option value="neon-lasers">Neon Lasers</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Aspect Mode</label>
              <select
                value={aspectA}
                onChange={(e) => {
                  const m = e.target.value as AspectRatioMode;
                  setAspectA(m);
                  videoEngine.deckA.aspectMode = m;
                }}
                className="w-full bg-[#121626] border border-slate-700 rounded px-1.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="fill">Fill (Crop)</option>
                <option value="fit">Fit (Letterbox)</option>
                <option value="stretch">Stretch</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80">
            <span className="text-[10px] text-slate-400">Green Screen Key</span>
            <button
              onClick={() => {
                const next = !chromaA;
                setChromaA(next);
                videoEngine.deckA.chromaKey.enabled = next;
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                chromaA ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {chromaA ? 'KEY ACTIVE' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Center: Master Output Monitor (6 cols on desktop) */}
        <div
          ref={masterContainerRef}
          className="lg:col-span-6 flex flex-col bg-[#0b0e1b] rounded-xl border border-slate-700 p-3 shadow-xl relative"
        >
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-cyan-400" />
                <span>MASTER VIDEO OUTPUT</span>
              </span>
              <span className="px-1.5 py-0.2 rounded bg-rose-950/80 border border-rose-800 text-rose-400 text-[9px] font-mono font-bold animate-pulse">
                ON AIR
              </span>
              <span className="text-[10px] font-mono text-slate-400 ml-2 hidden sm:inline">
                {transition.toUpperCase()} • {blendMode.toUpperCase()}
              </span>
            </div>

            <button
              onClick={toggleFullscreen}
              title="Full Screen Master Monitor"
              aria-label="Full Screen Master Monitor"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Fullscreen</span>
            </button>
          </div>

          {/* Master Canvas with Subtle Neon DJ Glow */}
          <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden border border-slate-800 shadow-2xl">
            <canvas ref={masterCanvasRef} width={1280} height={720} className="w-full h-full object-contain" />

            {/* Quick Status Bar on Canvas Top-Right */}
            <div className="absolute top-2 right-2 flex items-center gap-2 pointer-events-none opacity-90 text-[10px] font-mono font-bold text-white drop-shadow bg-black/75 px-2 py-0.5 rounded border border-slate-700/60 backdrop-blur-xs">
              <span className="text-cyan-300">FX: {transition.toUpperCase()}</span>
              <span className="text-slate-500">|</span>
              <span className="text-amber-300">
                {videoCrossfader < 0 ? `DECK A ${Math.round(-videoCrossfader * 100)}%` : `DECK B ${Math.round(videoCrossfader * 100)}%`}
              </span>
            </div>
          </div>

          {/* Video Crossfader Strip */}
          <div className="mt-3 pt-2 border-t border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-cyan-400">DECK A</span>
                <button
                  onClick={() => {
                    const next = !isLinked;
                    setIsLinked(next);
                    videoEngine.linkAudioCrossfader = next;
                  }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    isLinked
                      ? 'bg-purple-600/80 text-purple-200 border border-purple-500'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                  title="Link Video Crossfader to DJ Mixer Crossfader"
                >
                  {isLinked ? <Link2 className="w-3 h-3" /> : <Link2Off className="w-3 h-3" />}
                  <span>{isLinked ? 'Linked to Audio' : 'Video Independent'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    videoEngine.setVideoCrossfader(0);
                    setVideoCrossfader(0);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300"
                >
                  Center (50/50)
                </button>
                <span className="font-extrabold text-rose-400">DECK B</span>
              </div>
            </div>

            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={videoCrossfader}
              disabled={isLinked}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVideoCrossfader(val);
                videoEngine.setVideoCrossfader(val);
              }}
              aria-label="Video Crossfader"
              className="crossfader-slider w-full cursor-pointer"
            />
          </div>
        </div>

        {/* Right: Deck B Monitor (3 cols on desktop) */}
        <div className="lg:col-span-3 flex flex-col bg-[#0b0e1b] rounded-xl border border-rose-500/40 p-3 shadow-lg">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-black text-rose-400">DECK B MONITOR</span>
            </div>
            <span className="text-[10px] font-mono text-rose-300 font-bold uppercase px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-800">
              {videoEngine.deckB.mode === 'video' ? 'VIDEO FILE' : 'VISUALIZER'}
            </span>
          </div>

          {/* Canvas Preview */}
          <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden border border-slate-800 shadow-inner">
            <canvas ref={deckBCanvasRef} width={640} height={360} className="w-full h-full object-cover" />
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[9px] font-mono font-bold text-rose-300 border border-rose-500/30">
              {videoEngine.deckB.mode === 'video'
                ? videoEngine.deckB.videoName || 'LOADED VIDEO'
                : `VISUALIZER: ${presetB.toUpperCase()}`}
            </div>
          </div>

          {/* Quick Deck B Visual Controls */}
          <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Visualizer Style</label>
              <select
                value={presetB}
                onChange={(e) => {
                  const val = e.target.value as VisualizerPreset;
                  videoEngine.deckB.visualizerPreset = val;
                  setPresetB(val);
                }}
                className="w-full bg-[#121626] border border-slate-700 rounded px-1.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-rose-400"
              >
                <option value="spectrum-tunnel">Spectrum Tunnel</option>
                <option value="cyber-grid">Cyber Grid (Synthwave)</option>
                <option value="particle-vortex">Particle Vortex</option>
                <option value="neon-lasers">Neon Lasers</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Aspect Mode</label>
              <select
                value={aspectB}
                onChange={(e) => {
                  const m = e.target.value as AspectRatioMode;
                  setAspectB(m);
                  videoEngine.deckB.aspectMode = m;
                }}
                className="w-full bg-[#121626] border border-slate-700 rounded px-1.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-rose-400"
              >
                <option value="fill">Fill (Crop)</option>
                <option value="fit">Fit (Letterbox)</option>
                <option value="stretch">Stretch</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80">
            <span className="text-[10px] text-slate-400">Green Screen Key</span>
            <button
              onClick={() => {
                const next = !chromaB;
                setChromaB(next);
                videoEngine.deckB.chromaKey.enabled = next;
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                chromaB ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {chromaB ? 'KEY ACTIVE' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Lower Processing Rack: Transitions | Video FX | Overlay & Watermark | Chroma Key */}
      <div className="flex flex-col bg-[#0b0e1a] rounded-xl border border-slate-800 p-3 sm:p-4 shadow-xl">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveSubTab('transitions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'transitions'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Transitions & Blend</span>
            </button>

            <button
              onClick={() => setActiveSubTab('fx')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'fx'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Video FX Rack</span>
            </button>

            <button
              onClick={() => setActiveSubTab('overlay')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'overlay'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>PiP & Watermark</span>
            </button>

            <button
              onClick={() => setActiveSubTab('chroma')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'chroma'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Chroma Key Settings</span>
            </button>
          </div>

          {activeSubTab === 'fx' && (
            <button
              onClick={resetAllFX}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 px-2 py-1 rounded bg-slate-800 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset FX</span>
            </button>
          )}
        </div>

        {/* Tab 1: Transitions & Blend Modes */}
        {activeSubTab === 'transitions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-2">Transition Style</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'crossfade', label: 'Crossfade' },
                  { id: 'wipe-left', label: 'Wipe Left' },
                  { id: 'wipe-right', label: 'Wipe Right' },
                  { id: 'wipe-up', label: 'Wipe Up' },
                  { id: 'wipe-down', label: 'Wipe Down' },
                  { id: 'zoom', label: 'Zoom 3D' },
                  { id: 'slide', label: 'Slide' },
                  { id: 'cube', label: 'Cube Push' },
                  { id: 'beat-cut', label: 'Beat Cut' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      const next = t.id as VideoTransitionType;
                      setTransition(next);
                      videoEngine.transitionType = next;
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition text-center ${
                      transition === t.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                        : 'bg-[#121626] border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-2">Compositing Blend Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'source-over', label: 'Normal' },
                  { id: 'screen', label: 'Screen' },
                  { id: 'lighter', label: 'Luma Add' },
                  { id: 'multiply', label: 'Multiply' },
                  { id: 'overlay', label: 'Overlay' },
                  { id: 'difference', label: 'Difference' },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      const next = b.id as BlendModeType;
                      setBlendMode(next);
                      videoEngine.blendMode = next;
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition text-center ${
                      blendMode === b.id
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300 font-bold'
                        : 'bg-[#121626] border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-3">
                Blend modes mathematically combine RGB channels of both video layers for club visual depth.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Video FX Rack */}
        {activeSubTab === 'fx' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            {/* Color FX */}
            <div className="flex flex-col gap-2.5 bg-[#121626] p-3 rounded-xl border border-slate-700">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                <span>Color Grading & Contrast</span>
              </span>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Hue Shift</span>
                    <span className="font-mono">{hue}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={hue}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setHue(val);
                      videoEngine.fx.hue = val;
                    }}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Saturation</span>
                    <span className="font-mono">{Math.round(saturation * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={0.05}
                    value={saturation}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSaturation(val);
                      videoEngine.fx.saturation = val;
                    }}
                    className="w-full accent-purple-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Brightness</span>
                      <span className="font-mono">{Math.round(brightness * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2.0}
                      step={0.05}
                      value={brightness}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setBrightness(val);
                        videoEngine.fx.brightness = val;
                      }}
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Contrast</span>
                      <span className="font-mono">{Math.round(contrast * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2.0}
                      step={0.05}
                      value={contrast}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setContrast(val);
                        videoEngine.fx.contrast = val;
                      }}
                      className="w-full accent-emerald-400"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    const next = !invert;
                    setInvert(next);
                    videoEngine.fx.invert = next;
                  }}
                  className={`w-full py-1.5 rounded-lg font-bold transition text-xs ${
                    invert ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {invert ? 'COLOR INVERT: ON' : 'Color Invert'}
                </button>
              </div>
            </div>

            {/* Distortion & Glitch FX */}
            <div className="flex flex-col gap-2.5 bg-[#121626] p-3 rounded-xl border border-slate-700">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Distortion & Club Stylizers</span>
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    const next = !glitch;
                    setGlitch(next);
                    videoEngine.fx.glitch = next;
                  }}
                  className={`py-2 rounded-lg font-bold border transition text-center ${
                    glitch ? 'bg-rose-600/30 border-rose-500 text-rose-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  ⚡ Glitch Slice
                </button>

                <button
                  onClick={() => {
                    const next = !rgbSplit;
                    setRgbSplit(next);
                    videoEngine.fx.rgbSplit = next;
                  }}
                  className={`py-2 rounded-lg font-bold border transition text-center ${
                    rgbSplit ? 'bg-cyan-600/30 border-cyan-400 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  🌈 RGB Split
                </button>

                <button
                  onClick={() => {
                    const next = !pixelate;
                    setPixelate(next);
                    videoEngine.fx.pixelate = next;
                  }}
                  className={`py-2 rounded-lg font-bold border transition text-center ${
                    pixelate ? 'bg-amber-600/30 border-amber-400 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  👾 8-Bit Pixelate
                </button>

                <button
                  onClick={() => {
                    const next = !kaleidoscope;
                    setKaleidoscope(next);
                    videoEngine.fx.kaleidoscope = next;
                  }}
                  className={`py-2 rounded-lg font-bold border transition text-center ${
                    kaleidoscope ? 'bg-purple-600/30 border-purple-400 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  🔮 Kaleidoscope
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Mirror Reflection</label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {(['off', 'horizontal', 'vertical'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMirror(m);
                        videoEngine.fx.mirror = m;
                      }}
                      className={`py-1 rounded text-[11px] font-semibold border transition ${
                        mirror === m ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: PiP & Watermark */}
        {activeSubTab === 'overlay' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            {/* Picture-in-Picture */}
            <div className="flex flex-col gap-2.5 bg-[#121626] p-3 rounded-xl border border-slate-700">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5" />
                <span>Picture-in-Picture (PiP) Overlay</span>
              </span>

              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: 'off', label: 'Off' },
                  { id: 'top-right', label: 'Top-Right' },
                  { id: 'top-left', label: 'Top-Left' },
                  { id: 'bottom-right', label: 'Bottom-Right' },
                  { id: 'bottom-left', label: 'Bottom-Left' },
                  { id: 'split-h', label: '50/50 Split' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      const next = p.id as PiPPosition;
                      setPipMode(next);
                      videoEngine.pipPosition = next;
                    }}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                      pipMode === p.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                PiP dynamically composites incoming deck with cyan/magenta neon border frame.
              </p>
            </div>

            {/* DJ Text Watermark */}
            <div className="flex flex-col gap-2.5 bg-[#121626] p-3 rounded-xl border border-slate-700 text-xs">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>DJ Watermark & On-Air Badge</span>
              </span>

              <div>
                <label className="text-slate-400 block mb-1">Custom DJ Text / Headline</label>
                <input
                  type="text"
                  value={watermark}
                  onChange={(e) => {
                    setWatermark(e.target.value);
                    videoEngine.overlayText = e.target.value;
                  }}
                  className="w-full bg-[#0a0d16] border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-400"
                  placeholder="e.g. OGOPA DJ'S • LIVE VJ"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Show "● LIVE VJ MIX" tag</span>
                <button
                  onClick={() => {
                    const next = !showLiveBadge;
                    setShowLiveBadge(next);
                    videoEngine.showLiveBadge = next;
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                    showLiveBadge ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {showLiveBadge ? 'ENABLED' : 'HIDDEN'}
                </button>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Badge Position</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['bottom-center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => {
                        setTextPos(pos);
                        videoEngine.textPosition = pos;
                      }}
                      className={`py-1 text-[10px] rounded border transition ${
                        textPos === pos
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {pos.replace('-', ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Chroma Key (Green Screen) */}
        {activeSubTab === 'chroma' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            {/* Deck A Chroma */}
            <div className="bg-[#121626] p-3 rounded-xl border border-cyan-500/40 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-cyan-400">Deck A Chroma Key</span>
                <button
                  onClick={() => {
                    const next = !chromaA;
                    setChromaA(next);
                    videoEngine.deckA.chromaKey.enabled = next;
                  }}
                  className={`px-2.5 py-1 rounded font-bold text-xs ${
                    chromaA ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {chromaA ? 'ON' : 'OFF'}
                </button>
              </div>
              <p className="text-slate-400 text-[11px] mb-2">
                Removes green backdrop from music videos, lyric clips, or dancer feeds for live alpha compositing.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Tolerance</span>
                  <span className="font-mono">{Math.round(videoEngine.deckA.chromaKey.tolerance * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.7}
                  step={0.02}
                  defaultValue={videoEngine.deckA.chromaKey.tolerance}
                  onChange={(e) => {
                    videoEngine.deckA.chromaKey.tolerance = parseFloat(e.target.value);
                  }}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>

            {/* Deck B Chroma */}
            <div className="bg-[#121626] p-3 rounded-xl border border-rose-500/40 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-rose-400">Deck B Chroma Key</span>
                <button
                  onClick={() => {
                    const next = !chromaB;
                    setChromaB(next);
                    videoEngine.deckB.chromaKey.enabled = next;
                  }}
                  className={`px-2.5 py-1 rounded font-bold text-xs ${
                    chromaB ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {chromaB ? 'ON' : 'OFF'}
                </button>
              </div>
              <p className="text-slate-400 text-[11px] mb-2">
                Isolates subject to blend seamlessly over Deck A background or reactive 3D visualizer tunnel.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Tolerance</span>
                  <span className="font-mono">{Math.round(videoEngine.deckB.chromaKey.tolerance * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.7}
                  step={0.02}
                  defaultValue={videoEngine.deckB.chromaKey.tolerance}
                  onChange={(e) => {
                    videoEngine.deckB.chromaKey.tolerance = parseFloat(e.target.value);
                  }}
                  className="w-full accent-rose-400"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
