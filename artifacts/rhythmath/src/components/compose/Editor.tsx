import { 
  type DrumPattern, 
  toGrid, 
  getInstrument, 
  toggleCell, 
  nudgeCell, 
  clearRow,
  beatGroups
} from "@workspace/engine";
import { useAudioEngine, audioEngine } from "@/audio/engine";
import { Trash2, Lock, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export function Editor({
  pattern,
  onChange,
  lockedRows,
  onToggleLock
}: {
  pattern: DrumPattern;
  onChange: (p: DrumPattern) => void;
  lockedRows: Record<string, boolean>;
  onToggleLock: (instrument: string) => void;
}) {
  const grid = toGrid(pattern);
  const audioState = useAudioEngine();
  const groups = beatGroups(pattern.meter);

  // Build a lookup for step groups to alternate background color
  const stepGroupMap: boolean[] = [];
  let currentGroupIdx = 0;
  let stepsInCurrentGroup = 0;
  let isAlt = false;

  for (let i = 0; i < grid.stepsPerBar; i++) {
    if (stepsInCurrentGroup >= groups[currentGroupIdx] * pattern.meter.stepsPerBeat) {
      currentGroupIdx++;
      stepsInCurrentGroup = 0;
      isAlt = !isAlt;
    }
    stepGroupMap[i] = isAlt;
    stepsInCurrentGroup++;
  }

  const handleCellClick = (instrument: string, step: number, e: React.MouseEvent) => {
    if (e.shiftKey) {
      onChange(nudgeCell(pattern, instrument, step, 0.1));
    } else {
      onChange(toggleCell(pattern, instrument, step));
    }
  };

  const handleClear = (instrument: string) => {
    onChange(clearRow(pattern, instrument));
  };

  const toggleMute = (instrument: string) => {
    const ch = audioState.channels[instrument];
    const isMuted = ch?.mute ?? false;
    audioEngine.setChannel(instrument, { mute: !isMuted });
  };

  return (
    <div className="flex-1 overflow-auto p-4 flex flex-col bg-background/50 relative">
      <div className="min-w-max">
        
        {/* Header row (step numbers) */}
        <div className="flex items-center mb-2">
          <div className="w-48 flex-none" /> {/* Track header spacer */}
          <div className="flex-1 flex gap-[2px]">
            {Array.from({ length: grid.totalSteps }).map((_, i) => {
              const stepInBar = i % grid.stepsPerBar;
              const isFirstOfGroup = stepInBar === 0 || stepGroupMap[stepInBar] !== stepGroupMap[stepInBar - 1];
              return (
                <div 
                  key={i} 
                  className={cn(
                    "flex-1 h-6 text-[10px] font-mono flex items-center justify-center border-l border-transparent",
                    isFirstOfGroup && "border-border/50 text-muted-foreground",
                    audioState.currentStep === i ? "bg-primary/20 text-primary font-bold" : ""
                  )}
                >
                  {isFirstOfGroup ? (i / grid.stepsPerBar + 1) + "." + ((i % grid.stepsPerBar)/pattern.meter.stepsPerBeat + 1) : ""}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tracks */}
        <div className="space-y-1">
          {grid.rows.map((row) => {
            const inst = getInstrument(row.instrument);
            const isLocked = lockedRows[row.instrument];
            const ch = audioState.channels[row.instrument];
            const isMuted = ch?.mute ?? false;

            return (
              <div key={row.instrument} className="flex items-center group">
                {/* Track Header */}
                <div className="w-48 flex-none flex items-center justify-between pr-4 py-1">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground capitalize truncate w-24">
                      {inst.localName}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono truncate w-24">
                      {inst.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => toggleMute(row.instrument)} className={cn("p-1 rounded", isMuted ? "bg-destructive/20 text-destructive" : "hover:bg-muted text-muted-foreground")}>
                      {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                    <button onClick={() => onToggleLock(row.instrument)} className={cn("p-1 rounded hover:bg-muted", isLocked ? "text-primary bg-primary/10" : "text-muted-foreground")}>
                      <Lock className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleClear(row.instrument)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Track Grid */}
                <div className="flex-1 flex gap-[2px]">
                  {row.cells.map((cell, i) => {
                    const stepInBar = i % grid.stepsPerBar;
                    const isAlt = stepGroupMap[stepInBar];
                    const isActive = cell !== null;
                    const isPlaying = audioState.currentStep === i;
                    const velocity = cell?.velocity ?? 0;
                    
                    return (
                      <div
                        key={i}
                        onClick={(e) => handleCellClick(row.instrument, i, e)}
                        className={cn(
                          "flex-1 h-10 rounded-sm cursor-pointer transition-all duration-75 relative overflow-hidden",
                          isAlt ? "bg-muted/40" : "bg-muted/20",
                          isActive ? (pattern.tradition === 'samba' ? "bg-primary" : "bg-secondary") : "hover:bg-muted",
                          isPlaying && isActive ? "brightness-150 scale-105" : "",
                          isPlaying && !isActive ? "bg-primary/20" : ""
                        )}
                      >
                        {isActive && (
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-black/20" 
                            style={{ height: `${(1 - velocity) * 100}%` }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
