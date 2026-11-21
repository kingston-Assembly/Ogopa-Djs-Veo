import React, { useRef, useState, useEffect } from 'react';
import { DeckAudioChannel } from '../audio/audioEngine.js';

interface JogWheelProps {
  deckChannel: DeckAudioChannel;
  colorScheme: 'cyan' | 'magenta';
  size?: number;
}

export const JogWheel: React.FC<JogWheelProps> = ({ deckChannel, colorScheme, size = 180 }) => {
  const platterRef = useRef<HTMLDivElement | null>(null);
  const [angle, setAngle] = useState(0);
  const isDraggingRef = useRef(false);
  const lastAngleRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  const accentColor = colorScheme === 'cyan' ? '#00f2fe' : '#ff0844';
  const rimColor = colorScheme === 'cyan' ? 'border-cyan-500/40' : 'border-rose-500/40';
  const glowClass = colorScheme === 'cyan' ? 'glow-cyan' : 'glow-magenta';

  // Calculate angle between center and pointer
  const getAngle = (clientX: number, clientY: number) => {
    if (!platterRef.current) return 0;
    const rect = platterRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  };

  // Continuous platter rotation when track is playing
  useEffect(() => {
    let prevTime = performance.now();
    const updateRotation = (time: number) => {
      const dt = (time - prevTime) / 1000;
      prevTime = time;

      if (deckChannel.state.isPlaying && !isDraggingRef.current) {
        // Standard 33.3 RPM rotation = 200 degrees per second, scaled by playback rate
        const speed = (200 * (deckChannel.state.currentBpm / deckChannel.state.baseBpm)) * dt;
        setAngle((prev) => (prev + speed) % 360);
      }
      animFrameRef.current = requestAnimationFrame(updateRotation);
    };

    animFrameRef.current = requestAnimationFrame(updateRotation);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [deckChannel]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    lastAngleRef.current = getAngle(e.clientX, e.clientY);
    deckChannel.startScratch();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const currentAngle = getAngle(e.clientX, e.clientY);
    let delta = currentAngle - lastAngleRef.current;

    // Handle 180/-180 wrap
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    lastAngleRef.current = currentAngle;
    setAngle((prev) => (prev + delta) % 360);
    deckChannel.scratchMove(delta);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    isDraggingRef.current = false;
    deckChannel.stopScratch();
  };

  return (
    <div className="flex flex-col items-center justify-center select-none py-1">
      {/* Outer Platter Casing */}
      <div
        ref={platterRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`relative rounded-full bg-[#111420] border-4 ${rimColor} shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing touch-none transition-shadow ${
          deckChannel.state.isPlaying ? glowClass : ''
        }`}
      >
        {/* Vinyl Grooves Texture */}
        <div className="absolute inset-2 rounded-full border border-slate-700/40 pointer-events-none" />
        <div className="absolute inset-4 rounded-full border border-slate-700/30 pointer-events-none" />
        <div className="absolute inset-6 rounded-full border border-slate-700/20 pointer-events-none" />
        <div className="absolute inset-8 rounded-full border border-slate-800/60 pointer-events-none" />

        {/* Rotating Platter Face */}
        <div
          style={{ transform: `rotate(${angle}deg)` }}
          className="relative w-4/5 h-4/5 rounded-full bg-[#0a0d18] border border-slate-700 flex items-center justify-center shadow-inner"
        >
          {/* Vinyl Platter Indicator Marker (Strobe Line) */}
          <div
            style={{ backgroundColor: accentColor }}
            className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-6 rounded-full shadow-lg"
          />

          {/* Center Label Display */}
          <div className="w-14 h-14 rounded-full bg-[#151928] border-2 border-slate-600 flex flex-col items-center justify-center pointer-events-none shadow-md">
            <span
              style={{ color: accentColor }}
              className="text-xs font-black tracking-wider uppercase"
            >
              Deck {deckChannel.id}
            </span>
            <span className="text-[9px] font-mono-numbers text-slate-400">
              {deckChannel.state.isPlaying ? 'PLAY' : 'CUE'}
            </span>
          </div>
        </div>

        {/* Outer Nudge Buttons Ring (Left & Right Pitch Bend) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            deckChannel.nudge('down');
          }}
          aria-label={`Deck ${deckChannel.id} Nudge Backward`}
          title="Nudge -"
          className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center border border-slate-700 active:scale-90"
        >
          -
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deckChannel.nudge('up');
          }}
          aria-label={`Deck ${deckChannel.id} Nudge Forward`}
          title="Nudge +"
          className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center border border-slate-700 active:scale-90"
        >
          +
        </button>
      </div>

      <span className="text-[10px] text-slate-400 mt-1 font-medium">Touch or Drag to Scratch</span>
    </div>
  );
};
