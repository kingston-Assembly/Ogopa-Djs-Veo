import React from 'react';
import { Power, Keyboard, Radio } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton.js';

interface HeaderProps {
  activeTab: 'mixer' | 'video' | 'crate' | 'sampler' | 'stems' | 'recorder';
  setActiveTab: (tab: 'mixer' | 'video' | 'crate' | 'sampler' | 'stems' | 'recorder') => void;
  isPoweredOn: boolean;
  onTogglePower: () => void;
  onOpenShortcuts: () => void;
  isRecording?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isPoweredOn,
  onTogglePower,
  onOpenShortcuts,
  isRecording,
}) => {
  return (
    <header className="flex items-center justify-between gap-2 sm:gap-4 md:gap-8 px-2.5 sm:px-4 py-2 bg-[#090b12] border-b border-slate-800/80 sticky top-0 z-40">
      {/* Zone 1: Brand Wordmark (Single text element) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <a
          href="/"
          className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:opacity-90"
        >
          <span className="text-cyan-400">OGOPA</span>
          <span className="text-rose-500">DJ’S</span>
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300 ml-1">
            VJ
          </span>
        </a>
        {isRecording && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-950/80 border border-rose-800 text-rose-400 text-[10px] font-bold animate-pulse">
            <Radio className="w-2.5 h-2.5" />
            <span>REC</span>
          </span>
        )}
      </div>

      {/* Zone 2: Navigation tabs */}
      <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none max-w-[55vw] sm:max-w-none" aria-label="Console Navigation">
        <button
          onClick={() => setActiveTab('mixer')}
          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'mixer'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Console
        </button>

        <button
          onClick={() => setActiveTab('video')}
          className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'video'
              ? 'bg-slate-800 text-cyan-400 border border-cyan-500/60 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Video VJ</span>
        </button>

        <button
          onClick={() => setActiveTab('crate')}
          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'crate'
              ? 'bg-slate-800 text-cyan-400 border border-cyan-800/60 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Crate Library
        </button>

        <button
          onClick={() => setActiveTab('sampler')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'sampler'
              ? 'bg-slate-800 text-amber-400 border border-amber-800/60 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Sampler
        </button>

        <button
          onClick={() => setActiveTab('stems')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'stems'
              ? 'bg-slate-800 text-purple-400 border border-purple-800/60 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Stems & FX
        </button>

        <button
          onClick={() => setActiveTab('recorder')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'recorder'
              ? 'bg-slate-800 text-rose-400 border border-rose-800/60 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Recorder
        </button>
      </nav>

      {/* Zone 3: Primary Action & Tools */}
      <div className="flex items-center gap-2 shrink-0">

        <button
          onClick={onOpenShortcuts}
          aria-label="View Keyboard Shortcuts"
          title="Keyboard Hotkeys (?)"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition active:scale-95"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        <PWAInstallButton />

        <button
          onClick={onTogglePower}
          aria-label={isPoweredOn ? 'Audio Engine Active' : 'Power On Audio Engine'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm active:scale-95 whitespace-nowrap shrink-0 ${
            isPoweredOn
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30'
              : 'bg-rose-600 text-white hover:bg-rose-500 animate-pulse'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          <span>{isPoweredOn ? 'Live' : 'Power On'}</span>
        </button>
      </div>
    </header>
  );
};
