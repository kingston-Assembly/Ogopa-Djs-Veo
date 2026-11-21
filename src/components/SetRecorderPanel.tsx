import React, { useState } from 'react';
import { Radio, Download, Disc, CheckCircle, Video, Music } from 'lucide-react';
import { AudioEngine } from '../audio/audioEngine.js';
import { VideoEngine } from '../video/videoEngine.js';
import { formatTime } from '../utils/audioMath.js';

interface SetRecorderPanelProps {
  engine: AudioEngine;
  videoEngine?: VideoEngine;
}

export const SetRecorderPanel: React.FC<SetRecorderPanelProps> = ({
  engine,
  videoEngine = VideoEngine.getInstance(),
}) => {
  const [recordMode, setRecordMode] = useState<'video' | 'audio'>('video');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const isRecording = recordMode === 'video' ? videoEngine.isRecording : engine.masterState.isRecording;
  const recordingDuration = recordMode === 'video' ? videoEngine.recordingDuration : engine.masterState.recordingDuration;

  const handleStartRecording = () => {
    setRecordedBlob(null);
    setDownloadUrl(null);
    if (recordMode === 'video') {
      videoEngine.startAVRecording();
    } else {
      engine.startRecording();
    }
  };

  const handleStopRecording = () => {
    let blob: Blob | null = null;
    if (recordMode === 'video') {
      blob = videoEngine.stopAVRecording();
    } else {
      blob = engine.stopRecording();
    }

    if (blob) {
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    }
  };

  return (
    <div className="flex flex-col bg-[#0a0d16] rounded-2xl border border-slate-800 p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Live Master Set Recorder</h3>
            <p className="text-xs text-slate-400">Capture your live mix with synchronized video + audio</p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-[#121626] p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => !isRecording && setRecordMode('video')}
            disabled={isRecording}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              recordMode === 'video'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Full A/V Mix (Video + Audio)</span>
          </button>

          <button
            onClick={() => !isRecording && setRecordMode('audio')}
            disabled={isRecording}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              recordMode === 'audio'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Audio Only</span>
          </button>
        </div>

        {isRecording && (
          <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-800 px-3 py-1 rounded-full text-rose-400 text-xs font-bold animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>RECORDING LIVE ({recordMode.toUpperCase()})</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center p-6 my-2 bg-[#090b14] rounded-xl border border-slate-800">
        {/* Time Elapsed */}
        <span className="text-3xl sm:text-4xl font-extrabold font-mono-numbers text-white tracking-wider my-2">
          {formatTime(recordingDuration)}
        </span>

        <p className="text-xs text-slate-400 mb-2">
          {recordMode === 'video'
            ? 'Capturing 1080p composited video stream + pristine 32-bit master audio bus'
            : 'Capturing master audio stream encoded with opus codec'}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-4">
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-900/30 transition active:scale-95"
            >
              <Radio className="w-4 h-4" />
              <span>Start {recordMode === 'video' ? 'Video + Audio' : 'Audio'} Recording</span>
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-bold text-sm shadow-lg transition active:scale-95"
            >
              <Disc className="w-4 h-4 text-rose-400 animate-spin" />
              <span>Stop & Finalize File</span>
            </button>
          )}

          {downloadUrl && (
            <a
              href={downloadUrl}
              download={`ogopa-djs-${recordMode}-set-${new Date().toISOString().slice(0, 10)}.webm`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 transition active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download {recordMode === 'video' ? 'Video (.webm)' : 'Audio (.webm)'}</span>
            </a>
          )}
        </div>

        {downloadUrl && (
          <div className="flex items-center gap-2 mt-4 text-xs text-emerald-400 font-medium">
            <CheckCircle className="w-4 h-4" />
            <span>Master file ready! Zero compression loss.</span>
          </div>
        )}
      </div>
    </div>
  );
};
