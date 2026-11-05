import { StemKey, StemsState } from '../types';

export interface AudioEngineListeners {
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onPeaksGenerated?: (peaks: number[], transients: number[]) => void;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private pauseOffset: number = 0;
  private duration: number = 52;
  private playbackRate: number = 1.0;
  private bpm: number = 128;

  // Stems & Audio Graph
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private stemGains: Record<StemKey, GainNode | null> = {
    master: null,
    vocals: null,
    instruments: null,
    bass: null,
    drums: null,
  };

  // Uploaded Audio buffer
  private customAudioBuffer: AudioBuffer | null = null;
  private bufferSource: AudioBufferSourceNode | null = null;
  private customFilterNodes: {
    bass: BiquadFilterNode | null;
    vocals: BiquadFilterNode | null;
    instruments: BiquadFilterNode | null;
    drums: BiquadFilterNode | null;
  } = { bass: null, vocals: null, instruments: null, drums: null };

  // Synthetic Stem scheduling
  private synthTimer: number | null = null;
  private nextSynthBarTime: number = 0;

  // Waveform peak cache
  private cachedPeaks: number[] = [];
  private cachedTransients: number[] = [];

  // Loop settings
  private loopStart: number | null = null;
  private loopEnd: number | null = null;
  private isLooping: boolean = true;

  // Animation frame
  private animFrameId: number | null = null;
  private listeners: AudioEngineListeners = {};

  constructor() {
    // Lazy AudioContext creation on first user interaction
  }

  public setListeners(listeners: AudioEngineListeners) {
    this.listeners = listeners;
  }

  public initContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master analyzer
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.9;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Create stem gain nodes
      const stems: StemKey[] = ['vocals', 'instruments', 'bass', 'drums'];
      stems.forEach((stem) => {
        if (!this.ctx || !this.masterGain) return;
        const gain = this.ctx.createGain();
        gain.gain.value = 1.0;
        gain.connect(this.masterGain);
        this.stemGains[stem] = gain;
      });
      this.stemGains.master = this.masterGain;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  public setTrack(duration: number, bpm: number, customBuffer: AudioBuffer | null = null) {
    this.pause();
    this.duration = duration;
    this.bpm = bpm;
    this.customAudioBuffer = customBuffer;
    this.pauseOffset = 0;
    this.startTime = 0;

    // Generate peaks
    this.generatePeaks();
  }

  public async loadAudioFile(file: File): Promise<{ buffer: AudioBuffer; duration: number }> {
    const ctx = this.initContext();
    const arrayBuffer = await file.arrayBuffer();
    const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.customAudioBuffer = decodedBuffer;
    this.duration = decodedBuffer.duration;
    this.generatePeaksFromBuffer(decodedBuffer);
    return { buffer: decodedBuffer, duration: decodedBuffer.duration };
  }

  private generatePeaks() {
    if (this.customAudioBuffer) {
      this.generatePeaksFromBuffer(this.customAudioBuffer);
      return;
    }

    // Generate realistic studio waveform peaks for synthetic track
    const count = 300;
    const peaks: number[] = [];
    const transients: number[] = [];
    const beatsPerSec = this.bpm / 60;

    for (let i = 0; i < count; i++) {
      const t = (i / count) * this.duration;
      const beatPhase = (t * beatsPerSec) % 1;
      const barPhase = ((t * beatsPerSec) / 4) % 1;

      // Kick & Snare transient peaks
      let amp = 0.25;
      if (beatPhase < 0.12) {
        // Kick on downbeats
        amp += 0.55;
      } else if (beatPhase > 0.45 && beatPhase < 0.58) {
        // Snare on backbeat
        amp += 0.45;
      }

      // Vocal presence
      if (t > 4 && t < this.duration - 4) {
        amp += 0.2 * Math.sin(t * 3.5) * Math.cos(t * 1.8);
      }

      // High-hat shimmer
      amp += 0.15 * Math.sin(t * 18);

      const normalized = Math.min(1.0, Math.max(0.08, Math.abs(amp)));
      peaks.push(normalized);

      // Detect transient
      if (beatPhase < 0.08) {
        transients.push(t);
      }
    }

    this.cachedPeaks = peaks;
    this.cachedTransients = transients;
    if (this.listeners.onPeaksGenerated) {
      this.listeners.onPeaksGenerated(peaks, transients);
    }
  }

