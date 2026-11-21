import React, { useState } from 'react';
import { Volume2, Music2 } from 'lucide-react';
import { SamplerEngine, SAMPLE_PADS } from '../audio/sampler.js';

interface SamplerPanelProps {
  sampler: SamplerEngine;
}

export const SamplerPanel: React.FC<SamplerPanelProps> = ({ sampler }) => {
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(0.85);
  const [activePad, setActivePad] = useState<number | null>(null);

  const handleTrigger = (id: number) => {
    setActivePad(id);
    sampler.triggerPad(id, pitch);
    setTimeout(() => setActivePad(null), 180);
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    sampler.setVolume(v);
  };

  return (
    <div className="flex flex-col bg-[#0a0d16] rounded-2xl border border-slate-800 p-4 shadow-xl">
      {/* Sampler Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <Music2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Club Sampler Console</h3>
            <p className="text-xs text-slate-400">8 Real-time synthesized drops & hype FX</p>
          </div>
        </div>

        {/* Global Pitch & Volume Sliders */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Pitch</span>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              aria-label="Sampler Global Pitch"
              className="w-20 accent-amber-500 cursor-pointer"
            />
            <button
              onClick={() => setPitch(1.0)}
              className="text-[10px] text-slate-400 hover:text-white px-1 rounded bg-slate-800"
            >
              Reset
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              aria-label="Sampler Output Volume"
              className="w-20 accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 8 Performance Trigger Pads Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3">
        {SAMPLE_PADS.map((pad) => {
          const isTriggered = activePad === pad.id;

          return (
            <button
              key={pad.id}
              onClick={() => handleTrigger(pad.id)}
              aria-label={`Trigger Sample ${pad.name}`}
              style={{
                borderColor: isTriggered ? '#ffffff' : `${pad.color}50`,
                backgroundColor: isTriggered ? pad.color : '#131626',
                boxShadow: isTriggered ? `0 0 20px ${pad.color}` : 'none',
              }}
              className={`flex flex-col items-center justify-center h-20 rounded-xl border-2 transition-all duration-75 active:scale-95 select-none ${
                isTriggered ? 'text-slate-950 font-black' : 'text-slate-200 hover:bg-[#181c30]'
              }`}
            >
              <div className="flex items-center justify-between w-full px-2.5 text-[10px] font-mono-numbers opacity-80">
                <span>PAD {pad.id}</span>
                <span className="text-[9px] uppercase tracking-wider">{pad.category}</span>
              </div>
              <span className="text-sm font-bold mt-1 text-center px-1 truncate w-full">
                {pad.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
