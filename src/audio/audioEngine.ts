/**
 * KAMY Procedural Studio WAV Synthesizer & Web Audio Equalizer Engine
 * Generates real, seekable 16-bit PCM WAV audio blobs offline for built-in tracks
 * and processes both built-in and imported local files (MP3, FLAC, WAV, AAC, M4A, OGG, OPUS)
 * through a 5-band Web Audio API BiquadFilterNode Equalizer.
 */

const wavCache = new Map<number, string>();

const PRESET_SCALES: number[][] = [
  [220.0, 261.63, 329.63, 392.0, 440.0], // 0: Starlit Reverie (Am9 R&B)
  [196.0, 246.94, 293.66, 369.99, 392.0], // 1: Midnight Confessions (Synthwave Gmaj7)
  [174.61, 207.65, 261.63, 311.13, 349.23], // 2: Velvet Horizon (Fm7 Dark Pop)
  [146.83, 174.61, 220.0, 261.63, 293.66], // 3: Pink Mirage (Dm7 Electronic)
  [261.63, 311.13, 392.0, 466.16, 523.25], // 4: Saudade em Neon (Cm9 Lo-Fi)
  [130.81, 164.81, 196.0, 246.94, 261.63], // 5: Obsidian Pulse (Techno Bass)
  [246.94, 293.66, 369.99, 440.0, 493.88], // 6: Glass Petals (Bm7 Ambient)
  [164.81, 196.0, 246.94, 293.66, 329.63], // 7: Tokyo Afterglow (Em9 Synth)
];

/**
 * Generates an in-memory 24-second seamless loopable stereo WAV Blob URL
 * so standard HTMLAudioElement playback, seek bar, volume, speed, and MediaSession work natively.
 */
export function getOrGenerateStudioWavUrl(presetIndex = 0): string {
  const safeIndex = Math.abs(presetIndex) % PRESET_SCALES.length;
  const cached = wavCache.get(safeIndex);
  if (cached) return cached;

  const sampleRate = 22050;
  const durationSec = 24;
  const numSamples = sampleRate * durationSec;
  const numChannels = 1;
  const bytesPerSample = 2;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF WAV Header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const scale = PRESET_SCALES[safeIndex];
  const bpm = 96 + (safeIndex % 4) * 8;
  const beatDur = 60 / bpm;

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const beatIndex = Math.floor(t / beatDur);
    const beatPhase = (t % beatDur) / beatDur;

    // Warm sub-bass + chord pad + melodic arpeggio
    const rootFreq = scale[0] * 0.5;
    const arpFreq = scale[beatIndex % scale.length];
    const fifthFreq = scale[(beatIndex + 2) % scale.length];

    const pad =
      0.22 * Math.sin(2 * Math.PI * rootFreq * t) +
      0.14 * Math.sin(2 * Math.PI * fifthFreq * t);

    const env = Math.exp(-beatPhase * 4.2);
    const lead = 0.25 * env * Math.sin(2 * Math.PI * arpFreq * t);

    // Soft kick pulse on every beat
    const kickEnv = Math.exp(-beatPhase * 18);
    const kickFreq = 55 + 90 * kickEnv;
    const kick = 0.28 * kickEnv * Math.sin(2 * Math.PI * kickFreq * t);

    const sample = Math.max(-0.95, Math.min(0.95, pad + lead + kick));
    view.setInt16(offset, sample * 32767, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  wavCache.set(safeIndex, url);
  return url;
}

/**
 * 5-Band Equalizer & Web Audio Graph Controller
 * Frequencies: 60Hz (Sub-Bass), 230Hz (Bass), 910Hz (Mid), 3.6kHz (Presence), 14kHz (Brilliance)
 */
export const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000] as const;

export const EQ_PRESETS: Record<string, [number, number, number, number, number]> = {
  Flat: [0, 0, 0, 0, 0],
  'Bass Boost': [7, 5, 0, 1, 2],
  'Vocal Pink': [3, 1, 2, 4, 3],
  Electronic: [6, 3, -1, 3, 6],
  Acoustic: [2, 1, 2, 3, 4],
};

export class KamyWebAudioGraph {
  private ctx: AudioContext | null = null;
  private filters: BiquadFilterNode[] = [];
  private analyser: AnalyserNode | null = null;
  private connectedElement: HTMLAudioElement | null = null;

  public connectAudioElement(audioEl: HTMLAudioElement, bands: [number, number, number, number, number], enabled: boolean) {
    if (typeof window === 'undefined' || this.connectedElement === audioEl) {
      this.updateEqualizer(bands, enabled);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      const source = this.ctx.createMediaElementSource(audioEl);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;

      this.filters = EQ_FREQUENCIES.map((freq, idx) => {
        const filter = this.ctx!.createBiquadFilter();
        filter.type = idx === 0 ? 'lowshelf' : idx === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1.1;
        filter.gain.value = enabled ? bands[idx] : 0;
        return filter;
      });

      // Chain source -> filters -> analyser -> destination
      let prevNode: AudioNode = source;
      for (const f of this.filters) {
        prevNode.connect(f);
        prevNode = f;
      }
      prevNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.connectedElement = audioEl;
    } catch {
      // Fallback safely if audio element is already bound
    }
  }

  public resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public updateEqualizer(bands: [number, number, number, number, number], enabled: boolean) {
    this.filters.forEach((filter, idx) => {
      filter.gain.value = enabled ? (bands[idx] ?? 0) : 0;
    });
  }

  public getFrequencyLevels(count = 16): number[] {
    if (!this.analyser) {
      return Array(count).fill(15);
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    const step = Math.max(1, Math.floor(data.length / count));
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      const val = data[i * step] || 0;
      result.push(Math.max(12, Math.round((val / 255) * 100)));
    }
    return result;
  }
}
