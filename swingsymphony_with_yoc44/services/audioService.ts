/**
 * Audio Service for Rhythm Playback
 *
 * Generates drum sounds using Web Audio API for kinetic chain visualization
 * Enhanced with precision scheduling, intensity mapping, and speed pitch linking
 */

interface ScheduledSound {
  id: string;
  type: 'KICK' | 'BASS' | 'SNARE' | 'CRASH';
  time: number;
  intensity: number;
}

class AudioService {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private scheduledSounds: Map<string, number> = new Map();
  private currentSpeed: number = 1.0;

  constructor() {
    // Initialize on first use to avoid autoplay restrictions
  }

  private initAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3; // Master volume
      this.masterGain.connect(this.audioContext.destination);
    }
  }

  /**
   * Set playback speed for pitch adjustment
   */
  setSpeed(speed: number) {
    this.currentSpeed = speed;
  }

  /**
   * Calculate pitch shift based on playback speed
   * 0.25x → -2 semitones, 1.0x → 0 semitones, 2.0x → +2 semitones
   */
  private getPitchShift(): number {
    return Math.pow(2, (this.currentSpeed - 1) * 0.167); // 2^(semitones/12)
  }

  /**
   * Schedule sounds with precise Web Audio API timing
   */
  scheduleSounds(sounds: ScheduledSound[], startTime: number) {
    this.initAudio();
    if (!this.audioContext) return;

    // Clear previously scheduled sounds
    this.clearScheduledSounds();

    const audioStartTime = this.audioContext.currentTime + 0.02; // 20ms buffer for better sync perception

    sounds.forEach(sound => {
      const audioTime = audioStartTime + (sound.time - startTime);

      if (audioTime > this.audioContext!.currentTime) {
        this.scheduleSound(sound.type, audioTime, sound.intensity);
        this.scheduledSounds.set(sound.id, audioTime);
      }
    });
  }

  /**
   * Clear all scheduled sounds
   */
  clearScheduledSounds() {
    this.scheduledSounds.clear();
  }

  /**
   * Schedule a single sound at precise time
   */
  private scheduleSound(
    type: 'KICK' | 'BASS' | 'SNARE' | 'CRASH',
    time: number,
    intensity: number
  ) {
    switch (type) {
      case 'KICK':
        this.scheduleKick(time, intensity);
        break;
      case 'BASS':
        this.scheduleBass(time, intensity);
        break;
      case 'SNARE':
        this.scheduleSnare(time, intensity);
        break;
      case 'CRASH':
        this.scheduleCrash(time, intensity);
        break;
    }
  }

  /**
   * Schedule KICK drum (low frequency boom)
   * Intensity affects volume (30%-100%) and frequency (150Hz-225Hz)
   */
  private scheduleKick(time: number, intensity: number) {
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Intensity mapping: 0.0-1.0 → volume 30%-100%, frequency 150Hz-225Hz
    const volume = 0.3 + (intensity * 0.7);
    const baseFreq = 150 * (1 + intensity * 0.5);
    const pitchShift = this.getPitchShift();
    const frequency = baseFreq * pitchShift;

    osc.frequency.setValueAtTime(frequency, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.5);
  }

  /**
   * Play KICK drum immediately (legacy support)
   */
  playKick() {
    this.initAudio();
    if (!this.audioContext) return;
    this.scheduleKick(this.audioContext.currentTime, 0.7);
  }

  /**
   * Schedule BASS drum (mid-low frequency thump)
   * Intensity affects volume (24%-80%) and frequency (100Hz-150Hz)
   */
  private scheduleBass(time: number, intensity: number) {
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const volume = 0.24 + (intensity * 0.56);
    const baseFreq = 100 * (1 + intensity * 0.5);
    const pitchShift = this.getPitchShift();
    const frequency = baseFreq * pitchShift;

    osc.frequency.setValueAtTime(frequency, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.4);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.4);
  }

  /**
   * Play BASS drum immediately (legacy support)
   */
  playBass() {
    this.initAudio();
    if (!this.audioContext) return;
    this.scheduleBass(this.audioContext.currentTime, 0.7);
  }

  /**
   * Schedule SNARE drum (white noise burst)
   * Intensity affects volume (12%-40%) and tone frequency (180Hz-270Hz)
   */
  private scheduleSnare(time: number, intensity: number) {
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const noiseVolume = 0.12 + (intensity * 0.28);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(noiseVolume, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    // Add tone component with pitch shift
    const osc = ctx.createOscillator();
    const baseFreq = 180 * (1 + intensity * 0.5);
    const pitchShift = this.getPitchShift();
    osc.frequency.value = baseFreq * pitchShift;

    const oscVolume = 0.09 + (intensity * 0.21);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(oscVolume, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.2);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  /**
   * Play SNARE drum immediately (legacy support)
   */
  playSnare() {
    this.initAudio();
    if (!this.audioContext) return;
    this.scheduleSnare(this.audioContext.currentTime, 0.7);
  }

  /**
   * Schedule CRASH cymbal (high frequency noise with decay)
   * Intensity affects volume (15%-50%) and filter frequency (2000Hz-3500Hz)
   */
  private scheduleCrash(time: number, intensity: number) {
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    // Higher intensity → brighter sound (higher filter cutoff)
    const filterFreq = 2000 * (1 + intensity * 0.75);
    noiseFilter.frequency.value = filterFreq;

    const volume = 0.15 + (intensity * 0.35);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.5);
  }

  /**
   * Play CRASH cymbal immediately (legacy support)
   */
  playCrash() {
    this.initAudio();
    if (!this.audioContext) return;
    this.scheduleCrash(this.audioContext.currentTime, 0.7);
  }

  /**
   * Play rhythm node based on type with intensity (legacy support)
   */
  playRhythmNode(type: 'KICK' | 'BASS' | 'SNARE' | 'CRASH', intensity: number = 0.7) {
    this.initAudio();
    if (!this.audioContext) return;

    const time = this.audioContext.currentTime;

    switch (type) {
      case 'KICK':
        this.scheduleKick(time, intensity);
        break;
      case 'BASS':
        this.scheduleBass(time, intensity);
        break;
      case 'SNARE':
        this.scheduleSnare(time, intensity);
        break;
      case 'CRASH':
        this.scheduleCrash(time, intensity);
        break;
    }
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
}

export const audioService = new AudioService();
