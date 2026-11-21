/**
 * Ogopa DJ's Central Video Engine
 * Real-time hardware-accelerated dual deck video mixing, WebGL/Canvas compositing,
 * video FX, transitions, Chroma Key, PiP, and audio-video synchronized recording.
 */

import { AudioEngine, DeckAudioChannel } from '../audio/audioEngine.js';
import {
  calculateAspectRect,
  calculatePiPRect,
  crossfaderToBlendRatio,
  AspectRatioMode,
  PiPPosition,
} from './videoMath.js';

export type VideoTransitionType =
  | 'crossfade'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'zoom'
  | 'slide'
  | 'cube'
  | 'beat-cut';

export type BlendModeType = 'source-over' | 'screen' | 'lighter' | 'multiply' | 'overlay' | 'difference';

export interface VideoFXConfig {
  hue: number;         // 0 to 360 deg
  saturation: number;  // 0.0 to 3.0 (1.0 default)
  brightness: number;  // 0.0 to 2.0 (1.0 default)
  contrast: number;    // 0.0 to 2.0 (1.0 default)
  glitch: boolean;
  glitchAmount: number; // 0.0 to 1.0
  pixelate: boolean;
  pixelSize: number;    // 2 to 32
  rgbSplit: boolean;
  rgbSplitAmount: number; // 1 to 20 px
  mirror: 'off' | 'horizontal' | 'vertical' | 'quad';
  kaleidoscope: boolean;
  invert: boolean;
}

export interface ChromaKeyConfig {
  enabled: boolean;
  keyColor: [number, number, number]; // [R, G, B]
  tolerance: number;  // 0.1 to 0.7
  smoothness: number; // 0.0 to 0.4
}

export type VisualizerPreset = 'cyber-grid' | 'spectrum-tunnel' | 'particle-vortex' | 'neon-lasers';

export class DeckVideoChannel {
  public id: 'A' | 'B';
  public videoElement: HTMLVideoElement;
  public offscreenCanvas: HTMLCanvasElement;
  public offscreenCtx: CanvasRenderingContext2D | null;
  public mode: 'video' | 'visualizer' = 'visualizer';
  public visualizerPreset: VisualizerPreset = 'cyber-grid';
  public aspectMode: AspectRatioMode = 'fill';
  public chromaKey: ChromaKeyConfig;
  public videoLoaded = false;
  public videoName = '';
  public videoDuration = 0;

  // Analyser cache for beat-reactive visualizer
  private freqData: Uint8Array<ArrayBuffer>;
  private timeData: Uint8Array<ArrayBuffer>;
  private audioChannel: DeckAudioChannel;
  private animTick = 0;

  constructor(id: 'A' | 'B', audioChannel: DeckAudioChannel) {
    this.id = id;
    this.audioChannel = audioChannel;

    // Create hidden video element
    this.videoElement = document.createElement('video');
    this.videoElement.crossOrigin = 'anonymous';
    this.videoElement.playsInline = true;
    this.videoElement.muted = true; // Audio is routed and processed via Web Audio API
    this.videoElement.loop = true;
    this.videoElement.preload = 'auto';

    // Offscreen render canvas
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 640;
    this.offscreenCanvas.height = 360;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

    this.freqData = new Uint8Array(new ArrayBuffer(32));
    this.timeData = new Uint8Array(new ArrayBuffer(32));

    this.chromaKey = {
      enabled: false,
      keyColor: [0, 255, 0],
      tolerance: 0.35,
      smoothness: 0.1,
    };

    if (id === 'B') {
      this.visualizerPreset = 'spectrum-tunnel';
    }
  }

  public loadVideo(url: string, name: string) {
    this.videoElement.src = url;
    this.videoName = name;
    this.mode = 'video';
    this.videoElement.load();
    this.videoElement.onloadedmetadata = () => {
      this.videoLoaded = true;
      this.videoDuration = this.videoElement.duration;
      this.syncWithAudio();
    };
  }

