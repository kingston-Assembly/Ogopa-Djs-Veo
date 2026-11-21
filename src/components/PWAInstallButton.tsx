import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall.js';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide the install button
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isInstallable && (
        <button
          onClick={install}
          aria-label="Install Ogopa DJ’s App"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-400 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/80 rounded-lg transition-all shadow-sm active:scale-95 whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
      )}

      {isIOS && (
        <>
          <button
            onClick={() => setShowIOSGuide(true)}
            aria-label="Install Ogopa DJ’s on iOS"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all active:scale-95 whitespace-nowrap shrink-0"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>Install on iOS</span>
          </button>

          {showIOSGuide && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ios-install-title"
            >
              <div className="w-full max-w-sm rounded-2xl bg-[#121520] border border-slate-800 p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 id="ios-install-title" className="text-base font-bold text-white">
                    Install Ogopa DJ’s on iPhone / iPad
                  </h3>
                  <button
                    onClick={() => setShowIOSGuide(false)}
                    aria-label="Close install instructions"
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 text-xs font-bold shrink-0">
                      1
                    </span>
                    <p>
                      Tap the <strong className="text-white">Share</strong> button in the Safari toolbar at the bottom of the screen.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 text-xs font-bold shrink-0">
                      2
                    </span>
                    <p>
                      Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 text-xs font-bold shrink-0">
                      3
                    </span>
                    <p>Launch from your home screen for 100% offline zero-latency club mixing!</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-6 w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition"
                >
                  Got It
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};
