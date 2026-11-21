/**
 * Ogopa DJ's Central Web Audio Engine
 * Real-time zero-latency dual deck mixing console, 4-stem DSP, FX, and set recording.
 */

import { calculateCrossfaderGains, pitchToPlaybackRate, beatsToSeconds, calculateQuantizedEchoDelay } from '../utils/audioMath.js';
import { DJTrack } from '../utils/crateLogic.js';
import { SamplerEngine } from './sampler.js';
import { synthesizeDemoTrack } from './demoTracks.js';

export interface HotCue {
  id: number;
  time: number;
  label: string;
  color: string;
}

export interface DeckState {
  id: 'A' | 'B';
  track: DJTrack | null;
  isPlaying: boolean;
  isCueing: boolean;
  currentTime: number;
  duration: number;
  baseBpm: number;
  currentBpm: number;
  pitchPercent: number; // e.g. -8 to +8
  pitchRange: 8 | 16 | 50;
  keyLock: boolean;
  gainTrim: number;     // 0 to 2.0 (1.0 default)
  volume: number;       // 0 to 1.0 (channel fader)
  eqHigh: number;       // -40 to +6 dB (0 default)
  eqMid: number;        // -40 to +6 dB
  eqLow: number;        // -40 to +6 dB
  eqHighKill: boolean;
  eqMidKill: boolean;
  eqLowKill: boolean;
  filter: number;       // 0.0 to 1.0 (0.5 center neutral)
  pflCue: boolean;      // Headphone Cue
  loopActive: boolean;
  loopIn: number | null;
  loopOut: number | null;
  loopBeats: number;    // e.g. 4
  hotCues: HotCue[];
  // Stems (0.0 to 1.0)
  stemVocals: number;
  stemDrums: number;
  stemBass: number;
  stemMelody: number;
  stemVocalsMute: boolean;
  stemDrumsMute: boolean;
  stemBassMute: boolean;
  stemMelodyMute: boolean;
  // Active FX
  fxEchoActive: boolean;
  fxEchoBeats: number;  // 0.5, 1, 2
  fxReverbActive: boolean;
  fxFlangerActive: boolean;
  fxRollActive: boolean;
  fxRollBeats: number;  // 0.25, 0.5
  // Real-time meters
  vuLevel: number;      // 0 to 1.0
  beatPhase: number;    // 0 to 1.0
}

export type MasterState = {
  volume: number;
  crossfader: number;    // -1 (A) to +1 (B)
  crossfaderCurve: 'smooth' | 'scratch';
  isRecording: boolean;
  recordingDuration: number;
  vuL: number;
  vuR: number;
  isAutomixing: boolean;
  automixProgress: number; // 0 to 1.0
};

export class DeckAudioChannel {
  public id: 'A' | 'B';
  private ctx: AudioContext;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private startTime = 0;
  private pausedAt = 0;
  private cuePoint = 0;

  // Nodes
  private inputGain: GainNode;
  // Stems DSP
  private bassFilter: BiquadFilterNode;
  private bassGain: GainNode;
  private drumsFilter: BiquadFilterNode;
  private drumsGain: GainNode;
  private vocalFilter: BiquadFilterNode;
  private vocalGain: GainNode;
  private melodyFilter: BiquadFilterNode;
  private melodyGain: GainNode;
  private stemsSumGain: GainNode;

  // 3-Band EQ
  private eqLowNode: BiquadFilterNode;
  private eqMidNode: BiquadFilterNode;
  private eqHighNode: BiquadFilterNode;

  // Color Filter
  private lpfNode: BiquadFilterNode;
  private hpfNode: BiquadFilterNode;

  // FX Nodes
  private echoDelayNode: DelayNode;
  private echoFeedbackNode: GainNode;
  private echoWetNode: GainNode;
  private reverbConvolver: ConvolverNode;
  private reverbWetNode: GainNode;

  // Channel Trim & Volume
  private channelTrimGain: GainNode;
  private channelVolumeGain: GainNode;
  private analyser: AnalyserNode;

  // Destination node (connected to crossfader)
  public outputNode: GainNode;

  // Platter scratch simulation state
  private isScratching = false;
  private scratchVelocity = 1.0;

  public state: DeckState;

