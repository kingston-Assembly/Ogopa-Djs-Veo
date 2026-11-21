import React, { useState } from 'react';
import { Layers, Activity, VolumeX, Sparkles } from 'lucide-react';
import { AudioEngine } from '../audio/audioEngine.js';

interface StemsAndFxPanelProps {
  engine: AudioEngine;
}

export const StemsAndFxPanel: React.FC<StemsAndFxPanelProps> = ({ engine }) => {
  const [selectedDeck, setSelectedDeck] = useState<'A' | 'B'>('A');
  const deck = selectedDeck === 'A' ? engine.deckA : engine.deckB;
  const isCyan = selectedDeck === 'A';

  return (
    <div className="flex flex-col bg-[#0a0d16] rounded-2xl border border-slate-800 p-4 shadow-xl">
      {/* Panel Header & Deck Selector */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">4-Stem Matrix & Performance FX</h3>
            <p className="text-xs text-slate-400">Real-time stem isolation and quantized effects</p>
          </div>
        </div>

        {/* Deck A / Deck B Tab Toggle */}
        <div className="flex items-center gap-1 bg-[#121626] p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setSelectedDeck('A')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              selectedDeck === 'A' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Deck A
          </button>
          <button
            onClick={() => setSelectedDeck('B')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              selectedDeck === 'B' ? 'bg-rose-500 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Deck B
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        {/* 1. 4-Stem Matrix */}
        <div className="flex flex-col bg-[#111422] p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Stem Separation (Deck {selectedDeck})
              </h4>
            </div>
            <button
              onClick={() => {
                deck.setStemVolume('vocals', 1.0);
                deck.setStemVolume('drums', 1.0);
                deck.setStemVolume('bass', 1.0);
                deck.setStemVolume('melody', 1.0);
              }}
              className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
            >
              Reset All
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 my-1">
            {/* Vocals */}
            <div className="flex flex-col items-center bg-[#090b14] p-2 rounded-lg border border-slate-800">
              <span className="text-xs font-bold text-cyan-400 mb-1">Vocals</span>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.05}
                value={deck.state.stemVocals}
                onChange={(e) => deck.setStemVolume('vocals', parseFloat(e.target.value))}
                aria-label={`Deck ${selectedDeck} Vocals Fader`}
                className="fader-vertical h-24 my-1"
              />
              <button
                onClick={() => deck.toggleStemMute('vocals')}
                className={`mt-1 px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  deck.state.stemVocalsMute ? 'bg-rose-900 text-rose-300' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {deck.state.stemVocalsMute ? 'Muted' : 'Mute'}
              </button>
            </div>

            {/* Drums */}
            <div className="flex flex-col items-center bg-[#090b14] p-2 rounded-lg border border-slate-800">
              <span className="text-xs font-bold text-amber-400 mb-1">Drums</span>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.05}
                value={deck.state.stemDrums}
                onChange={(e) => deck.setStemVolume('drums', parseFloat(e.target.value))}
                aria-label={`Deck ${selectedDeck} Drums Fader`}
                className="fader-vertical h-24 my-1"
              />
              <button
                onClick={() => deck.toggleStemMute('drums')}
                className={`mt-1 px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  deck.state.stemDrumsMute ? 'bg-rose-900 text-rose-300' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {deck.state.stemDrumsMute ? 'Muted' : 'Mute'}
              </button>
            </div>

            {/* Bass */}
            <div className="flex flex-col items-center bg-[#090b14] p-2 rounded-lg border border-slate-800">
              <span className="text-xs font-bold text-rose-400 mb-1">Bass</span>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.05}
                value={deck.state.stemBass}
                onChange={(e) => deck.setStemVolume('bass', parseFloat(e.target.value))}
                aria-label={`Deck ${selectedDeck} Bass Fader`}
                className="fader-vertical h-24 my-1"
              />
              <button
                onClick={() => deck.toggleStemMute('bass')}
                className={`mt-1 px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  deck.state.stemBassMute ? 'bg-rose-900 text-rose-300' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {deck.state.stemBassMute ? 'Muted' : 'Mute'}
              </button>
            </div>

            {/* Melody */}
            <div className="flex flex-col items-center bg-[#090b14] p-2 rounded-lg border border-slate-800">
              <span className="text-xs font-bold text-purple-400 mb-1">Melody</span>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.05}
                value={deck.state.stemMelody}
                onChange={(e) => deck.setStemVolume('melody', parseFloat(e.target.value))}
                aria-label={`Deck ${selectedDeck} Melody Fader`}
                className="fader-vertical h-24 my-1"
              />
              <button
                onClick={() => deck.toggleStemMute('melody')}
                className={`mt-1 px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  deck.state.stemMelodyMute ? 'bg-rose-900 text-rose-300' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {deck.state.stemMelodyMute ? 'Muted' : 'Mute'}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Beat-Synchronized Performance FX */}
        <div className="flex flex-col bg-[#111422] p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Quantized Beat FX (Deck {selectedDeck})
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2 my-1">
            {/* Echo / Delay */}
            <div className="flex flex-col bg-[#090b14] p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Echo</span>
                  <kbd
                    title={`Keyboard Shortcut: Press ${selectedDeck === 'A' ? 'E' : 'I'} to toggle Echo on Deck ${selectedDeck}`}
                    className="px-1 py-0.2 rounded bg-slate-800 text-[9px] font-mono font-bold text-slate-400 border border-slate-700"
                  >
                    {selectedDeck === 'A' ? 'E' : 'I'}
                  </kbd>
                </div>
                <button
                  onClick={() => deck.toggleEcho(deck.state.fxEchoBeats)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    deck.state.fxEchoActive
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {deck.state.fxEchoActive ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center gap-1 mt-auto">
                {[0.25, 0.5, 1].map((beats) => (
                  <button
                    key={beats}
                    onClick={() => deck.toggleEcho(beats)}
                    className={`flex-1 py-1 rounded text-[10px] font-mono-numbers font-bold transition ${
                      deck.state.fxEchoBeats === beats && deck.state.fxEchoActive
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800/80 text-slate-400'
                    }`}
                  >
                    {beats === 0.25 ? '1/4' : beats === 0.5 ? '1/2' : '1'}
                  </button>
                ))}
              </div>
            </div>

            {/* Club Reverb */}
            <div className="flex flex-col bg-[#090b14] p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white">Club Space</span>
                <button
                  onClick={() => deck.toggleReverb()}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    deck.state.fxReverbActive
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {deck.state.fxReverbActive ? 'ON' : 'OFF'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-auto">Algorithmic arena reverb impulse</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
