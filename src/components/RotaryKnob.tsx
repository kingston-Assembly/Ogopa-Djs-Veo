import React, { useRef, useState } from 'react';

interface RotaryKnobProps {
  label: string;
  value: number; // e.g. -40 to +6, or 0 to 1
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  color?: string;
  size?: number;
  onChange: (val: number) => void;
  onKillToggle?: () => void;
  isKilled?: boolean;
}

export const RotaryKnob: React.FC<RotaryKnobProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  defaultValue = 0,
  unit = '',
  color = '#00f2fe',
  size = 46,
  onChange,
  onKillToggle,
  isKilled = false,
}) => {
  const knobRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef(0);
  const startValRef = useRef(0);
  const isDraggingRef = useRef(false);

  // Normalize to angle: range -135deg to +135deg (total 270 deg)
  const norm = (value - min) / (max - min);
  const angle = -135 + norm * 270;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startValRef.current = value;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dy = startYRef.current - e.clientY; // upward is positive
    const sensitivity = (max - min) / 150;
    const newVal = Math.max(min, Math.min(max, startValRef.current + dy * sensitivity));
    const rounded = Math.round(newVal / step) * step;
    onChange(rounded);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    isDraggingRef.current = false;
  };

  const handleDoubleClick = () => {
    onChange(defaultValue);
  };

  return (
    <div className="flex flex-col items-center select-none py-1">
      {/* Knob Container */}
      <div className="relative flex items-center justify-center">
        <div
          ref={knobRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          style={{ width: `${size}px`, height: `${size}px` }}
          className={`relative rounded-full bg-[#131726] border-2 border-[#2b334d] flex items-center justify-center cursor-ns-resize shadow-md active:border-white transition-colors ${
            isKilled ? 'opacity-40 grayscale' : ''
          }`}
        >
          {/* Rotating Cap */}
          <div
            style={{ transform: `rotate(${angle}deg)` }}
            className="w-full h-full rounded-full flex items-center justify-center relative pointer-events-none"
          >
            {/* Indicator Marker Line */}
            <div
              style={{ backgroundColor: isKilled ? '#64748b' : color }}
              className="absolute top-1 w-1 h-3 rounded-full shadow"
            />
          </div>

          {/* Center Cap Dot */}
          <div className="absolute w-4 h-4 rounded-full bg-[#0a0d18] pointer-events-none border border-slate-700" />
        </div>

        {/* Optional Kill Switch Button overlay/attached */}
        {onKillToggle && (
          <button
            onClick={onKillToggle}
            aria-label={`Kill ${label}`}
            className={`absolute -top-1.5 -right-2 px-1 py-0.2 rounded text-[8px] font-black uppercase transition shadow ${
              isKilled
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            KILL
          </button>
        )}
      </div>

      {/* Label and Value */}
      <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mt-1">
        {label}
      </span>
      <span className="text-[9px] font-mono-numbers text-slate-400">
        {isKilled ? 'CUT' : `${value > 0 ? `+${value}` : value}${unit}`}
      </span>
    </div>
  );
};
