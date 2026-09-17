// SPDX-License-Identifier: AGPL-3.0-or-later

export interface DecodedAudioFile {
  channelData: Float32Array;
  sampleRate: number;
  duration: number;
}

export async function decodeAudioFile(file: File): Promise<DecodedAudioFile> {
  if (!file.type.toLowerCase().startsWith("audio/")) {
    throw new Error(`Cannot decode "${file.name}": the selected file is not an audio file.`);
  }
  const Context = window.AudioContext;
  if (!Context) throw new Error("Web Audio is not supported by this browser.");
  const context = new Context();
  try {
    const bytes = await file.arrayBuffer();
    let decoded: AudioBuffer;
    try {
      decoded = await context.decodeAudioData(bytes);
    } catch (cause) {
      throw new Error(`Cannot decode "${file.name}" as audio.`, { cause });
    }
    const frames = Math.min(decoded.length, Math.floor(decoded.sampleRate * 60));
    const mono = new Float32Array(frames);
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      const data = decoded.getChannelData(channel);
      for (let i = 0; i < frames; i++) mono[i] += data[i] / decoded.numberOfChannels;
    }
    return { channelData: mono, sampleRate: decoded.sampleRate, duration: frames / decoded.sampleRate };
  } finally {
    await context.close();
  }
}
