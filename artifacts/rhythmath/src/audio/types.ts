import type { DrumPattern, Tradition } from "@workspace/engine";

/** Per-instrument mixer channel. */
export interface MixerChannel {
  /** 0..1 */
  gain: number;
  /** -1..1 */
  pan: number;
  mute: boolean;
  solo: boolean;
}

/**
 * A playable kit. `synth` kits are rendered in-house with modal synthesis
 * (no files). `samples` kits map instrument -> velocity band (0..3) -> urls.
 */
export interface KitSource {
  id: string;
  name: string;
  tradition: Tradition;
  kind: "synth" | "samples";
  /** honest label shown in the UI, e.g. "Synthesized starter kit" */
  description: string;
  samples?: Record<string, Record<number, string[]>>;
}

export interface AudioEngineState {
  isPlaying: boolean;
  /** absolute step currently sounding (0 .. totalSteps-1), -1 when stopped */
  currentStep: number;
  tempo: number;
  swing: number;
  kitId: string | null;
  kitLoading: boolean;
  /** true once the AudioContext has been unlocked by a user gesture */
  unlocked: boolean;
  channels: Record<string, MixerChannel>;
  /** last error message (kit failed to load, decode failure) */
  error: string | null;
}

export interface AudioEngine {
  /** Resume the AudioContext. Call from a click handler before the first play(). Safe to call repeatedly. */
  unlock(): Promise<void>;
  /** Load a kit (synth kits render in ~100 ms; sample kits fetch their files). */
  loadKit(kit: KitSource): Promise<void>;
  /** Set / replace the pattern. Hot-swappable while playing. */
  setPattern(pattern: DrumPattern): void;
  play(): Promise<void>;
  stop(): void;
  toggle(): Promise<void>;
  setTempo(bpm: number): void;
  /** 0.5 straight .. 0.75 */
  setSwing(ratio: number): void;
  setChannel(instrument: string, patch: Partial<MixerChannel>): void;
  resetChannels(): void;
  /** One-shot audition of an instrument. */
  preview(instrument: string, velocity?: number): Promise<void>;
  /** Offline-render the current pattern (loops once) with the loaded kit to a 44.1 kHz WAV blob. */
  renderWav(pattern: DrumPattern): Promise<Blob>;
  getState(): AudioEngineState;
  subscribe(listener: (state: AudioEngineState) => void): () => void;
}
