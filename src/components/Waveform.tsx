import React, { useRef, useEffect } from 'react';
import { DeckState } from '../audio/audioEngine.js';

interface WaveformProps {
  deck: DeckState;
  colorScheme: 'cyan' | 'magenta';
  onSeek: (time: number) => void;
}

export const Waveform: React.FC<WaveformProps> = ({ deck, colorScheme, onSeek }) => {
  const overviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const zoomedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const primaryColor = colorScheme === 'cyan' ? '#00f2fe' : '#ff0844';
  const midColor = colorScheme === 'cyan' ? '#38bdf8' : '#f43f5e';
  const bassColor = colorScheme === 'cyan' ? '#0284c7' : '#be123c';

  // 1. Draw Overview Waveform Strip
  useEffect(() => {
    const canvas = overviewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#0d101b';
    ctx.fillRect(0, 0, width, height);

    // Waveform Peaks
    const peaks = deck.track?.waveformPeaks || [];
    if (peaks.length > 0) {
      const barWidth = width / peaks.length;
      for (let i = 0; i < peaks.length; i++) {
        const peak = peaks[i];
        const barHeight = peak * (height * 0.85);
        const y = (height - barHeight) / 2;

        ctx.fillStyle = i % 4 === 0 ? primaryColor : midColor;
        ctx.fillRect(i * barWidth, y, Math.max(1, barWidth - 0.5), barHeight);
      }
    } else {
      // Dummy flat line
      ctx.strokeStyle = '#1e2438';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }

    // Active Loop Region
    if (deck.loopActive && deck.loopIn !== null && deck.loopOut !== null && deck.duration > 0) {
      const inX = (deck.loopIn / deck.duration) * width;
      const outX = (deck.loopOut / deck.duration) * width;
      ctx.fillStyle = 'rgba(234, 179, 8, 0.35)';
      ctx.fillRect(inX, 0, Math.max(2, outX - inX), height);
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1;
      ctx.strokeRect(inX, 0, Math.max(2, outX - inX), height);
    }

    // Hot Cue Markers
    deck.hotCues.forEach((cue) => {
      if (deck.duration > 0) {
        const cueX = (cue.time / deck.duration) * width;
        ctx.fillStyle = cue.color;
        ctx.beginPath();
        ctx.moveTo(cueX, 0);
        ctx.lineTo(cueX + 4, 6);
        ctx.lineTo(cueX - 4, 6);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = cue.color;
        ctx.beginPath();
        ctx.moveTo(cueX, 6);
        ctx.lineTo(cueX, height);
        ctx.stroke();
      }
    });

    // Playhead Needle
    if (deck.duration > 0) {
      const playheadX = (deck.currentTime / deck.duration) * width;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(playheadX - 1, 0, 2, height);
      // Small diamond
      ctx.beginPath();
      ctx.arc(playheadX, height / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [deck.track, deck.currentTime, deck.duration, deck.loopActive, deck.loopIn, deck.loopOut, deck.hotCues, primaryColor, midColor]);

  // 2. Draw Zoomed Scrolling Waveform with Beatgrid
  useEffect(() => {
    const canvas = zoomedCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(0, 0, width, height);

    const centerPlayhead = width / 2;
    const pixelsPerSecond = 70; // Zoom level

    // Draw Beatgrid lines
    if (deck.currentBpm > 0) {
      const beatInterval = 60 / deck.currentBpm;
      const startVisibleTime = deck.currentTime - centerPlayhead / pixelsPerSecond;
      const endVisibleTime = deck.currentTime + centerPlayhead / pixelsPerSecond;

      const firstBeatIndex = Math.floor(startVisibleTime / beatInterval);
      const lastBeatIndex = Math.ceil(endVisibleTime / beatInterval);

      for (let b = firstBeatIndex; b <= lastBeatIndex; b++) {
        const beatTime = b * beatInterval;
        const x = centerPlayhead + (beatTime - deck.currentTime) * pixelsPerSecond;
        const isBar = b % 4 === 0;

        ctx.strokeStyle = isBar ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = isBar ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        if (isBar && x > 20 && x < width - 20) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.font = '9px monospace';
          ctx.fillText(`${b / 4 + 1}`, x + 3, 10);
        }
      }
    }

    // Draw Zoomed Waveform Bars
    const peaks = deck.track?.waveformPeaks || [];
    if (peaks.length > 0 && deck.duration > 0) {
      const startVisibleTime = deck.currentTime - centerPlayhead / pixelsPerSecond;
      const endVisibleTime = deck.currentTime + centerPlayhead / pixelsPerSecond;

      const startIndex = Math.max(0, Math.floor((startVisibleTime / deck.duration) * peaks.length));
      const endIndex = Math.min(peaks.length - 1, Math.ceil((endVisibleTime / deck.duration) * peaks.length));

      for (let i = startIndex; i <= endIndex; i++) {
        const peakTime = (i / peaks.length) * deck.duration;
        const x = centerPlayhead + (peakTime - deck.currentTime) * pixelsPerSecond;
        const peak = peaks[i];
        const barH = peak * (height * 0.88);
        const y = (height - barH) / 2;

        // Tri-color frequency distribution
        ctx.fillStyle = i % 4 === 0 ? bassColor : i % 2 === 0 ? midColor : primaryColor;
        ctx.fillRect(x - 1, y, 2, barH);
      }
    }

    // Active Loop boundary highlights in zoomed view
    if (deck.loopActive && deck.loopIn !== null && deck.loopOut !== null) {
      const inX = centerPlayhead + (deck.loopIn - deck.currentTime) * pixelsPerSecond;
      const outX = centerPlayhead + (deck.loopOut - deck.currentTime) * pixelsPerSecond;

      ctx.fillStyle = 'rgba(234, 179, 8, 0.2)';
      ctx.fillRect(inX, 0, outX - inX, height);
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.strokeRect(inX, 0, outX - inX, height);
    }

    // Center Playhead Needle
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerPlayhead, 0);
    ctx.lineTo(centerPlayhead, height);
    ctx.stroke();

    // Cue needle marker
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.moveTo(centerPlayhead - 6, 0);
    ctx.lineTo(centerPlayhead + 6, 0);
    ctx.lineTo(centerPlayhead, 8);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(centerPlayhead - 6, height);
    ctx.lineTo(centerPlayhead + 6, height);
    ctx.lineTo(centerPlayhead, height - 8);
    ctx.closePath();
    ctx.fill();
  }, [deck.track, deck.currentTime, deck.duration, deck.currentBpm, deck.loopActive, deck.loopIn, deck.loopOut, primaryColor, midColor, bassColor]);

  // Click on overview strip to seek
  const handleOverviewClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overviewCanvasRef.current;
    if (!canvas || deck.duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * deck.duration);
  };

  return (
    <div className="flex flex-col gap-1 w-full bg-[#0a0c14] p-1.5 rounded-xl border border-slate-800/80">
      {/* Zoomed scrolling waveform */}
      <div className="relative w-full h-20 sm:h-24 overflow-hidden rounded-lg">
        <canvas
          ref={zoomedCanvasRef}
          width={700}
          height={96}
          className="w-full h-full block cursor-ew-resize"
        />
        {/* BPM and Beatgrid Indicator */}
        <div className="absolute top-1.5 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-[10px] font-mono-numbers text-slate-300 pointer-events-none">
          <span className="font-bold text-white">{deck.currentBpm.toFixed(1)}</span>
          <span className="text-slate-500">BPM</span>
        </div>
      </div>

      {/* Mini Overview Strip with scrub seek */}
      <div className="relative w-full h-6 rounded-md overflow-hidden cursor-pointer">
        <canvas
          ref={overviewCanvasRef}
          width={700}
          height={24}
          onClick={handleOverviewClick}
          className="w-full h-full block"
        />
      </div>
    </div>
  );
};
