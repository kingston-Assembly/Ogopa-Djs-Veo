/**
 * Ogopa DJ's Sampler Engine
 * 8 Instant Club Performance Sound Effects Synthesized in Web Audio
 */

export interface SamplePadDefinition {
  id: number;
  name: string;
  category: 'horn' | 'siren' | 'bass' | 'scratch' | 'laser' | 'chime' | 'rewind' | 'vocal';
  color: string;
  defaultPitch: number; // 0.5 to 2.0
}

export const SAMPLE_PADS: SamplePadDefinition[] = [
  { id: 1, name: 'Airhorn VIP', category: 'horn', color: '#00f2fe', defaultPitch: 1.0 },
  { id: 2, name: 'Ogopa Siren', category: 'siren', color: '#ff0844', defaultPitch: 1.0 },
  { id: 3, name: '808 Sub Drop', category: 'bass', color: '#a855f7', defaultPitch: 1.0 },
  { id: 4, name: 'Scratch Chirp', category: 'scratch', color: '#22c55e', defaultPitch: 1.0 },
  { id: 5, name: 'Reggae Laser', category: 'laser', color: '#eab308', defaultPitch: 1.0 },
  { id: 6, name: 'Sparkle Chime', category: 'chime', color: '#38bdf8', defaultPitch: 1.0 },
  { id: 7, name: 'Vinyl Spinback', category: 'rewind', color: '#ec4899', defaultPitch: 1.0 },
  { id: 8, name: 'Hype Roar', category: 'vocal', color: '#f97316', defaultPitch: 1.0 },
];

export class SamplerEngine {
  private ctx: AudioContext;
  private outputGain: GainNode;

  constructor(ctx: AudioContext, destinationNode?: AudioNode) {
    this.ctx = ctx;
    this.outputGain = this.ctx.createGain();
    this.outputGain.gain.value = 0.85;

    if (destinationNode) {
      this.outputGain.connect(destinationNode);
    } else {
      this.outputGain.connect(this.ctx.destination);
    }
  }

  public setVolume(volume: number) {
    this.outputGain.gain.setValueAtTime(Math.max(0, Math.min(1.5, volume)), this.ctx.currentTime);
  }

  /**
   * Triggers a specific sample pad sound
   */
  public triggerPad(padId: number, pitch = 1.0) {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    const t0 = this.ctx.currentTime;

    switch (padId) {
      case 1:
        this.playAirhorn(t0, pitch);
        break;
      case 2:
        this.playSiren(t0, pitch);
        break;
      case 3:
        this.playSubDrop(t0, pitch);
        break;
      case 4:
        this.playScratchChirp(t0, pitch);
        break;
      case 5:
        this.playLaser(t0, pitch);
        break;
      case 6:
        this.playChime(t0, pitch);
        break;
      case 7:
        this.playSpinback(t0, pitch);
        break;
      case 8:
        this.playHypeVocal(t0, pitch);
        break;
      default:
        this.playAirhorn(t0, pitch);
    }
  }

  // 1. Dancehall Triplet Airhorn
  private playAirhorn(t0: number, pitch: number) {
    const bursts = [0, 0.14, 0.28, 0.46];
    bursts.forEach((burstTime, idx) => {
      const isLong = idx === 3;
      const dur = isLong ? 0.35 : 0.1;
      const startTime = t0 + burstTime;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const osc3 = this.ctx.createOscillator();
      const burstGain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc3.type = 'square';

      const baseFreq = 466.16 * pitch; // Bb4
      osc1.frequency.setValueAtTime(baseFreq, startTime);
      osc2.frequency.setValueAtTime(baseFreq * 1.01, startTime);
      osc3.frequency.setValueAtTime(baseFreq * 0.5, startTime);

      burstGain.gain.setValueAtTime(0, startTime);
      burstGain.gain.linearRampToValueAtTime(0.45, startTime + 0.015);
      burstGain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      osc1.connect(burstGain);
      osc2.connect(burstGain);
      osc3.connect(burstGain);
      burstGain.connect(this.outputGain);

      osc1.start(startTime);
      osc2.start(startTime);
      osc3.start(startTime);

      osc1.stop(startTime + dur);
      osc2.stop(startTime + dur);
      osc3.stop(startTime + dur);
    });
  }

