import { type DrumPattern, assertPattern } from "@workspace/engine";
import { type Pattern as ApiPattern } from "@workspace/api-client-react";

export function toEnginePattern(apiPattern: ApiPattern): DrumPattern {
  const pattern: DrumPattern = {
    ...apiPattern,
    events: apiPattern.events.map((e) => ({
      ...e,
      microOffset: e.microOffset ?? 0,
    })),
  };
  assertPattern(pattern);
  return pattern;
}

export function toApiPattern(enginePattern: DrumPattern): ApiPattern {
  return enginePattern;
}