  public unloadVideo() {
    this.videoElement.pause();
    this.videoElement.removeAttribute('src');
    this.videoElement.load();
    this.videoLoaded = false;
    this.videoName = '';
    this.mode = 'visualizer';
  }

  public setMode(mode: 'video' | 'visualizer') {
    this.mode = mode;
  }

  public syncWithAudio() {
    const audioState = this.audioChannel.state;
    if (!this.videoLoaded || this.mode !== 'video') return;

    // Sync Playback Rate
    const targetRate = Math.max(0.25, Math.min(4.0, 1 + audioState.pitchPercent / 100));
    if (Math.abs(this.videoElement.playbackRate - targetRate) > 0.01) {
      this.videoElement.playbackRate = targetRate;
    }

    // Sync Play/Pause
    if (audioState.isPlaying && this.videoElement.paused) {
      this.videoElement.play().catch(() => {});
    } else if (!audioState.isPlaying && !this.videoElement.paused) {
      this.videoElement.pause();
    }

    // Check drift (> 0.15s) and resync
    const targetTime = audioState.currentTime;
    if (Math.abs(this.videoElement.currentTime - targetTime) > 0.15) {
      try {
        this.videoElement.currentTime = targetTime % (this.videoDuration || targetTime || 1);
      } catch {
        // ignore
      }
    }
  }

  public renderFrame(analyser: AnalyserNode) {
    if (!this.offscreenCtx) return;
    const ctx = this.offscreenCtx;
    const w = this.offscreenCanvas.width;
    const h = this.offscreenCanvas.height;

    this.animTick++;

    if (this.mode === 'video' && this.videoLoaded && this.videoElement.readyState >= 2) {
      // 1. Render Video File Frames
      ctx.clearRect(0, 0, w, h);
      const rect = calculateAspectRect(
        this.videoElement.videoWidth || 1920,
        this.videoElement.videoHeight || 1080,
        w,
        h,
        this.aspectMode
      );
      ctx.drawImage(this.videoElement, rect.x, rect.y, rect.width, rect.height);

      // Chroma Key pass if enabled
      if (this.chromaKey.enabled) {
        this.applyChromaKey(ctx, w, h);
      }
    } else {
      // 2. Audio Energy Analysis & Beat-Reactive Visualizer
      try {
        analyser.getByteFrequencyData(this.freqData);
        analyser.getByteTimeDomainData(this.timeData);
      } catch {
        // ignore
      }

      let energy = 0;
      for (let i = 0; i < this.freqData.length; i++) {
        energy += this.freqData[i];
      }
      energy = energy / (this.freqData.length * 255); // 0 to 1

      this.renderVisualizer(ctx, w, h, energy);

      if (this.chromaKey.enabled) {
        this.applyChromaKey(ctx, w, h);
      }
    }
  }

