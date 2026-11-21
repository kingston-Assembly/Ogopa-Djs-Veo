import React from 'react';
import { Disc3, Zap, ShieldCheck } from 'lucide-react';

interface PowerOverlayProps {
  onPowerOn: () => void;
}

export const PowerOverlay: React.FC<PowerOverlayProps> = ({ onPowerOn }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090f]/90 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#0f121e] border border-cyan-500/30 p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Animated Brand Emblem */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-transparent to-rose-500/20 border border-slate-700 flex items-center justify-center mb-5 shadow-inner">
          <Disc3 className="w-10 h-10 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
        </div>

        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          OGOPA <span className="text-cyan-400">DJ’S</span>
        </h1>
        <p className="text-sm font-semibold text-rose-400 mt-0.5">
          “Your Pocket Club. No Internet. No Limits.”
        </p>

        <p className="text-xs text-slate-400 max-w-xs mt-3 leading-relaxed">
          Zero-latency dual-deck DJ console powered by Web Audio API & offline stem processing.
        </p>

        {/* Big tactile Power On Button */}
        <button
          onClick={onPowerOn}
          className="mt-6 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-rose-500 hover:from-cyan-400 hover:to-rose-400 text-slate-950 font-black text-sm tracking-wide uppercase shadow-lg shadow-cyan-500/25 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>Tap to Power On Console</span>
        </button>

        {/* Offline & Audio Guarantee */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-4">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>100% Client-Side DSP · Zero Latency</span>
        </div>
      </div>
    </div>
  );
};