  // 2. Ogopa Dub Siren
  private playSiren(t0: number, pitch: number) {
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(650 * pitch, t0);

    // LFO modulation (wobble)
    lfo.type = 'sawtooth';
    lfo.frequency.setValueAtTime(5.5, t0);
    lfoGain.gain.setValueAtTime(250 * pitch, t0);

    lfo.connect(osc.frequency);

    gain.gain.setValueAtTime(0.4, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2);

    // Simple delay feedback for dub feel
    const delay = this.ctx.createDelay();
    delay.delayTime.value = 0.22;
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.55;

    osc.connect(gain);
    gain.connect(this.outputGain);
    gain.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(this.outputGain);

    osc.start(t0);
    lfo.start(t0);
    osc.stop(t0 + 1.3);
    lfo.stop(t0 + 1.3);
  }

  // 3. 808 Sub Drop Boom
  private playSubDrop(t0: number, pitch: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110 * pitch, t0);
    osc.frequency.exponentialRampToValueAtTime(32 * pitch, t0 + 0.9);

    gain.gain.setValueAtTime(0.85, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2);

    osc.connect(gain);
    gain.connect(this.outputGain);

    osc.start(t0);
    osc.stop(t0 + 1.2);
  }

  // 4. Scratch Chirp
  private playScratchChirp(t0: number, pitch: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300 * pitch, t0);
    osc.frequency.linearRampToValueAtTime(1800 * pitch, t0 + 0.08);
    osc.frequency.linearRampToValueAtTime(200 * pitch, t0 + 0.18);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200 * pitch, t0);
    filter.Q.value = 3.5;

    gain.gain.setValueAtTime(0.7, t0);
    gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputGain);

    osc.start(t0);
    osc.stop(t0 + 0.24);
  }

  // 5. Reggae Laser Shot
  private playLaser(t0: number, pitch: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2400 * pitch, t0);
    osc.frequency.exponentialRampToValueAtTime(60 * pitch, t0 + 0.28);

    gain.gain.setValueAtTime(0.5, t0);
    gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.3);

    osc.connect(gain);
    gain.connect(this.outputGain);

    osc.start(t0);
    osc.stop(t0 + 0.32);
  }

  // 6. Sparkle Drop Chime
  private playChime(t0: number, pitch: number) {
    const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t0 + idx * 0.04;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f * pitch, start);

      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);

      osc.connect(gain);
      gain.connect(this.outputGain);

      osc.start(start);
      osc.stop(start + 0.65);
    });
  }

  // 7. Turntable Spinback / Rewind
  private playSpinback(t0: number, pitch: number) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800 * pitch, t0);
    osc.frequency.linearRampToValueAtTime(2400 * pitch, t0 + 0.15);
    osc.frequency.exponentialRampToValueAtTime(80 * pitch, t0 + 0.85);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3500, t0);
    filter.Q.value = 2.0;

    gain.gain.setValueAtTime(0.6, t0);
    gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.9);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputGain);

    osc.start(t0);
    osc.stop(t0 + 0.95);
  }

  // 8. Hype Vocal Shout
  private playHypeVocal(t0: number, pitch: number) {
    // Formant speech synthesis simulation for "OGOPA!"
    const osc = this.ctx.createOscillator();
    const f1 = this.ctx.createBiquadFilter();
    const f2 = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140 * pitch, t0);
    osc.frequency.exponentialRampToValueAtTime(110 * pitch, t0 + 0.45);

    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(700, t0); // "O" -> "A" vowel
    f1.frequency.linearRampToValueAtTime(850, t0 + 0.35);
    f1.Q.value = 4.0;

    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(1200, t0);
    f2.frequency.linearRampToValueAtTime(1400, t0 + 0.35);
    f2.Q.value = 4.0;

    gain.gain.setValueAtTime(0.7, t0);
    gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.5);

    osc.connect(f1);
    osc.connect(f2);
    f1.connect(gain);
    f2.connect(gain);
    gain.connect(this.outputGain);

    osc.start(t0);
    osc.stop(t0 + 0.55);
  }
}
