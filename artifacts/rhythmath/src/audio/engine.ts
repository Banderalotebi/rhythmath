// SPDX-License-Identifier: AGPL-3.0-or-later

import { useSyncExternalStore } from "react";
import {
  getInstrument,
  hashString,
  INSTRUMENTS,
  stepSeconds,
  totalSteps,
  type DrumPattern,
} from "@workspace/engine";
import { synthBuffer } from "./synth";
import type { AudioEngine, AudioEngineState, KitSource, MixerChannel } from "./types";

type AnyAudioContext = AudioContext | OfflineAudioContext;
type LoadedSamples = Map<string, Map<number, AudioBuffer[]>>;
type ChannelNodes = { gain: GainNode; pan: StereoPannerNode };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function defaultChannel(instrument: string): MixerChannel {
  const definition = getInstrument(instrument);
  return { gain: definition.defaultGain, pan: definition.defaultPan, mute: false, solo: false };
}

function connectMaster(context: AnyAudioContext): DynamicsCompressorNode {
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -8;
  compressor.knee.value = 18;
  compressor.ratio.value = 6;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.2;
  compressor.connect(context.destination);
  return compressor;
}

function makeRoutes(
  context: AnyAudioContext,
  destination: AudioNode,
  channels: Record<string, MixerChannel>,
): Map<string, ChannelNodes> {
  const routes = new Map<string, ChannelNodes>();
  const anySolo = Object.values(channels).some((channel) => channel.solo);
  for (const [instrument, channel] of Object.entries(channels)) {
    const gain = context.createGain();
    const pan = context.createStereoPanner();
    gain.gain.value = channel.mute || (anySolo && !channel.solo) ? 0 : channel.gain;
    pan.pan.value = channel.pan;
    gain.connect(pan).connect(destination);
    routes.set(instrument, { gain, pan });
  }
  return routes;
}

function nearestBand(bands: Map<number, AudioBuffer[]>, velocity: number): AudioBuffer[] | undefined {
  const wanted = clamp(Math.floor(velocity * 4), 0, 3);
  let best: AudioBuffer[] | undefined;
  let distance = Infinity;
  for (const [band, buffers] of bands) {
    const candidateDistance = Math.abs(band - wanted);
    if (buffers.length && candidateDistance < distance) {
      best = buffers;
      distance = candidateDistance;
    }
  }
  return best;
}

function eventBuffer(
  context: AnyAudioContext,
  samples: LoadedSamples | null,
  instrument: string,
  velocity: number,
  identity: string,
): AudioBuffer {
  const choices = samples ? nearestBand(samples.get(instrument) ?? new Map(), velocity) : undefined;
  if (choices?.length) return choices[hashString(identity) % choices.length];
  return synthBuffer(context, instrument, velocity);
}

/**
 * Shared live/offline scheduling primitive. It deliberately owns all timing,
 * velocity, routing and sample-selection behavior used by both render paths.
 */
function schedulePatternStep(
  context: AnyAudioContext,
  pattern: DrumPattern,
  step: number,
  gridTime: number,
  secondsPerStep: number,
  swing: number,
  routes: Map<string, ChannelNodes>,
  samples: LoadedSamples | null,
  activeSources?: Set<AudioBufferSourceNode>,
): number {
  const inBeat = step % pattern.meter.stepsPerBeat;
  const isOffbeat =
    pattern.meter.stepsPerBeat % 2 === 0 && inBeat === pattern.meter.stepsPerBeat / 2;
  const swingDelay = isOffbeat ? (swing - 0.5) * 2 * secondsPerStep : 0;
  const soundingTime = gridTime + swingDelay;

  for (const [eventIndex, event] of pattern.events.entries()) {
    if (event.step !== step) continue;
    const route = routes.get(event.instrument);
    if (!route) continue;
    const velocity = clamp(event.velocity, 0, 1);
    const source = context.createBufferSource();
    source.buffer = eventBuffer(
      context,
      samples,
      event.instrument,
      velocity,
      `${pattern.id}:${step}:${eventIndex}`,
    );
    const velocityGain = context.createGain();
    velocityGain.gain.value = velocity;
    source.connect(velocityGain).connect(route.gain);
    const when = Math.max(context.currentTime, soundingTime + event.microOffset * secondsPerStep);
    source.start(when);
    if (activeSources) {
      activeSources.add(source);
      source.onended = () => activeSources.delete(source);
    }
  }
  return soundingTime;
}