  private applyChromaKey(ctx: CanvasRenderingContext2D, w: number, h: number) {
    try {
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;
      const [kr, kg, kb] = this.chromaKey.keyColor;
      const tol = this.chromaKey.tolerance;
      const sm = this.chromaKey.smoothness;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const dr = (r - kr) / 255;
        const dg = (g - kg) / 255;
        const db = (b - kb) / 255;
        const dist = Math.sqrt(dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114);

        if (dist < tol) {
          d[i + 3] = 0; // Transparent
        } else if (dist < tol + sm && sm > 0.001) {
          d[i + 3] = Math.floor(d[i + 3] * ((dist - tol) / sm));
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } catch {
      // ignore security restrictions on canvas
    }
  }

  private renderVisualizer(ctx: CanvasRenderingContext2D, w: number, h: number, energy: number) {
    ctx.fillStyle = '#080912';
    ctx.fillRect(0, 0, w, h);

    const isCyan = this.id === 'A';
    const mainColor = isCyan ? 'rgba(0, 242, 254, ' : 'rgba(255, 8, 68, ';
    const secColor = isCyan ? 'rgba(168, 85, 247, ' : 'rgba(234, 179, 8, ';

    switch (this.visualizerPreset) {
      case 'cyber-grid': {
        // Retro Synthwave 3D Perspective Grid
        const horizonY = h * 0.52;
        // Sun / Glow
        const sunRadius = 40 + energy * 30;
        const sunGrad = ctx.createRadialGradient(w / 2, horizonY - 10, 5, w / 2, horizonY - 10, sunRadius * 1.5);
        sunGrad.addColorStop(0, isCyan ? '#00f2fe' : '#ff0844');
        sunGrad.addColorStop(0.5, isCyan ? '#a855f7' : '#f59e0b');
        sunGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(w / 2, horizonY - 10, sunRadius, Math.PI, 0, false);
        ctx.fill();

        // Perspective grid lines
        ctx.strokeStyle = `${mainColor} ${0.3 + energy * 0.5})`;
        ctx.lineWidth = 1.5;

        // Radiating perspective lines
        const vanishingX = w / 2;
        const vanishingY = horizonY;
        const cols = 14;
        for (let i = -cols; i <= cols; i++) {
          const targetX = vanishingX + i * (w / cols) * 1.5;
          ctx.beginPath();
          ctx.moveTo(vanishingX, vanishingY);
          ctx.lineTo(targetX, h);
          ctx.stroke();
        }

        // Horizontal moving grid lines
        const speed = (this.animTick * (2 + energy * 6)) % 40;
        for (let y = 0; y < h - horizonY; y += 12) {
          const mappedY = horizonY + Math.pow((y + speed) / (h - horizonY), 2.2) * (h - horizonY);
          if (mappedY <= h) {
            ctx.beginPath();
            ctx.moveTo(0, mappedY);
            ctx.lineTo(w, mappedY);
            ctx.stroke();
          }
        }
        break;
      }

      case 'spectrum-tunnel': {
        // Hyperspace Expanding Tunnel Rings
        const cx = w / 2;
        const cy = h / 2;
        const maxR = Math.hypot(cx, cy);
        const numRings = 9;

        for (let r = 0; r < numRings; r++) {
          const ringDist = ((this.animTick * (1.5 + energy * 4) + r * 50) % maxR);
          const freqVal = (this.freqData[r % this.freqData.length] || 128) / 255;
          const radius = ringDist * (0.8 + freqVal * 0.4);

          ctx.strokeStyle = r % 2 === 0 ? `${mainColor} ${0.4 + freqVal * 0.6})` : `${secColor} ${0.3 + freqVal * 0.5})`;
          ctx.lineWidth = 2 + freqVal * 4;

          ctx.beginPath();
          // Draw geometric polygon tunnel
          const sides = 6;
          for (let s = 0; s <= sides; s++) {
            const angle = (s / sides) * Math.PI * 2 + (this.animTick * 0.015);
            const px = cx + Math.cos(angle) * radius;
            const py = cy + Math.sin(angle) * radius;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        break;
      }

      case 'particle-vortex': {
        // Swirling reactive particles with oscilloscope core
        const cx = w / 2;
        const cy = h / 2;
        const numParticles = 40;

        for (let i = 0; i < numParticles; i++) {
          const angle = (i / numParticles) * Math.PI * 2 + this.animTick * 0.03;
          const dist = 30 + ((i * 12 + this.animTick * 3) % (w * 0.45));
          const freq = (this.freqData[i % this.freqData.length] || 100) / 255;
          const px = cx + Math.cos(angle) * dist * (1 + freq * 0.3);
          const py = cy + Math.sin(angle) * dist * 0.7 * (1 + freq * 0.3);
          const size = 2 + freq * 6;

          ctx.fillStyle = i % 2 === 0 ? `${mainColor} ${0.6 + freq * 0.4})` : `${secColor} ${0.5 + freq * 0.5})`;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Central Oscilloscope Ring
        ctx.strokeStyle = `${mainColor} 0.9)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let t = 0; t < this.timeData.length; t++) {
          const theta = (t / this.timeData.length) * Math.PI * 2;
          const wave = (this.timeData[t] - 128) / 128;
          const rad = 35 + wave * 25 + energy * 15;
          const x = cx + Math.cos(theta) * rad;
          const y = cy + Math.sin(theta) * rad;
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        break;
      }

      case 'neon-lasers':
      default: {
        // Equalizer Towers & Laser Spotlight Sweeps
        const bars = 24;
        const barW = (w / bars) - 3;
        for (let b = 0; b < bars; b++) {
          const freq = (this.freqData[b % this.freqData.length] || 0) / 255;
          const barH = freq * (h * 0.75);
          const x = b * (barW + 3) + 2;
          const y = h - barH;

          const grad = ctx.createLinearGradient(0, y, 0, h);
          grad.addColorStop(0, isCyan ? '#00f2fe' : '#ff0844');
          grad.addColorStop(0.6, isCyan ? '#3b82f6' : '#e11d48');
          grad.addColorStop(1, '#1e1b4b');

          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barW, barH);
        }

        // Laser beam sweeping overhead
        const laserAngle = Math.sin(this.animTick * 0.04) * (w * 0.4);
        ctx.strokeStyle = `${mainColor} ${0.7 + energy * 0.3})`;
        ctx.lineWidth = 3 + energy * 5;
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2 + laserAngle, h);
        ctx.stroke();
        break;
      }
    }
  }
}

export class VideoEngine {
  private static instance: VideoEngine | null = null;
  public audioEngine: AudioEngine;

  // Deck channels
  public deckA: DeckVideoChannel;
  public deckB: DeckVideoChannel;

  // Master Compositor Canvas
  public masterCanvas: HTMLCanvasElement;
  public masterCtx: CanvasRenderingContext2D | null;

  // Crossfader state
  public videoCrossfader = 0; // -1.0 (A) to +1.0 (B)
  public linkAudioCrossfader = true; // Auto-follow DJ mixer crossfader
  public transitionType: VideoTransitionType = 'crossfade';
  public blendMode: BlendModeType = 'source-over';

  // Video FX
  public fx: VideoFXConfig;

  // PiP
  public pipPosition: PiPPosition = 'off';
  public pipScale = 0.32;

  // Text / Watermark
  public overlayText = 'OGOPA DJ’S • LIVE VJ';
  public showLiveBadge = true;
  public textPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center' = 'bottom-center';



  // Master A/V Recording
  public isRecording = false;
  public recordingStartTime = 0;
  public recordingDuration = 0;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  // Compositor Loop
  private isRunning = false;
  private animFrameId: number | null = null;

  private constructor() {
    this.audioEngine = AudioEngine.getInstance();
    this.deckA = new DeckVideoChannel('A', this.audioEngine.deckA);
    this.deckB = new DeckVideoChannel('B', this.audioEngine.deckB);

    this.masterCanvas = document.createElement('canvas');
    this.masterCanvas.width = 1280;
    this.masterCanvas.height = 720;
    this.masterCtx = this.masterCanvas.getContext('2d', { willReadFrequently: true });

    this.fx = {
      hue: 0,
      saturation: 1.0,
      brightness: 1.0,
      contrast: 1.0,
      glitch: false,
      glitchAmount: 0.3,
      pixelate: false,
      pixelSize: 8,
      rgbSplit: false,
      rgbSplitAmount: 8,
      mirror: 'off',
      kaleidoscope: false,
      invert: false,
    };

    this.startCompositorLoop();
  }

  public static getInstance(): VideoEngine {
    if (!VideoEngine.instance) {
      VideoEngine.instance = new VideoEngine();
    }
    return VideoEngine.instance;
  }

  public setVideoCrossfader(val: number) {
    this.videoCrossfader = Math.max(-1, Math.min(1, val));
  }

  public startCompositorLoop() {
    if (this.isRunning) return;
    this.isRunning = true;

    const loop = () => {
      this.tick();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public stopCompositorLoop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public tick() {
    // 1. Sync video elements with audio state
    this.deckA.syncWithAudio();
    this.deckB.syncWithAudio();

    // 2. If A/V Crossfader is linked, follow audio crossfader
    if (this.linkAudioCrossfader) {
      this.videoCrossfader = this.audioEngine.masterState.crossfader;
    }

    // 3. Render individual decks
    this.deckA.renderFrame(this.audioEngine.deckA['analyser']);
    this.deckB.renderFrame(this.audioEngine.deckB['analyser']);

    // 4. Composite onto Master Canvas
    this.compositeMaster();

    // 5. Update recording time
    if (this.isRecording) {
      this.recordingDuration = (Date.now() - this.recordingStartTime) / 1000;
    }
  }

  private compositeMaster() {
    if (!this.masterCtx) return;
    const ctx = this.masterCtx;
    const w = this.masterCanvas.width;
    const h = this.masterCanvas.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Apply Global Filter (Hue, Saturation, Brightness, Contrast, Invert)
    const filters: string[] = [];
    if (this.fx.hue !== 0) filters.push(`hue-rotate(${this.fx.hue}deg)`);
    if (this.fx.saturation !== 1.0) filters.push(`saturate(${Math.round(this.fx.saturation * 100)}%)`);
    if (this.fx.brightness !== 1.0) filters.push(`brightness(${Math.round(this.fx.brightness * 100)}%)`);
    if (this.fx.contrast !== 1.0) filters.push(`contrast(${Math.round(this.fx.contrast * 100)}%)`);
    if (this.fx.invert) filters.push('invert(100%)');

    ctx.filter = filters.length > 0 ? filters.join(' ') : 'none';

    // Transition blend calculations
    const blendRatio = crossfaderToBlendRatio(this.videoCrossfader); // 0 (Deck A) to 1 (Deck B)

    // Render Deck A as base
    ctx.globalAlpha = 1.0;
    ctx.drawImage(this.deckA.offscreenCanvas, 0, 0, w, h);

    // Render Deck B with transition effect
    ctx.save();
    ctx.globalCompositeOperation = this.blendMode;

    switch (this.transitionType) {
      case 'crossfade': {
        ctx.globalAlpha = blendRatio;
        ctx.drawImage(this.deckB.offscreenCanvas, 0, 0, w, h);
        break;
      }

      case 'wipe-left': {
        // Deck B wipes in from right to left
        const wipeX = w * (1 - blendRatio);
        ctx.beginPath();
        ctx.rect(wipeX, 0, w - wipeX, h);
        ctx.clip();
        ctx.drawImage(this.deckB.offscreenCanvas, 0, 0, w, h);
        break;
      }

      case 'wipe-right': {
        // Deck B wipes in from left to right
        const wipeW = w * blendRatio;
        ctx.beginPath();
        ctx.rect(0, 0, wipeW, h);
        ctx.clip();
        ctx.drawImage(this.deckB.offscreenCanvas, 0, 0, w, h);
        break;
      }

      case 'wipe-up': {
        const wipeY = h * (1 - blendRatio);
        ctx.beginPath();
        ctx.rect(0, wipeY, w, h - wipeY);
        ctx.clip();
        ctx.drawImage(this.deckB.offscreenCanvas, 0, 0, w, h);
        break;
      }

      case 'wipe-down': {
        const wipeH = h * blendRatio;
        ctx.beginPath();
        ctx.rect(0, 0, w, wipeH);
        ctx.clip();
        ctx.drawImage(this.deckB.offscreenCanvas, 0, 0, w, h);
        break;
      }

      case 'zoom': {
        // Deck B scales up from center
        const scale = 0.2 + blendRatio * 0.8;
        ctx.globalAlpha = blendRatio;
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.drawImage(this.deckB.offscreenCanvas, -w / 2, -h / 2, w, h);
        break;
      }

      case 'slide': {
        // Deck B slides in from right
        const offsetX = (1 - blendRatio) * w;
        ctx.drawImage(this.deckB.offscreenCanvas, offsetX, 0, w, h);
        break;
      }

      case 'cube': {
        // 3D pseudo perspective push
        const progress = blendRatio;
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        ctx.drawImage(this.deckA.offscreenCanvas, -progress * (w * 0.5), 0, w * (1 - progress * 0.2), h);
        ctx.restore();

        ctx.globalAlpha = progress;
        const bW = w * (0.8 + progress * 0.2);
        ctx.drawImage(this.deckB.offscreenCanvas, (1 - progress) * w * 0.5, 0, bW, h);
        break;
      }

      case 'beat-cut': {
        // Cut back and forth on beat if playing
        const beatPhase = this.audioEngine.deckA.state.beatPhase || 0;
        const showB = blendRatio > 0.5 ? (beatPhase > 0.5 ? true : blendRatio > 0.85) : (blendRatio > 0.15 && beatPhase > 0.6);
        ctx.globalAlpha = showB ? 1.0 : 0.0;
        ctx.drawImage(this.deckB.offscreenCanvas, 0, 0, w, h);
        break;
      }
    }
    ctx.restore();

    // PiP (Picture in Picture) Overlay
    if (this.pipPosition !== 'off') {
      const pipRect = calculatePiPRect(w, h, this.pipPosition, this.pipScale);
      if (pipRect) {
        ctx.save();
        // PiP Frame glow & border
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 3;
        ctx.strokeRect(pipRect.x, pipRect.y, pipRect.width, pipRect.height);

        // Clip PiP
        ctx.beginPath();
        ctx.rect(pipRect.x, pipRect.y, pipRect.width, pipRect.height);
        ctx.clip();

        // Draw incoming deck in PiP
        const pipSource = this.videoCrossfader <= 0 ? this.deckB.offscreenCanvas : this.deckA.offscreenCanvas;
        ctx.drawImage(pipSource, pipRect.x, pipRect.y, pipRect.width, pipRect.height);
        ctx.restore();
      }
    }

    // Distortion FX (Glitch, RGB Split, Pixelate, Mirror, Kaleidoscope)
    if (this.fx.glitch || this.fx.rgbSplit || this.fx.pixelate || this.fx.mirror !== 'off' || this.fx.kaleidoscope) {
      this.applyDistortionFX(ctx, w, h);
    }

    // DJ Text & Live On-Air Watermark Overlay
    this.renderOverlayBadge(ctx, w, h);

    ctx.restore();
  }

  private applyDistortionFX(ctx: CanvasRenderingContext2D, w: number, h: number) {
    try {
      // 1. Pixelate Effect
      if (this.fx.pixelate && this.fx.pixelSize > 1) {
        const size = this.fx.pixelSize;
        const smallCanvas = document.createElement('canvas');
        smallCanvas.width = Math.max(1, Math.floor(w / size));
        smallCanvas.height = Math.max(1, Math.floor(h / size));
        const smCtx = smallCanvas.getContext('2d');
        if (smCtx) {
          smCtx.drawImage(this.masterCanvas, 0, 0, smallCanvas.width, smallCanvas.height);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(smallCanvas, 0, 0, w, h);
          ctx.imageSmoothingEnabled = true;
        }
      }

      // 2. Glitch & RGB Split
      if (this.fx.glitch || this.fx.rgbSplit) {
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const split = this.fx.rgbSplit ? this.fx.rgbSplitAmount : 0;
        const isGlitching = this.fx.glitch && Math.random() < this.fx.glitchAmount;

        if (split > 0 || isGlitching) {
          const shift = split + (isGlitching ? Math.floor(Math.random() * 20 - 10) : 0);
          for (let y = 0; y < h; y++) {
            // Glitch slice
            const lineShift = isGlitching && y % 16 === 0 ? Math.floor(Math.random() * 30 - 15) : 0;
            for (let x = 0; x < w; x++) {
              const idx = (y * w + x) * 4;
              const rX = Math.min(w - 1, Math.max(0, x + shift + lineShift));
              const rIdx = (y * w + rX) * 4;
              data[idx] = data[rIdx]; // Shift Red channel
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }
      }

      // 3. Mirror Effect
      if (this.fx.mirror !== 'off') {
        if (this.fx.mirror === 'horizontal') {
          ctx.save();
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(this.masterCanvas, 0, 0, w / 2, h, 0, 0, w / 2, h);
          ctx.restore();
        } else if (this.fx.mirror === 'vertical') {
          ctx.save();
          ctx.translate(0, h);
          ctx.scale(1, -1);
          ctx.drawImage(this.masterCanvas, 0, 0, w, h / 2, 0, 0, w, h / 2);
          ctx.restore();
        }
      }

      // 4. Kaleidoscope Radial Effect
      if (this.fx.kaleidoscope) {
        ctx.save();
        ctx.translate(w / 2, h / 2);
        for (let i = 1; i < 6; i++) {
          ctx.rotate((Math.PI * 2) / 6);
          ctx.drawImage(this.masterCanvas, -w / 4, -h / 4, w / 2, h / 2);
        }
        ctx.restore();
      }
    } catch {
      // Fallback
    }
  }

  private renderOverlayBadge(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (!this.overlayText && !this.showLiveBadge) return;

    ctx.save();
    let x = 24;
    let y = 36;

    switch (this.textPosition) {
      case 'top-left':
        x = 24;
        y = 36;
        break;
      case 'top-right':
        x = w - 24;
        y = 36;
        break;
      case 'bottom-left':
        x = 24;
        y = h - 24;
        break;
      case 'bottom-right':
        x = w - 24;
        y = h - 24;
        break;
      case 'bottom-center':
      default:
        x = w / 2;
        y = h - 24;
        break;
    }

    ctx.font = '800 16px "Outfit", sans-serif';
    ctx.textAlign = this.textPosition.includes('right') ? 'right' : this.textPosition.includes('center') ? 'center' : 'left';

    // Shadow & glow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8;

    if (this.overlayText) {
      ctx.fillStyle = '#ffffff';
      ctx.fillText(this.overlayText, x, y);
    }

    if (this.showLiveBadge) {
      const badgeY = this.textPosition.startsWith('top') ? y + 22 : y - 24;
      const isRed = (Math.floor(Date.now() / 600) % 2 === 0);
      ctx.fillStyle = isRed ? '#ef4444' : '#f87171';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillText('● LIVE VJ MIX', x, badgeY);
    }

    ctx.restore();
  }

  // Set Recording (Combined Audio + Video into WebM)
  public startAVRecording(): boolean {
    if (!window.MediaRecorder) return false;
    this.recordedChunks = [];

    try {
      // Capture 30fps video stream from master canvas
      const videoStream = this.masterCanvas.captureStream(30);

      // Merge audio tracks from AudioEngine master destination
      const audioTracks = this.audioEngine.recordDestination.stream.getAudioTracks();
      for (const track of audioTracks) {
        videoStream.addTrack(track);
      }

      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      this.mediaRecorder = new MediaRecorder(videoStream, { mimeType });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(250);
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      return true;
    } catch (err) {
      console.error('Failed to start AV recording:', err);
      return false;
    }
  }

  public stopAVRecording(): Blob | null {
    if (!this.mediaRecorder || !this.isRecording) return null;
    this.mediaRecorder.stop();
    this.isRecording = false;

    const mime = this.mediaRecorder.mimeType || 'video/webm';
    const blob = new Blob(this.recordedChunks, { type: mime });
    return blob;
  }
}
