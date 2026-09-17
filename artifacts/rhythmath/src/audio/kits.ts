// SPDX-License-Identifier: AGPL-3.0-or-later

import type { KitDetail } from "@workspace/api-client-react";
import type { KitSource } from "./types";

export const STARTER_KITS: KitSource[] = [
  {
    id: "samba-starter",
    name: "Rio Synthesis",
    tradition: "samba" as const,
    kind: "synth" as const,
    description: "Synthesized starter kit — modal synthesis, no recordings yet",
  },
  {
    id: "arabic-starter",
    name: "Iqāʿāt Synthesis",
    tradition: "arabic" as const,
    kind: "synth" as const,
    description: "Synthesized starter kit — modal synthesis, no recordings yet",
  }
];

export function kitFromApi(kit: KitDetail): KitSource {
  const samples: NonNullable<KitSource["samples"]> = {};
  for (const sample of kit.samples) {
    const bands = (samples[sample.instrument] ??= {});
    (bands[sample.band] ??= []).push(sample.url);
  }
  return {
    id: kit.id,
    name: kit.name,
    tradition: kit.tradition,
    kind: "samples",
    description: `${kit.sampleCount} contributed sample${kit.sampleCount === 1 ? "" : "s"}`,
    samples,
  };
}