class BrowserAudioEngine implements AudioEngine {
  private context: AudioContext | null = null;
  private master: DynamicsCompressorNode | null = null;
  private routes = new Map<string, ChannelNodes>();
  private pattern: DrumPattern | null = null;
  private samples: LoadedSamples | null = null;
  private timer: number | null = null;
  private animationFrame: number | null = null;
  private nextStep = 0;
  private nextStepTime = 0;
  private scheduledSteps: Array<{ step: number; time: number }> = [];
  private activeSources = new Set<AudioBufferSourceNode>();
  private listeners = new Set<(state: AudioEngineState) => void>();
  private state: AudioEngineState = {
    isPlaying: false,
    currentStep: -1,
    tempo: 120,
    swing: 0.5,
    kitId: null,
    kitLoading: false,
    unlocked: false,
    channels: {},
    error: null,
  };

  private emit(patch: Partial<AudioEngineState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }

  private getContext(): AudioContext {
    if (!this.context) {
      if (!window.AudioContext) throw new Error("Web Audio is not supported by this browser.");
      this.context = new AudioContext();
      this.master = connectMaster(this.context);
    }
    return this.context;
  }

  private rebuildRoutes(): void {
    if (!this.context || !this.master) return;
    for (const route of this.routes.values()) {
      route.gain.disconnect();
      route.pan.disconnect();
    }
    this.routes = makeRoutes(this.context, this.master, this.state.channels);
  }

  private ensureChannels(instruments: readonly string[]): void {
    const channels = { ...this.state.channels };
    let changed = false;
    for (const instrument of instruments) {
      if (!channels[instrument]) {
        channels[instrument] = defaultChannel(instrument);
        changed = true;
      }
    }
    if (changed) {
      this.emit({ channels });
      this.rebuildRoutes();
    }
  }

  async unlock(): Promise<void> {
    const context = this.getContext();
    try {
      await context.resume();
      this.emit({ unlocked: context.state === "running", error: null });
    } catch (cause) {
      const error = new Error("The audio system could not be unlocked.", { cause });
      this.emit({ error: error.message });
      throw error;
    }
  }

  async loadKit(kit: KitSource): Promise<void> {
    const context = this.getContext();
    this.emit({ kitLoading: true, error: null });
    try {
      let loaded: LoadedSamples | null = null;
      if (kit.kind === "samples") {
        loaded = new Map();
        for (const [instrument, bands] of Object.entries(kit.samples ?? {})) {
          const loadedBands = new Map<number, AudioBuffer[]>();
          loaded.set(instrument, loadedBands);
          for (const [bandText, urls] of Object.entries(bands)) {
            const buffers = await Promise.all(
              urls.map(async (url) => {
                const response = await fetch(url, { credentials: "include" });
                if (!response.ok) throw new Error(`Sample request failed (${response.status}) for ${url}`);
                try {
                  return await context.decodeAudioData(await response.arrayBuffer());
                } catch (cause) {
                  throw new Error(`Could not decode kit sample ${url}`, { cause });
                }
              }),
            );
            loadedBands.set(Number(bandText), buffers);
          }
        }
      } else {
        for (const instrument of Object.values(INSTRUMENTS)) {
          if (instrument.tradition === kit.tradition) synthBuffer(context, instrument.id);
        }
      }
      this.samples = loaded;
      this.emit({ kitId: kit.id, kitLoading: false });
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error("The kit could not be loaded.");
      this.emit({ kitLoading: false, error: error.message });
      throw error;
    }
  }

  setPattern(pattern: DrumPattern): void {
    this.pattern = pattern;
    this.ensureChannels(pattern.instruments);
    if (!this.state.isPlaying) {
      this.emit({ tempo: pattern.tempo, swing: pattern.swing ?? this.state.swing });
    }
  }

  async play(): Promise<void> {
    if (this.state.isPlaying) return;
    if (!this.pattern) {
      const error = new Error("Select or create a pattern before starting playback.");
      this.emit({ error: error.message });
      throw error;
    }
    await this.unlock();
    const context = this.getContext();
    this.nextStep = 0;
    this.nextStepTime = context.currentTime + 0.05;
    this.scheduledSteps = [];
    this.emit({ isPlaying: true, currentStep: -1, error: null });
    this.schedule();
    this.timer = window.setInterval(() => this.schedule(), 25);
    this.pollStep();
  }

  private schedule = (): void => {
    const context = this.context;
    if (!context || !this.pattern || !this.state.isPlaying) return;
    while (this.nextStepTime < context.currentTime + 0.12) {
      const pattern = this.pattern;
      const count = totalSteps(pattern);
      const step = this.nextStep % count;
      const duration = stepSeconds(this.state.tempo, pattern.meter);
      const soundingTime = schedulePatternStep(
        context,
        pattern,
        step,
        this.nextStepTime,
        duration,
        this.state.swing,
        this.routes,
        this.samples,
        this.activeSources,
      );
      this.scheduledSteps.push({ step, time: soundingTime });
      this.nextStep++;
      this.nextStepTime += duration;
    }
  };