  private generatePeaksFromBuffer(buffer: AudioBuffer) {
    const channelData = buffer.getChannelData(0);
    const count = 300;
    const blockSize = Math.floor(channelData.length / count);
    const peaks: number[] = [];
    const transients: number[] = [];

    let prevMax = 0;
    for (let i = 0; i < count; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize; j += 10) {
        const val = Math.abs(channelData[start + j] || 0);
        if (val > max) max = val;
      }
      peaks.push(Math.min(1.0, Math.max(0.05, max * 1.2)));

      // Detect sudden transient jump
      if (max > 0.4 && max - prevMax > 0.2) {
        const t = (i / count) * buffer.duration;
        transients.push(t);
      }
      prevMax = max;
    }

    this.cachedPeaks = peaks;
    this.cachedTransients = transients;
    if (this.listeners.onPeaksGenerated) {
      this.listeners.onPeaksGenerated(peaks, transients);
    }
  }

  public getPeaks(): number[] {
    if (this.cachedPeaks.length === 0) {
      this.generatePeaks();
    }
    return this.cachedPeaks;
  }

  public getTransients(): number[] {
    return this.cachedTransients;
  }

  public play() {
    const ctx = this.initContext();
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.startTime = ctx.currentTime - this.pauseOffset / this.playbackRate;

    if (this.customAudioBuffer) {
      this.playCustomBuffer();
    } else {
      this.startSyntheticPlayback();
    }

    this.startTimeLoop();
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.pauseOffset = this.getCurrentTime();

    if (this.bufferSource) {
      try {
        this.bufferSource.stop();
        this.bufferSource.disconnect();
      } catch (e) {}
      this.bufferSource = null;
    }

    if (this.synthTimer) {
      window.clearInterval(this.synthTimer);
      this.synthTimer = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  public seek(seconds: number) {
    const target = Math.max(0, Math.min(this.duration, seconds));
    const wasPlaying = this.isPlaying;

    if (wasPlaying) {
      this.pause();
    }

    this.pauseOffset = target;

    if (wasPlaying) {
      this.play();
    } else {
      if (this.listeners.onTimeUpdate) {
        this.listeners.onTimeUpdate(target);
      }
    }
  }

  public getCurrentTime(): number {
    if (!this.isPlaying || !this.ctx) {
      return Math.min(this.duration, this.pauseOffset);
    }
    const elapsed = (this.ctx.currentTime - this.startTime) * this.playbackRate;
    let current = elapsed;

    if (this.isLooping && this.loopStart !== null && this.loopEnd !== null && this.loopEnd > this.loopStart) {
      const loopLen = this.loopEnd - this.loopStart;
      if (current >= this.loopEnd) {
        current = this.loopStart + ((current - this.loopStart) % loopLen);
        this.startTime = this.ctx.currentTime - current / this.playbackRate;
      }
    } else if (current >= this.duration) {
      if (this.isLooping) {
        current = current % this.duration;
        this.startTime = this.ctx.currentTime - current / this.playbackRate;
      } else {
        this.pause();
        current = this.duration;
        if (this.listeners.onEnded) this.listeners.onEnded();
      }
    }

    return Math.max(0, Math.min(this.duration, current));
  }

  public setPlaybackRate(rate: number) {
    const current = this.getCurrentTime();
    this.playbackRate = rate;
    if (this.ctx && this.isPlaying) {
      this.startTime = this.ctx.currentTime - current / rate;
      if (this.bufferSource) {
        this.bufferSource.playbackRate.value = rate;
      }
    }
  }

  public setLoop(start: number | null, end: number | null, enabled: boolean) {
    this.loopStart = start;
    this.loopEnd = end;
    this.isLooping = enabled;
  }

  public updateStems(stems: StemsState) {
    if (!this.ctx) return;

    // Check if any stem is soloed
    const anySolo = Object.values(stems).some((s) => s.solo);

    (Object.keys(stems) as StemKey[]).forEach((key) => {
      const cfg = stems[key];
      const node = this.stemGains[key];
      if (!node) return;

      if (key === 'master') {
        node.gain.setTargetAtTime(cfg.muted ? 0 : cfg.volume, this.ctx!.currentTime, 0.02);
      } else {
        let effGain = cfg.volume;
        if (cfg.muted) {
          effGain = 0;
        } else if (anySolo && !cfg.solo) {
          effGain = 0;
        }
        node.gain.setTargetAtTime(effGain, this.ctx!.currentTime, 0.02);
      }
    });
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(64);
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  private startTimeLoop() {
    const loop = () => {
      if (!this.isPlaying) return;
      const now = this.getCurrentTime();
      if (this.listeners.onTimeUpdate) {
        this.listeners.onTimeUpdate(now);
      }
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  // --- PLAYBACK OF DECODED AUDIO FILE WITH STEM BAND SPLITTING ---
  private playCustomBuffer() {
    if (!this.ctx || !this.customAudioBuffer) return;

    this.bufferSource = this.ctx.createBufferSource();
    this.bufferSource.buffer = this.customAudioBuffer;
    this.bufferSource.playbackRate.value = this.playbackRate;

    // Route to 4 frequency bands for stem isolation
    // Bass: Lowpass 250Hz
    const bassFilter = this.ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 250;
    this.bufferSource.connect(bassFilter);
    if (this.stemGains.bass) bassFilter.connect(this.stemGains.bass);

    // Drums: Highpass 3500Hz
    const drumsFilter = this.ctx.createBiquadFilter();
    drumsFilter.type = 'highpass';
    drumsFilter.frequency.value = 3500;
    this.bufferSource.connect(drumsFilter);
    if (this.stemGains.drums) drumsFilter.connect(this.stemGains.drums);

    // Vocals: Bandpass centered at 1200Hz
    const vocalsFilter = this.ctx.createBiquadFilter();
    vocalsFilter.type = 'bandpass';
    vocalsFilter.frequency.value = 1200;
    vocalsFilter.Q.value = 1.2;
    this.bufferSource.connect(vocalsFilter);
    if (this.stemGains.vocals) vocalsFilter.connect(this.stemGains.vocals);

    // Instruments: Peaking band at 650Hz
    const instFilter = this.ctx.createBiquadFilter();
    instFilter.type = 'bandpass';
    instFilter.frequency.value = 650;
    instFilter.Q.value = 0.8;
    this.bufferSource.connect(instFilter);
    if (this.stemGains.instruments) instFilter.connect(this.stemGains.instruments);

    const offset = Math.max(0, this.pauseOffset);
    this.bufferSource.start(0, offset);
  }

  // --- SYNTHETIC STUDIO MULTI-TRACK GENERATOR ---
  private startSyntheticPlayback() {
    if (!this.ctx) return;

    this.nextSynthBarTime = this.ctx.currentTime;
    const scheduleAheadTime = 0.25;

    const scheduler = () => {
      if (!this.isPlaying || !this.ctx) return;
      while (this.nextSynthBarTime < this.ctx.currentTime + scheduleAheadTime) {
        this.scheduleBeat(this.nextSynthBarTime);
        const beatDuration = 60 / this.bpm;
        this.nextSynthBarTime += beatDuration / 2; // 8th note subdivisions
      }
    };

    this.synthTimer = window.setInterval(scheduler, 40);
  }

  private scheduleBeat(time: number) {
    if (!this.ctx) return;

    const currentSongTime = this.getCurrentTime();
    const beatIndex = Math.floor((currentSongTime * (this.bpm / 60)) * 2) % 16;

    // 1. DRUMS STEM: Kick on 0, 4, 8, 12. Snare on 4, 12. Hihats on 2, 6, 10, 14
    if (this.stemGains.drums) {
      if (beatIndex === 0 || beatIndex === 8) {
        // Kick drum
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);
        gain.gain.setValueAtTime(0.7, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
        osc.connect(gain);
        gain.connect(this.stemGains.drums);
        osc.start(time);
        osc.stop(time + 0.25);
      }

      if (beatIndex === 4 || beatIndex === 12) {
        // Snare / Clap
        const noiseBuffer = this.createNoiseBuffer(0.15);
        if (noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          noise.buffer = noiseBuffer;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 800;
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.45, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.stemGains.drums);
          noise.start(time);
        }
      }

      // Shimmer Hi-Hat
      if (beatIndex % 2 === 0) {
        const hhBuffer = this.createNoiseBuffer(0.04);
        if (hhBuffer) {
          const hh = this.ctx.createBufferSource();
          hh.buffer = hhBuffer;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 7000;
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.15, time);
          gain.gain.exponentialRampToValueAtTime(0.005, time + 0.04);
          hh.connect(filter);
          filter.connect(gain);
          gain.connect(this.stemGains.drums);
          hh.start(time);
        }
      }
    }

    // 2. BASS STEM: Driving Synthwave bassline
    if (this.stemGains.bass && beatIndex % 2 === 0) {
      const bassNotes = [55, 55, 65.41, 73.42, 82.41, 73.42]; // A1, C2, D2, E2
      const noteFreq = bassNotes[Math.floor(beatIndex / 2) % bassNotes.length];

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(noteFreq, time);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, time);
      filter.frequency.exponentialRampToValueAtTime(120, time + 0.18);

      gain.gain.setValueAtTime(0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.stemGains.bass);
      osc.start(time);
      osc.stop(time + 0.24);
    }

    // 3. INSTRUMENTS STEM: Lush retro synth chords & arp
    if (this.stemGains.instruments && beatIndex % 4 === 0) {
      const chords = [
        [220, 261.63, 329.63], // Am
        [174.61, 220, 261.63], // F
        [261.63, 329.63, 392], // C
        [196, 246.94, 293.66], // G
      ];
      const chord = chords[Math.floor(currentSongTime / 4) % chords.length];

      chord.forEach((freq) => {
        if (!this.ctx || !this.stemGains.instruments) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.005, time + 0.75);
        osc.connect(gain);
        gain.connect(this.stemGains.instruments);
        osc.start(time);
        osc.stop(time + 0.8);
      });
    }

    // 4. VOCALS STEM: Melodic vocal formant synthesizer that aligns with lyrics!
    if (this.stemGains.vocals && currentSongTime > 4.2 && currentSongTime < this.duration - 4) {
      if (beatIndex % 2 === 0) {
        const vocalPitches = [329.63, 392.0, 440.0, 493.88, 523.25, 440.0];
        const pitch = vocalPitches[Math.floor(currentSongTime * 1.5) % vocalPitches.length];

        const osc = this.ctx.createOscillator();
        const formant1 = this.ctx.createBiquadFilter();
        const formant2 = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(pitch, time);

        // Vocal Formant vowels /ah/ /eh/
        formant1.type = 'bandpass';
        formant1.frequency.value = 800;
        formant1.Q.value = 4.0;

        formant2.type = 'bandpass';
        formant2.frequency.value = 1800;
        formant2.Q.value = 4.0;

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.28);

        osc.connect(formant1);
        osc.connect(formant2);
        formant1.connect(gain);
        formant2.connect(gain);
        gain.connect(this.stemGains.vocals);

        osc.start(time);
        osc.stop(time + 0.3);
      }
    }
  }

  private createNoiseBuffer(lengthSec: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = Math.floor(this.ctx.sampleRate * lengthSec);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}

// Global audio engine singleton
export const audioEngine = new AudioEngine();
