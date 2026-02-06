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

  private initAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
    }
  }

  setSpeed(speed: number) {
    this.currentSpeed = speed;
  }

  private getPitchShift(): number {
    return Math.pow(2, (this.currentSpeed - 1) * 0.167);
  }

  scheduleSounds(sounds: ScheduledSound[], startTime: number) {
    this.initAudio();
    if (!this.audioContext) return;
    this.clearScheduledSounds();

    const audioStartTime = this.audioContext.currentTime + 0.02;
    sounds.forEach(sound => {
      const audioTime = audioStartTime + (sound.time - startTime);
      if (audioTime > this.audioContext!.currentTime) {
        this.scheduleSound(sound.type, audioTime, sound.intensity);
        this.scheduledSounds.set(sound.id, audioTime);
      }
    });
  }

  clearScheduledSounds() {
    this.scheduledSounds.clear();
  }

  private scheduleSound(type: 'KICK' | 'BASS' | 'SNARE' | 'CRASH', time: number, intensity: number) {
    switch (type) {
      case 'KICK': this.scheduleKick(time, intensity); break;
      case 'BASS': this.scheduleBass(time, intensity); break;
      case 'SNARE': this.scheduleSnare(time, intensity); break;
      case 'CRASH': this.scheduleCrash(time, intensity); break;
    }
  }

  private scheduleKick(time: number, intensity: number) {
    if (!this.audioContext || !this.masterGain) return;
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const volume = 0.3 + (intensity * 0.7);
    const frequency = 150 * (1 + intensity * 0.5) * this.getPitchShift();
    osc.frequency.setValueAtTime(frequency, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.5);
  }

  private scheduleBass(time: number, intensity: number) {
    if (!this.audioContext || !this.masterGain) return;
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const volume = 0.24 + (intensity * 0.56);
    const frequency = 100 * (1 + intensity * 0.5) * this.getPitchShift();
    osc.frequency.setValueAtTime(frequency, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.4);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.4);
  }

  private scheduleSnare(time: number, intensity: number) {
    if (!this.audioContext || !this.masterGain) return;
    const ctx = this.audioContext;
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12 + (intensity * 0.28), time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    const osc = ctx.createOscillator();
    osc.frequency.value = 180 * (1 + intensity * 0.5) * this.getPitchShift();
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.09 + (intensity * 0.21), time);
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

  private scheduleCrash(time: number, intensity: number) {
    if (!this.audioContext || !this.masterGain) return;
    const ctx = this.audioContext;
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000 * (1 + intensity * 0.75);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15 + (intensity * 0.35), time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(time);
    noise.stop(time + 0.5);
  }

  setVolume(volume: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
}

export const audioService = new AudioService();