  private pollStep = (): void => {
    if (!this.context || !this.state.isPlaying) return;
    while (this.scheduledSteps.length && this.scheduledSteps[0].time <= this.context.currentTime) {
      const sounding = this.scheduledSteps.shift();
      if (sounding) this.emit({ currentStep: sounding.step });
    }
    this.animationFrame = requestAnimationFrame(this.pollStep);
  };

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.timer = null;
    this.animationFrame = null;
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // A source may have ended between iteration and stop().
      }
    }
    this.activeSources.clear();
    this.scheduledSteps = [];
    this.emit({ isPlaying: false, currentStep: -1 });
  }

  async toggle(): Promise<void> {
    if (this.state.isPlaying) this.stop();
    else await this.play();
  }

  setTempo(bpm: number): void {
    if (!Number.isFinite(bpm) || bpm <= 0) throw new Error("Tempo must be a positive number.");
    this.emit({ tempo: bpm });
  }

  setSwing(ratio: number): void {
    if (!Number.isFinite(ratio) || ratio < 0.5 || ratio > 0.75) {
      throw new Error("Swing must be between 0.5 and 0.75.");
    }
    this.emit({ swing: ratio });
  }

  setChannel(instrument: string, patch: Partial<MixerChannel>): void {
    const current = this.state.channels[instrument] ?? defaultChannel(instrument);
    const next = {
      ...current,
      ...patch,
      gain: clamp(patch.gain ?? current.gain, 0, 1),
      pan: clamp(patch.pan ?? current.pan, -1, 1),
    };
    this.emit({ channels: { ...this.state.channels, [instrument]: next } });
    this.rebuildRoutes();
  }

  resetChannels(): void {
    const instruments = this.pattern?.instruments ?? Object.keys(this.state.channels);
    const channels = Object.fromEntries(instruments.map((id) => [id, defaultChannel(id)]));
    this.emit({ channels });
    this.rebuildRoutes();
  }

  async preview(instrument: string, velocity = 0.85): Promise<void> {
    await this.unlock();
    this.ensureChannels([instrument]);
    const context = this.getContext();
    schedulePatternStep(
      context,
      {
        id: "preview",
        tradition: getInstrument(instrument).tradition,
        style: "preview",
        meter: { beatsPerBar: 1, beatUnit: 4, stepsPerBeat: 1 },
        bars: 1,
        tempo: 120,
        instruments: [instrument],
        events: [{ step: 0, microOffset: 0, instrument, velocity }],
      },
      0,
      context.currentTime,
      0.125,
      0.5,
      this.routes,
      this.samples,
      this.activeSources,
    );
  }

  async renderWav(pattern: DrumPattern): Promise<Blob> {
    try {
      const tempo = this.state.tempo;
      const swing = this.state.swing;
      const stepDuration = stepSeconds(tempo, pattern.meter);
      const steps = totalSteps(pattern);
      const sampleRate = 44_100;
      const duration = steps * stepDuration + 1.5;
      const context = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
      const master = connectMaster(context);
      const channels = { ...this.state.channels };
      for (const instrument of pattern.instruments) channels[instrument] ??= defaultChannel(instrument);
      const routes = makeRoutes(context, master, channels);
      for (let step = 0; step < steps; step++) {
        schedulePatternStep(
          context,
          pattern,
          step,
          step * stepDuration,
          stepDuration,
          swing,
          routes,
          this.samples,
        );
      }
      const rendered = await context.startRendering();
      return wavBlob(rendered);
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error("WAV rendering failed.");
      this.emit({ error: error.message });
      throw error;
    }
  }

  getState(): AudioEngineState {
    return this.state;
  }

  subscribe(listener: (state: AudioEngineState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

function wavBlob(buffer: AudioBuffer): Blob {
  const channels = Math.min(2, buffer.numberOfChannels);
  const bytesPerSample = 2;
  const dataLength = buffer.length * channels * bytesPerSample;
  const output = new ArrayBuffer(44 + dataLength);
  const view = new DataView(output);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, dataLength, true);
  const data = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  let offset = 44;
  for (let frame = 0; frame < buffer.length; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = clamp(data[channel][frame], -1, 1);
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([output], { type: "audio/wav" });
}

export const audioEngine: AudioEngine = new BrowserAudioEngine();

export function useAudioEngine(): AudioEngineState {
  return useSyncExternalStore(
    (onStoreChange) => audioEngine.subscribe(onStoreChange),
    () => audioEngine.getState(),
    () => audioEngine.getState(),
  );
}