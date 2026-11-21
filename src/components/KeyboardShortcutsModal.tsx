import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#111422] border border-slate-700/80 p-5 shadow-2xl text-slate-100 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-cyan-400" />
            <h3 id="shortcuts-modal-title" className="text-base font-bold text-white">
              Hardware Keyboard Mappings
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs">
          {/* Deck A */}
          <div className="bg-[#090b14] p-3 rounded-xl border border-cyan-900/50">
            <span className="font-bold text-cyan-400 block mb-2 uppercase tracking-wider">
              Deck A Controls
            </span>
            <ul className="space-y-1.5">
              <li className="flex justify-between">
                <span className="text-slate-400">Play / Pause</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-300">A</kbd>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">CUE</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-300">S</kbd>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">Nudge - / +</span>
                <span className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-300">Q</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-300">W</kbd>
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">Hot Cues 1-4</span>
                <span className="flex gap-1 font-mono text-cyan-300">
                  <kbd className="px-1 bg-slate-800 rounded">1</kbd>
                  <kbd className="px-1 bg-slate-800 rounded">2</kbd>
                  <kbd className="px-1 bg-slate-800 rounded">3</kbd>
                  <kbd className="px-1 bg-slate-800 rounded">4</kbd>
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">Echo (Beat FX)</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-300">E</kbd>
              </li>
            </ul>
          </div>

          {/* Deck B */}
          <div className="bg-[#090b14] p-3 rounded-xl border border-rose-900/50">
            <span className="font-bold text-rose-400 block mb-2 uppercase tracking-wider">
              Deck B Controls
            </span>
            <ul className="space-y-1.5">
              <li className="flex justify-between">
                <span className="text-slate-400">Play / Pause</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-rose-300">L</kbd>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">CUE</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-rose-300">K</kbd>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">Nudge - / +</span>
                <span className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-rose-300">O</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-rose-300">P</kbd>
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">Hot Cues 1-4</span>
                <span className="flex gap-1 font-mono text-rose-300">
                  <kbd className="px-1 bg-slate-800 rounded">7</kbd>
                  <kbd className="px-1 bg-slate-800 rounded">8</kbd>
                  <kbd className="px-1 bg-slate-800 rounded">9</kbd>
                  <kbd className="px-1 bg-slate-800 rounded">0</kbd>
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">Echo (Beat FX)</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-rose-300">I</kbd>
              </li>
            </ul>
          </div>

          {/* Mixer & Global */}
          <div className="col-span-1 sm:col-span-2 bg-[#090b14] p-3 rounded-xl border border-slate-800">
            <span className="font-bold text-amber-400 block mb-2 uppercase tracking-wider">
              Mixer, Video & Performance
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Crossfader Left (A)</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-white">Z</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Crossfader Center</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-white">X</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Crossfader Right (B)</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-white">C</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Smart Automix</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-white">Space</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Toggle Video VJ View</span>
                <kbd className="px-1.5 py-0.5 rounded bg-purple-900 border border-purple-600 font-mono text-purple-200">V</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Fullscreen Video</span>
                <kbd className="px-1.5 py-0.5 rounded bg-purple-900 border border-purple-600 font-mono text-purple-200">F</kbd>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition"
        >
          Close Shortcuts
        </button>
      </div>
    </div>
  );
};
