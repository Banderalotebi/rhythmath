// SPDX-License-Identifier: AGPL-3.0-or-later

import { toMidi, type DrumPattern } from "@workspace/engine";

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function midiBlob(pattern: DrumPattern): Blob {
  return new Blob([Uint8Array.from(toMidi(pattern)).buffer], { type: "audio/midi" });
}

export function patternFilenameSlug(pattern: Pick<DrumPattern, "style" | "tempo">): string {
  const style = pattern.style
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${style || "rhythm"}-${Math.round(pattern.tempo)}bpm`;
}

export function patternFilename(
  pattern: Pick<DrumPattern, "style" | "tempo">,
  extension: "mid" | "wav",
): string {
  return `${patternFilenameSlug(pattern)}.${extension}`;
}

export const midiFilename = (pattern: Pick<DrumPattern, "style" | "tempo">): string =>
  patternFilename(pattern, "mid");
export const wavFilename = (pattern: Pick<DrumPattern, "style" | "tempo">): string =>
  patternFilename(pattern, "wav");
