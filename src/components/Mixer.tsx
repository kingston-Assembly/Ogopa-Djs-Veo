import React, { useState } from 'react';
import { Headphones, Sparkles, SlidersHorizontal, Link2, Link2Off } from 'lucide-react';
import { AudioEngine } from '../audio/audioEngine.js';
import { VideoEngine } from '../video/videoEngine.js';
import { RotaryKnob } from './RotaryKnob.js';

interface MixerProps {
  engine: AudioEngine;
  videoEngine?: VideoEngine;
}

export const Mixer: React.FC<MixerProps> = ({ engine, videoEngine = VideoEngine.getInstance() }) => {
  const deckA = engine.deckA;
  const deckB = engine.deckB;
  const master = engine.masterState;
  const [isLinked, setIsLinked] = useState(videoEngine.linkAudioCrossfader);

  // Render LED Meter Bar (10 segments)
  const renderMeter = (level: number, color = 'emerald') => {
    const numSegments = 10;
    const activeSegments = Math.round(level * numSegments);

    return (
      <div className="flex flex-col-reverse gap-0.5 w-2 h-28 bg-[#090b14] p-0.5 rounded-sm border border-slate-800">
        {Array.from({ length: numSegments }).map((_, idx) => {
          const isLit = idx < activeSegments;
          const isRed = idx >= 8;
          const isYellow = idx >= 6 && idx < 8;

          let segColor = 'bg-slate-800';
          if (isLit) {
            segColor = isRed
              ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
              : isYellow
              ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
              : 'bg-emerald-500 shadow-sm shadow-emerald-500/50';
          }

          return <div key={idx} className={`w-full h-2 rounded-[1px] transition-colors ${segColor}`} />;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-[#0b0e1a] rounded-2xl border border-slate-800 p-3 md:p-4 shadow-2xl">
      {/* Mixer Top Section: Master, Booth & Dual Stereo VU */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80">
        {/* Booth Monitor */}
        <div className="flex flex-col items-center">
          <RotaryKnob
            label="Booth"
            value={0.8}
            min={0}
            max={1.5}
            step={0.05}
            defaultValue={0.8}
            size={36}
            color="#94a3b8"
            onChange={() => {}}
          />
        </div>

        {/* Master Stereo VU Level Meters */}
        <div className="flex flex-col items-center px-2">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Master VU
          </span>
          <div className="flex items-center gap-1">
            {renderMeter(master.vuL)}
            {renderMeter(master.vuR)}
          </div>
          <div className="flex justify-between w-full text-[8px] font-mono-numbers text-slate-400 mt-0.5 px-0.5">
            <span>L</span>
            <span>R</span>
          </div>
        </div>

        {/* Master Volume */}
        <div className="flex flex-col items-center">
          <RotaryKnob
            label="Master"
            value={master.volume}
            min={0}
            max={1.5}
            step={0.05}
            defaultValue={0.9}
            size={40}
            color="#f43f5e"
            onChange={(val) => engine.setMasterVolume(val)}
          />
        </div>
      </div>

      {/* 2 Channels Strip (CH 1 Deck A & CH 2 Deck B) */}
      <div className="grid grid-cols-2 gap-3 md:gap-6 my-1">
        {/* Channel 1: Deck A */}
        <div className="flex flex-col items-center bg-[#090b14] p-2.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-xs font-black text-cyan-400">CH 1</span>
            <button
              onClick={() => {
                deckA.state.pflCue = !deckA.state.pflCue;
              }}
              title="Headphone Cue (PFL)"
              className={`p-1 rounded text-xs transition ${
                deckA.state.pflCue
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Gain Trim */}
          <RotaryKnob
            label="Trim"
            value={deckA.state.gainTrim}
            min={0}
            max={2.0}
            step={0.05}
            defaultValue={1.0}
            size={36}
            color="#00f2fe"
            onChange={(val) => deckA.setGainTrim(val)}
          />

          {/* 3-Band EQ */}
          <div className="flex flex-col gap-1.5 my-1 w-full items-center">
            <RotaryKnob
              label="Hi"
              value={deckA.state.eqHigh}
              min={-40}
              max={6}
              defaultValue={0}
              unit="dB"
              size={38}
              color="#00f2fe"
              onChange={(val) => deckA.setEq('high', val)}
              onKillToggle={() => deckA.toggleKill('high')}
              isKilled={deckA.state.eqHighKill}
            />

            <RotaryKnob
              label="Mid"
              value={deckA.state.eqMid}
              min={-40}
              max={6}
              defaultValue={0}
              unit="dB"
              size={38}
              color="#00f2fe"
              onChange={(val) => deckA.setEq('mid', val)}
              onKillToggle={() => deckA.toggleKill('mid')}
              isKilled={deckA.state.eqMidKill}
            />

            <RotaryKnob
              label="Low"
              value={deckA.state.eqLow}
              min={-40}
              max={6}
              defaultValue={0}
              unit="dB"
              size={38}
              color="#00f2fe"
              onChange={(val) => deckA.setEq('low', val)}
              onKillToggle={() => deckA.toggleKill('low')}
              isKilled={deckA.state.eqLowKill}
            />
          </div>

          {/* Color Filter Knob */}
          <div className="my-1.5">
            <RotaryKnob
              label="Filter"
              value={Math.round(deckA.state.filter * 100)}
              min={0}
              max={100}
              defaultValue={50}
              size={42}
              color="#38bdf8"
              onChange={(val) => deckA.setFilter(val / 100)}
            />
          </div>

          {/* Channel Fader & Meter */}
          <div className="flex items-center justify-center gap-3 w-full my-2">
            {renderMeter(deckA.state.vuLevel)}
            <div className="h-28 flex items-center justify-center">
              <input
                type="range"
                min={0}
                max={1.0}
                step={0.01}
                value={deckA.state.volume}
                onChange={(e) => deckA.setVolume(parseFloat(e.target.value))}
                aria-label="Channel 1 Volume Fader"
                className="fader-vertical h-24"
              />
            </div>
          </div>
        </div>

        {/* Channel 2: Deck B */}
        <div className="flex flex-col items-center bg-[#090b14] p-2.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-xs font-black text-rose-400">CH 2</span>
            <button
              onClick={() => {
                deckB.state.pflCue = !deckB.state.pflCue;
              }}
              title="Headphone Cue (PFL)"
              className={`p-1 rounded text-xs transition ${
                deckB.state.pflCue
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Gain Trim */}
          <RotaryKnob
            label="Trim"
            value={deckB.state.gainTrim}
            min={0}
            max={2.0}
            step={0.05}
            defaultValue={1.0}
            size={36}
            color="#ff0844"
            onChange={(val) => deckB.setGainTrim(val)}
          />

          {/* 3-Band EQ */}
          <div className="flex flex-col gap-1.5 my-1 w-full items-center">
            <RotaryKnob
              label="Hi"
              value={deckB.state.eqHigh}
              min={-40}
              max={6}
              defaultValue={0}
              unit="dB"
              size={38}
              color="#ff0844"
              onChange={(val) => deckB.setEq('high', val)}
              onKillToggle={() => deckB.toggleKill('high')}
              isKilled={deckB.state.eqHighKill}
            />

            <RotaryKnob
              label="Mid"
              value={deckB.state.eqMid}
              min={-40}
              max={6}
              defaultValue={0}
              unit="dB"
              size={38}
              color="#ff0844"
              onChange={(val) => deckB.setEq('mid', val)}
              onKillToggle={() => deckB.toggleKill('mid')}
              isKilled={deckB.state.eqMidKill}
            />

            <RotaryKnob
              label="Low"
              value={deckB.state.eqLow}
              min={-40}
              max={6}
              defaultValue={0}
              unit="dB"
              size={38}
              color="#ff0844"
              onChange={(val) => deckB.setEq('low', val)}
              onKillToggle={() => deckB.toggleKill('low')}
              isKilled={deckB.state.eqLowKill}
            />
          </div>

          {/* Color Filter Knob */}
          <div className="my-1.5">
            <RotaryKnob
              label="Filter"
              value={Math.round(deckB.state.filter * 100)}
              min={0}
              max={100}
              defaultValue={50}
              size={42}
              color="#f43f5e"
              onChange={(val) => deckB.setFilter(val / 100)}
            />
          </div>

          {/* Channel Fader & Meter */}
          <div className="flex items-center justify-center gap-3 w-full my-2">
            {renderMeter(deckB.state.vuLevel)}
            <div className="h-28 flex items-center justify-center">
              <input
                type="range"
                min={0}
                max={1.0}
                step={0.01}
                value={deckB.state.volume}
                onChange={(e) => deckB.setVolume(parseFloat(e.target.value))}
                aria-label="Channel 2 Volume Fader"
                className="fader-vertical h-24"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Crossfader Section & Smart Automix */}
      <div className="mt-2 pt-2 border-t border-slate-800 bg-[#090b14] p-2.5 rounded-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 mb-2">
          {/* Curve Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400 font-bold uppercase mr-0.5">Curve</span>
            <button
              onClick={() => engine.setCrossfaderCurve('smooth')}
              className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition ${
                master.crossfaderCurve === 'smooth'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Smooth
            </button>
            <button
              onClick={() => engine.setCrossfaderCurve('scratch')}
              className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition ${
                master.crossfaderCurve === 'scratch'
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Scratch
            </button>

            {/* A/V Crossfader Link Toggle */}
            <button
              onClick={() => {
                const next = !isLinked;
                setIsLinked(next);
                videoEngine.linkAudioCrossfader = next;
              }}
              title="Link Audio Crossfader to Video Mixing"
              className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded transition ${
                isLinked ? 'bg-purple-600/30 border border-purple-500 text-purple-300' : 'bg-slate-800 text-slate-500'
              }`}
            >
              {isLinked ? <Link2 className="w-2.5 h-2.5" /> : <Link2Off className="w-2.5 h-2.5" />}
              <span>A/V Link</span>
            </button>
          </div>

          {/* Smart Automix Assist */}
          <button
            onClick={() => engine.triggerAutomix()}
            disabled={master.isAutomixing}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition active:scale-95 shadow whitespace-nowrap shrink-0 ${
              master.isAutomixing
                ? 'bg-purple-600 text-white animate-pulse'
                : 'bg-gradient-to-r from-cyan-500 to-rose-500 text-slate-950 hover:opacity-95'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{master.isAutomixing ? 'Mixing...' : 'Automix'}</span>
          </button>
        </div>

        {/* Automix Progress Indicator */}
        {master.isAutomixing && (
          <div className="w-full bg-slate-800 h-1.5 rounded-full mb-2 overflow-hidden">
            <div
              style={{ width: `${master.automixProgress * 100}%` }}
              className="h-full bg-gradient-to-r from-cyan-400 to-rose-500 transition-all duration-75"
            />
          </div>
        )}

        {/* Crossfader Track & Slider */}
        <div className="relative flex flex-col items-center">
          <div className="w-full flex items-center justify-between text-[10px] font-black px-1 mb-1">
            <span className="text-cyan-400">A</span>
            <button
              onClick={() => {
                engine.setCrossfader(0);
                if (videoEngine.linkAudioCrossfader) {
                  videoEngine.setVideoCrossfader(0);
                }
              }}
              title="Center Crossfader"
              className="text-slate-400 hover:text-white text-[9px] px-1 bg-slate-800 rounded"
            >
              CENTER
            </button>
            <span className="text-rose-400">B</span>
          </div>

          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={master.crossfader}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              engine.setCrossfader(val);
              if (videoEngine.linkAudioCrossfader) {
                videoEngine.setVideoCrossfader(val);
              }
            }}
            aria-label="Crossfader Slider"
            className="crossfader-slider w-full cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