  constructor(id: 'A' | 'B', ctx: AudioContext, masterCrossfaderInput: GainNode) {
    this.id = id;
    this.ctx = ctx;

    this.state = {
      id,
      track: null,
      isPlaying: false,
      isCueing: false,
      currentTime: 0,
      duration: 0,
      baseBpm: 124,
      currentBpm: 124,
      pitchPercent: 0,
      pitchRange: 8,
      keyLock: true,
      gainTrim: 1.0,
      volume: 0.9,
      eqHigh: 0,
      eqMid: 0,
      eqLow: 0,
      eqHighKill: false,
      eqMidKill: false,
      eqLowKill: false,
      filter: 0.5,
      pflCue: false,
      loopActive: false,
      loopIn: null,
      loopOut: null,
      loopBeats: 4,
      hotCues: [],
      stemVocals: 1.0,
      stemDrums: 1.0,
      stemBass: 1.0,
      stemMelody: 1.0,
      stemVocalsMute: false,
      stemDrumsMute: false,
      stemBassMute: false,
      stemMelodyMute: false,
      fxEchoActive: false,
      fxEchoBeats: 0.5,
      fxReverbActive: false,
      fxFlangerActive: false,
      fxRollActive: false,
      fxRollBeats: 0.25,
      vuLevel: 0,
      beatPhase: 0,
    };

    // 1. Input Gain
    this.inputGain = this.ctx.createGain();

    // 2. 4-Stem DSP Network
    // Bass Stem (< 220Hz Lowpass)
    this.bassFilter = this.ctx.createBiquadFilter();
    this.bassFilter.type = 'lowpass';
    this.bassFilter.frequency.value = 220;
    this.bassFilter.Q.value = 1.0;
    this.bassGain = this.ctx.createGain();
    this.inputGain.connect(this.bassFilter);
    this.bassFilter.connect(this.bassGain);

    // Drums Stem (Highpass 60Hz + Peaking snap 2500Hz)
    this.drumsFilter = this.ctx.createBiquadFilter();
    this.drumsFilter.type = 'peaking';
    this.drumsFilter.frequency.value = 2500;
    this.drumsFilter.Q.value = 1.2;
    this.drumsFilter.gain.value = 3.0;
    this.drumsGain = this.ctx.createGain();
    this.inputGain.connect(this.drumsFilter);
    this.drumsFilter.connect(this.drumsGain);

    // Vocals Stem (Bandpass 300Hz - 4200Hz center vocal range)
    this.vocalFilter = this.ctx.createBiquadFilter();
    this.vocalFilter.type = 'bandpass';
    this.vocalFilter.frequency.value = 1600;
    this.vocalFilter.Q.value = 0.8;
    this.vocalGain = this.ctx.createGain();
    this.inputGain.connect(this.vocalFilter);
    this.vocalFilter.connect(this.vocalGain);

    // Melody Stem (Highpass > 1200Hz)
    this.melodyFilter = this.ctx.createBiquadFilter();
    this.melodyFilter.type = 'highpass';
    this.melodyFilter.frequency.value = 1200;
    this.melodyFilter.Q.value = 0.7;
    this.melodyGain = this.ctx.createGain();
    this.inputGain.connect(this.melodyFilter);
    this.melodyFilter.connect(this.melodyGain);

    // Stems Summing
    this.stemsSumGain = this.ctx.createGain();
    this.bassGain.connect(this.stemsSumGain);
    this.drumsGain.connect(this.stemsSumGain);
    this.vocalGain.connect(this.stemsSumGain);
    this.melodyGain.connect(this.stemsSumGain);

    // 3. 3-Band Hardware Equalizer
    this.eqLowNode = this.ctx.createBiquadFilter();
    this.eqLowNode.type = 'lowshelf';
    this.eqLowNode.frequency.value = 250;
    this.eqLowNode.gain.value = 0;

    this.eqMidNode = this.ctx.createBiquadFilter();
    this.eqMidNode.type = 'peaking';
    this.eqMidNode.frequency.value = 1000;
    this.eqMidNode.Q.value = 1.0;
    this.eqMidNode.gain.value = 0;

    this.eqHighNode = this.ctx.createBiquadFilter();
    this.eqHighNode.type = 'highshelf';
    this.eqHighNode.frequency.value = 4000;
    this.eqHighNode.gain.value = 0;

    this.stemsSumGain.connect(this.eqLowNode);
    this.eqLowNode.connect(this.eqMidNode);
    this.eqMidNode.connect(this.eqHighNode);

    // 4. Color Filter (Bi-directional HPF/LPF)
    this.lpfNode = this.ctx.createBiquadFilter();
    this.lpfNode.type = 'lowpass';
    this.lpfNode.frequency.value = 20000;
    this.lpfNode.Q.value = 1.0;

    this.hpfNode = this.ctx.createBiquadFilter();
    this.hpfNode.type = 'highpass';
    this.hpfNode.frequency.value = 20;
    this.hpfNode.Q.value = 1.0;

    this.eqHighNode.connect(this.lpfNode);
    this.lpfNode.connect(this.hpfNode);

    // 5. FX Chain
    // Echo / Delay
    this.echoDelayNode = this.ctx.createDelay();
    this.echoDelayNode.delayTime.value = 0.25;
    this.echoFeedbackNode = this.ctx.createGain();
    this.echoFeedbackNode.gain.value = 0.45;
    this.echoWetNode = this.ctx.createGain();
    this.echoWetNode.gain.value = 0;

    this.hpfNode.connect(this.echoDelayNode);
    this.echoDelayNode.connect(this.echoFeedbackNode);
    this.echoFeedbackNode.connect(this.echoDelayNode);
    this.echoDelayNode.connect(this.echoWetNode);

    // Reverb Convolver (algorithmic impulse)
    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbConvolver.buffer = this.createImpulseResponse(1.5, 2.0);
    this.reverbWetNode = this.ctx.createGain();
    this.reverbWetNode.gain.value = 0;

    this.hpfNode.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbWetNode);

    // 6. Channel Trim, Volume, Analyser, and Output
    this.channelTrimGain = this.ctx.createGain();
    this.channelTrimGain.gain.value = 1.0;

    this.channelVolumeGain = this.ctx.createGain();
    this.channelVolumeGain.gain.value = 0.9;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;

    this.outputNode = this.ctx.createGain();

    // Sum Dry + Wet FX
    this.hpfNode.connect(this.channelTrimGain);
    this.echoWetNode.connect(this.channelTrimGain);
    this.reverbWetNode.connect(this.channelTrimGain);

    this.channelTrimGain.connect(this.channelVolumeGain);
    this.channelVolumeGain.connect(this.analyser);
    this.channelVolumeGain.connect(this.outputNode);

    // Connect to crossfader
    this.outputNode.connect(masterCrossfaderInput);
  }

  private createImpulseResponse(duration: number, decay: number): AudioBuffer {
    const rate = this.ctx.sampleRate;
    const len = rate * duration;
    const impulse = this.ctx.createBuffer(2, len, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < len; i++) {
      const n = i / len;
      left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
      right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
    }
    return impulse;
  }

  public loadTrack(track: DJTrack, buffer: AudioBuffer) {
    this.stop();
    this.buffer = buffer;
    this.state.track = track;
    this.state.duration = buffer.duration;
    this.state.baseBpm = track.bpm;
    this.state.currentBpm = track.bpm * pitchToPlaybackRate(this.state.pitchPercent);
    this.state.currentTime = 0;
    this.pausedAt = 0;
    this.cuePoint = 0;
    this.state.hotCues = [
      { id: 1, time: 0, label: 'Drop 1', color: '#00f2fe' },
      { id: 2, time: Math.min(buffer.duration * 0.25, 16), label: 'Break', color: '#ff0844' },
      { id: 3, time: Math.min(buffer.duration * 0.5, 32), label: 'Chorus', color: '#eab308' },
      { id: 4, time: Math.min(buffer.duration * 0.75, 48), label: 'Outro', color: '#a855f7' },
    ];
  }

  public play(fromTime?: number) {
    if (!this.buffer) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.stop();

    const offset = fromTime !== undefined ? fromTime : this.pausedAt;
    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.buffer;

    // Set playback rate based on pitch
    const rate = pitchToPlaybackRate(this.state.pitchPercent);
    this.source.playbackRate.value = rate;

    // Connect source to input gain
    this.source.connect(this.inputGain);

    this.source.onended = () => {
      if (this.state.isPlaying && !this.state.loopActive) {
        this.state.isPlaying = false;
        this.pausedAt = 0;
      }
    };

    const now = this.ctx.currentTime;
    this.startTime = now - offset / rate;
    this.source.start(0, offset);
    this.state.isPlaying = true;
    this.state.isCueing = false;
  }

  public pause() {
    if (!this.state.isPlaying) return;
    this.updateCurrentTime();
    this.stop();
    this.state.isPlaying = false;
  }

  public stop() {
    if (this.source) {
      try {
        this.source.stop();
        this.source.disconnect();
      } catch {
        // ignore already stopped
      }
      this.source = null;
    }
  }

  public cue() {
    if (this.state.isPlaying) {
      // If playing, pause and jump back to cue point
      this.pause();
      this.pausedAt = this.cuePoint;
      this.state.currentTime = this.cuePoint;
    } else {
      // If paused at current time, set current time as new cue point
      this.cuePoint = this.state.currentTime;
      this.pausedAt = this.cuePoint;
    }
  }

  public jumpToTime(time: number) {
    const clamped = Math.max(0, Math.min(this.state.duration, time));
    this.pausedAt = clamped;
    this.state.currentTime = clamped;
    if (this.state.isPlaying) {
      this.play(clamped);
    }
  }

  public triggerHotCue(index: number) {
    const cue = this.state.hotCues.find((c) => c.id === index);
    if (cue) {
      this.jumpToTime(cue.time);
      if (!this.state.isPlaying) {
        this.play(cue.time);
      }
    } else {
      // Set hot cue at current time
      const colors = ['#00f2fe', '#ff0844', '#eab308', '#22c55e', '#a855f7', '#ec4899', '#38bdf8', '#f97316'];
      this.state.hotCues.push({
        id: index,
        time: this.state.currentTime,
        label: `Cue ${index}`,
        color: colors[(index - 1) % colors.length],
      });
    }
  }

  public deleteHotCue(index: number) {
    this.state.hotCues = this.state.hotCues.filter((c) => c.id !== index);
  }

  // Loops
  public setLoop(beats: number) {
    this.state.loopBeats = beats;
    this.state.loopIn = this.state.currentTime;
    const dur = beatsToSeconds(beats, this.state.currentBpm);
    this.state.loopOut = Math.min(this.state.duration, this.state.currentTime + dur);
    this.state.loopActive = true;
  }

  public toggleLoop() {
    if (this.state.loopActive) {
      this.state.loopActive = false;
      this.state.loopIn = null;
      this.state.loopOut = null;
    } else {
      this.setLoop(this.state.loopBeats);
    }
  }

  public halveLoop() {
    if (this.state.loopBeats > 0.125) {
      this.setLoop(this.state.loopBeats / 2);
    }
  }

  public doubleLoop() {
    if (this.state.loopBeats < 32) {
      this.setLoop(this.state.loopBeats * 2);
    }
  }

  // Scratch / Platter
  public startScratch() {
    this.isScratching = true;
    if (this.source) {
      this.source.playbackRate.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public scratchMove(deltaAngle: number) {
    if (!this.isScratching || !this.buffer) return;
    const speed = deltaAngle * 0.08;
    this.scratchVelocity = Math.max(-3.0, Math.min(3.0, speed));
    const now = this.ctx.currentTime;

    const rate = this.scratchVelocity;
    if (this.source) {
      this.source.playbackRate.setValueAtTime(rate, now);
    }
    // Advance current time
    const dt = deltaAngle * 0.04;
    this.state.currentTime = Math.max(0, Math.min(this.state.duration, this.state.currentTime + dt));
    this.pausedAt = this.state.currentTime;
  }

  public stopScratch() {
    this.isScratching = false;
    const targetRate = pitchToPlaybackRate(this.state.pitchPercent);
    if (this.state.isPlaying) {
      this.play(this.state.currentTime);
    } else if (this.source) {
      this.source.playbackRate.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  // Pitch / Tempo
  public setPitch(percent: number) {
    this.state.pitchPercent = percent;
    this.state.currentBpm = Math.round(this.state.baseBpm * pitchToPlaybackRate(percent) * 10) / 10;
    if (this.source && !this.isScratching) {
      const rate = pitchToPlaybackRate(percent);
      this.source.playbackRate.setValueAtTime(rate, this.ctx.currentTime);
    }
  }

  public nudge(direction: 'up' | 'down') {
    const delta = direction === 'up' ? 2 : -2;
    const tempPercent = this.state.pitchPercent + delta;
    if (this.source && !this.isScratching) {
      this.source.playbackRate.setValueAtTime(pitchToPlaybackRate(tempPercent), this.ctx.currentTime);
      setTimeout(() => {
        if (this.source && !this.isScratching) {
          this.source.playbackRate.setValueAtTime(pitchToPlaybackRate(this.state.pitchPercent), this.ctx.currentTime);
        }
      }, 250);
    }
  }

  // EQ controls
  public setEq(band: 'high' | 'mid' | 'low', db: number) {
    const clamped = Math.max(-40, Math.min(6, db));
    const now = this.ctx.currentTime;
    if (band === 'high') {
      this.state.eqHigh = clamped;
      if (!this.state.eqHighKill) this.eqHighNode.gain.setValueAtTime(clamped, now);
    } else if (band === 'mid') {
      this.state.eqMid = clamped;
      if (!this.state.eqMidKill) this.eqMidNode.gain.setValueAtTime(clamped, now);
    } else if (band === 'low') {
      this.state.eqLow = clamped;
      if (!this.state.eqLowKill) this.eqLowNode.gain.setValueAtTime(clamped, now);
    }
  }

  public toggleKill(band: 'high' | 'mid' | 'low') {
    const now = this.ctx.currentTime;
    if (band === 'high') {
      this.state.eqHighKill = !this.state.eqHighKill;
      this.eqHighNode.gain.setValueAtTime(this.state.eqHighKill ? -70 : this.state.eqHigh, now);
    } else if (band === 'mid') {
      this.state.eqMidKill = !this.state.eqMidKill;
      this.eqMidNode.gain.setValueAtTime(this.state.eqMidKill ? -70 : this.state.eqMid, now);
    } else if (band === 'low') {
      this.state.eqLowKill = !this.state.eqLowKill;
      this.eqLowNode.gain.setValueAtTime(this.state.eqLowKill ? -70 : this.state.eqLow, now);
    }
  }

  // Filter sweep
  public setFilter(val: number) {
    this.state.filter = Math.max(0, Math.min(1, val));
    const now = this.ctx.currentTime;
    if (val < 0.48) {
      // Lowpass sweep
      const norm = val / 0.48; // 0 to 1
      const freq = 100 * Math.pow(20000 / 100, norm);
      this.lpfNode.frequency.setValueAtTime(freq, now);
      this.lpfNode.Q.setValueAtTime(2.5, now);
      this.hpfNode.frequency.setValueAtTime(20, now);
    } else if (val > 0.52) {
      // Highpass sweep
      const norm = (val - 0.52) / 0.48; // 0 to 1
      const freq = 20 * Math.pow(12000 / 20, norm);
      this.hpfNode.frequency.setValueAtTime(freq, now);
      this.hpfNode.Q.setValueAtTime(2.5, now);
      this.lpfNode.frequency.setValueAtTime(20000, now);
    } else {
      // Neutral bypass
      this.lpfNode.frequency.setValueAtTime(20000, now);
      this.hpfNode.frequency.setValueAtTime(20, now);
      this.lpfNode.Q.setValueAtTime(1.0, now);
      this.hpfNode.Q.setValueAtTime(1.0, now);
    }
  }

  // Stem controls
  public setStemVolume(stem: 'vocals' | 'drums' | 'bass' | 'melody', val: number) {
    const v = Math.max(0, Math.min(1.5, val));
    const now = this.ctx.currentTime;
    if (stem === 'vocals') {
      this.state.stemVocals = v;
      if (!this.state.stemVocalsMute) this.vocalGain.gain.setValueAtTime(v, now);
    } else if (stem === 'drums') {
      this.state.stemDrums = v;
      if (!this.state.stemDrumsMute) this.drumsGain.gain.setValueAtTime(v, now);
    } else if (stem === 'bass') {
      this.state.stemBass = v;
      if (!this.state.stemBassMute) this.bassGain.gain.setValueAtTime(v, now);
    } else if (stem === 'melody') {
      this.state.stemMelody = v;
      if (!this.state.stemMelodyMute) this.melodyGain.gain.setValueAtTime(v, now);
    }
  }

  public toggleStemMute(stem: 'vocals' | 'drums' | 'bass' | 'melody') {
    const now = this.ctx.currentTime;
    if (stem === 'vocals') {
      this.state.stemVocalsMute = !this.state.stemVocalsMute;
      this.vocalGain.gain.setValueAtTime(this.state.stemVocalsMute ? 0 : this.state.stemVocals, now);
    } else if (stem === 'drums') {
      this.state.stemDrumsMute = !this.state.stemDrumsMute;
      this.drumsGain.gain.setValueAtTime(this.state.stemDrumsMute ? 0 : this.state.stemDrums, now);
    } else if (stem === 'bass') {
      this.state.stemBassMute = !this.state.stemBassMute;
      this.bassGain.gain.setValueAtTime(this.state.stemBassMute ? 0 : this.state.stemBass, now);
    } else if (stem === 'melody') {
      this.state.stemMelodyMute = !this.state.stemMelodyMute;
      this.melodyGain.gain.setValueAtTime(this.state.stemMelodyMute ? 0 : this.state.stemMelody, now);
    }
  }

  // FX toggles
  public toggleEcho(beats?: number) {
    this.state.fxEchoActive = !this.state.fxEchoActive;
    if (beats !== undefined) {
      this.state.fxEchoBeats = beats;
    }
    const now = this.ctx.currentTime;
    const delaySec = calculateQuantizedEchoDelay(this.state.fxEchoBeats, this.state.currentBpm);
    this.echoDelayNode.delayTime.setValueAtTime(delaySec, now);
    this.echoWetNode.gain.setValueAtTime(this.state.fxEchoActive ? 0.6 : 0, now);
  }

  public toggleReverb() {
    this.state.fxReverbActive = !this.state.fxReverbActive;
    const now = this.ctx.currentTime;
    this.reverbWetNode.gain.setValueAtTime(this.state.fxReverbActive ? 0.55 : 0, now);
  }

  public setVolume(val: number) {
    this.state.volume = Math.max(0, Math.min(1.0, val));
    this.channelVolumeGain.gain.setValueAtTime(this.state.volume, this.ctx.currentTime);
  }

  public setGainTrim(val: number) {
    this.state.gainTrim = Math.max(0, Math.min(2.0, val));
    this.channelTrimGain.gain.setValueAtTime(this.state.gainTrim, this.ctx.currentTime);
  }

  // Animation frame update for meter and timecode
  public tick() {
    if (this.state.isPlaying && !this.isScratching) {
      this.updateCurrentTime();
      // Check loop boundary
      if (this.state.loopActive && this.state.loopOut && this.state.loopIn !== null) {
        if (this.state.currentTime >= this.state.loopOut) {
          this.jumpToTime(this.state.loopIn);
        }
      }
    }

    // VU meter calculation
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / (dataArray.length * 255);
    this.state.vuLevel = Math.min(1.0, avg * 1.6);

    // Beat phase calculation
    if (this.state.currentBpm > 0) {
      const beatLen = 60 / this.state.currentBpm;
      this.state.beatPhase = (this.state.currentTime % beatLen) / beatLen;
    }
  }

  private updateCurrentTime() {
    const rate = pitchToPlaybackRate(this.state.pitchPercent);
    const now = this.ctx.currentTime;
    const elapsed = (now - this.startTime) * rate;
    this.state.currentTime = Math.max(0, Math.min(this.state.duration, elapsed));
    this.pausedAt = this.state.currentTime;
  }
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  public ctx: AudioContext;
  public isPoweredOn = false;

  // Deck channels
  public deckA: DeckAudioChannel;
  public deckB: DeckAudioChannel;

  // Master Routing
  public crossfaderInputA: GainNode;
  public crossfaderInputB: GainNode;
  public masterGain: GainNode;
  public masterCompressor: DynamicsCompressorNode;
  public masterAnalyserL: AnalyserNode;
  public masterAnalyserR: AnalyserNode;

  // Recording
  public recordDestination: MediaStreamAudioDestinationNode;
  public mediaRecorder: MediaRecorder | null = null;
  public recordedChunks: Blob[] = [];
  public recordingStartTime = 0;

  // Sampler
  public sampler: SamplerEngine;

  // Master State
  public masterState: MasterState;

  private constructor() {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // Master nodes
    this.crossfaderInputA = this.ctx.createGain();
    this.crossfaderInputB = this.ctx.createGain();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.9;

    // Limiter / Compressor to avoid any club clipping
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.value = -3.0;
    this.masterCompressor.knee.value = 4.0;
    this.masterCompressor.ratio.value = 12.0;
    this.masterCompressor.attack.value = 0.003;
    this.masterCompressor.release.value = 0.25;

    // Master Analysers
    this.masterAnalyserL = this.ctx.createAnalyser();
    this.masterAnalyserR = this.ctx.createAnalyser();
    this.masterAnalyserL.fftSize = 64;
    this.masterAnalyserR.fftSize = 64;

    // Record Destination
    this.recordDestination = this.ctx.createMediaStreamDestination();

    // Routing: Crossfader inputs -> Master Compressor -> Master Gain -> Destination & Analysers
    this.crossfaderInputA.connect(this.masterCompressor);
    this.crossfaderInputB.connect(this.masterCompressor);
    this.masterCompressor.connect(this.masterGain);

    this.masterGain.connect(this.ctx.destination);
    this.masterGain.connect(this.recordDestination);
    this.masterGain.connect(this.masterAnalyserL);
    this.masterGain.connect(this.masterAnalyserR);

    // Initial Crossfader Gains (center)
    this.crossfaderInputA.gain.value = 0.707;
    this.crossfaderInputB.gain.value = 0.707;

    // Initialize Decks
    this.deckA = new DeckAudioChannel('A', this.ctx, this.crossfaderInputA);
    this.deckB = new DeckAudioChannel('B', this.ctx, this.crossfaderInputB);

    // Sampler connects straight to master
    this.sampler = new SamplerEngine(this.ctx, this.masterCompressor);

    this.masterState = {
      volume: 0.9,
      crossfader: 0,
      crossfaderCurve: 'smooth',
      isRecording: false,
      recordingDuration: 0,
      vuL: 0,
      vuR: 0,
      isAutomixing: false,
      automixProgress: 0,
    };
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async powerOn(): Promise<void> {
    try {
      if (this.ctx.state === 'suspended') {
        await Promise.race([
          this.ctx.resume(),
          new Promise((resolve) => setTimeout(resolve, 200)),
        ]);
      }
    } catch {
      // AudioContext autoplay restriction will unlock on first user gesture
    }
    this.isPoweredOn = true;
  }

  // Crossfader control
  public setCrossfader(pos: number) {
    this.masterState.crossfader = Math.max(-1, Math.min(1, pos));
    const gains = calculateCrossfaderGains(this.masterState.crossfader, this.masterState.crossfaderCurve);
    const now = this.ctx.currentTime;
    this.crossfaderInputA.gain.setValueAtTime(gains.gainA, now);
    this.crossfaderInputB.gain.setValueAtTime(gains.gainB, now);
  }

  public setCrossfaderCurve(curve: 'smooth' | 'scratch') {
    this.masterState.crossfaderCurve = curve;
    this.setCrossfader(this.masterState.crossfader);
  }

  public setMasterVolume(vol: number) {
    this.masterState.volume = Math.max(0, Math.min(1.5, vol));
    this.masterGain.gain.setValueAtTime(this.masterState.volume, this.ctx.currentTime);
  }

  // Automix transition (from active deck to incoming deck over 6 seconds)
  public triggerAutomix() {
    if (this.masterState.isAutomixing) return;
    this.masterState.isAutomixing = true;
    this.masterState.automixProgress = 0;

    // Determine direction: if crossfader is <= 0, mix to Deck B. If > 0, mix to Deck A.
    const startPos = this.masterState.crossfader;
    const targetPos = startPos <= 0 ? 1.0 : -1.0;
    const targetDeck = targetPos > 0 ? this.deckB : this.deckA;
    const outgoingDeck = targetPos > 0 ? this.deckA : this.deckB;

    // Sync BPM to ensure clean blend
    if (outgoingDeck.state.isPlaying && targetDeck.state.track) {
      targetDeck.setPitch(outgoingDeck.state.pitchPercent);
      if (!targetDeck.state.isPlaying) {
        targetDeck.play();
      }
    }

    const duration = 6000; // 6 seconds transition
    const startTime = performance.now();

    const step = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      this.masterState.automixProgress = progress;

      // Smooth cosine easing curve
      const eased = 0.5 - 0.5 * Math.cos(progress * Math.PI);
      const currentPos = startPos + (targetPos - startPos) * eased;
      this.setCrossfader(currentPos);

      // Creative transition: Dip bass on incoming deck until middle, then swap bass!
      if (progress < 0.5) {
        targetDeck.setStemVolume('bass', progress * 1.5);
      } else {
        outgoingDeck.setStemVolume('bass', Math.max(0, (1 - progress) * 2));
        targetDeck.setStemVolume('bass', 1.0);
      }

      if (progress < 1.0) {
        requestAnimationFrame(step);
      } else {
        this.masterState.isAutomixing = false;
        this.masterState.automixProgress = 0;
        outgoingDeck.pause();
        outgoingDeck.setStemVolume('bass', 1.0);
      }
    };

    requestAnimationFrame(step);
  }

  // Set Recording
  public startRecording(): boolean {
    if (!window.MediaRecorder) return false;
    this.recordedChunks = [];
    try {
      this.mediaRecorder = new MediaRecorder(this.recordDestination.stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };
      this.mediaRecorder.start(250);
      this.masterState.isRecording = true;
      this.recordingStartTime = Date.now();
      return true;
    } catch {
      return false;
    }
  }

  public stopRecording(): Blob | null {
    if (!this.mediaRecorder || !this.masterState.isRecording) return null;
    this.mediaRecorder.stop();
    this.masterState.isRecording = false;
    const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
    return blob;
  }

  // Sync BPM
  public syncDecks(targetDeckId: 'A' | 'B') {
    const slave = targetDeckId === 'A' ? this.deckA : this.deckB;
    const master = targetDeckId === 'A' ? this.deckB : this.deckA;

    if (!master.state.track || !slave.state.track) return;

    // Calculate required pitch percent on slave to match master's current BPM
    const targetBpm = master.state.currentBpm;
    const slaveBase = slave.state.baseBpm;
    const neededPitch = ((targetBpm / slaveBase) - 1) * 100;
    slave.setPitch(neededPitch);

    // Phase align beatgrid
    if (master.state.isPlaying && slave.state.isPlaying) {
      const beatLen = 60 / targetBpm;
      const masterPhase = (master.state.currentTime % beatLen);
      const slaveTime = slave.state.currentTime;
      const currentSlavePhase = (slaveTime % beatLen);
      const phaseDiff = masterPhase - currentSlavePhase;
      slave.jumpToTime(slaveTime + phaseDiff);
    }
  }

  // Pre-load default demo songs into Deck A and Deck B
  public loadDefaultDemos() {
    const demoA = synthesizeDemoTrack(this.ctx, 'demo-1'); // Nairobi Nightfall
    const demoB = synthesizeDemoTrack(this.ctx, 'demo-2'); // Kilimani Sunset
    this.deckA.loadTrack(demoA.track, demoA.buffer);
    this.deckB.loadTrack(demoB.track, demoB.buffer);
  }

  // Animation frame master tick
  public tick() {
    this.deckA.tick();
    this.deckB.tick();

    // Calculate master stereo VU levels
    const dataL = new Uint8Array(this.masterAnalyserL.frequencyBinCount);
    const dataR = new Uint8Array(this.masterAnalyserR.frequencyBinCount);
    this.masterAnalyserL.getByteFrequencyData(dataL);
    this.masterAnalyserR.getByteFrequencyData(dataR);

    let sumL = 0, sumR = 0;
    for (let i = 0; i < dataL.length; i++) sumL += dataL[i];
    for (let i = 0; i < dataR.length; i++) sumR += dataR[i];

    this.masterState.vuL = Math.min(1.0, (sumL / (dataL.length * 255)) * 1.5);
    this.masterState.vuR = Math.min(1.0, (sumR / (dataR.length * 255)) * 1.5);

    if (this.masterState.isRecording) {
      this.masterState.recordingDuration = (Date.now() - this.recordingStartTime) / 1000;
    }
  }
}
