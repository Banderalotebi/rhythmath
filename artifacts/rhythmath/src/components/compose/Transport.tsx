import { useState } from "react";
import { type DrumPattern, withSwing, withTempo } from "@workspace/engine";
import { audioEngine, useAudioEngine } from "@/audio/engine";
import { STARTER_KITS } from "@/audio/kits";
import { useListKits } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Square, Download, Save, RefreshCw, Loader2 } from "lucide-react";
import { downloadBlob, midiBlob } from "@/lib/export";

export function Transport({
  pattern,
  onChange,
  onSave,
  onRegenerate,
  isSaving,
  isGenerating
}: {
  pattern: DrumPattern;
  onChange: (pattern: DrumPattern) => void;
  onSave: () => void;
  onRegenerate: () => void;
  isSaving: boolean;
  isGenerating: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const audioState = useAudioEngine();
  const { data: customKits } = useListKits({ query: { enabled: isAuthenticated, queryKey: ['listKits'] } });

  const [isExportingWav, setIsExportingWav] = useState(false);

  const togglePlay = async () => {
    await audioEngine.unlock();
    if (audioState.isPlaying) {
      audioEngine.stop();
    } else {
      audioEngine.setPattern(pattern);
      audioEngine.play();
    }
  };

  const handleKitChange = async (id: string) => {
    const starter = STARTER_KITS.find(k => k.id === id);
    if (starter) {
      await audioEngine.loadKit(starter);
      return;
    }
    const custom = customKits?.find(k => k.id === id);
    if (custom) {
      await audioEngine.loadKit({
        id: custom.id,
        name: custom.name,
        tradition: custom.tradition,
        kind: "samples",
        description: `${custom.sampleCount} contributed samples`,
      });
    }
  };

  const exportMidi = () => {
    const blob = midiBlob(pattern);
    downloadBlob(blob, `${pattern.style}-${Math.round(pattern.tempo)}bpm.mid`);
  };

  const exportWav = async () => {
    setIsExportingWav(true);
    try {
      const blob = await audioEngine.renderWav(pattern);
      downloadBlob(blob, `${pattern.style}-${Math.round(pattern.tempo)}bpm.wav`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingWav(false);
    }
  };

  return (
    <div className="flex-none p-4 border-b border-border bg-card/50 flex flex-wrap items-center justify-between gap-6">
      
      {/* Play Controls */}
      <div className="flex items-center gap-4">
        <Button 
          size="icon" 
          variant={audioState.isPlaying ? "default" : "outline"}
          className={`rounded-full w-12 h-12 ${audioState.isPlaying ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(0,255,255,0.5)]' : 'border-primary/50 hover:bg-primary/10 hover:text-primary'}`}
          onClick={togglePlay}
        >
          {audioState.isPlaying ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
        </Button>
        
        <div className="flex flex-col min-w-[120px]">
          <div className="flex justify-between items-center mb-1">
            <span className="font-mono text-xs text-muted-foreground uppercase">Tempo</span>
            <span className="font-mono text-xs font-bold">{audioState.tempo}</span>
          </div>
          <Slider 
            min={60} max={200} step={1} 
            value={[audioState.tempo]} 
            onValueChange={v => {
              const tempo = v[0] ?? pattern.tempo;
              audioEngine.setTempo(tempo);
              onChange(withTempo(pattern, tempo));
            }}
            className="w-full"
          />
        </div>

        <div className="flex flex-col min-w-[100px]">
          <div className="flex justify-between items-center mb-1">
            <span className="font-mono text-xs text-muted-foreground uppercase">Swing</span>
            <span className="font-mono text-xs font-bold">{audioState.swing.toFixed(2)}</span>
          </div>
          <Slider 
            min={0.5} max={0.75} step={0.01} 
            value={[audioState.swing]} 
            onValueChange={v => {
              const swing = v[0] ?? pattern.swing ?? 0.5;
              audioEngine.setSwing(swing);
              onChange(withSwing(pattern, swing));
            }}
            className="w-full"
          />
        </div>
      </div>

      {/* Center Controls (Kit & Regen) */}
      <div className="flex items-center gap-4">
        <select 
          className="flex h-8 rounded-md border border-input bg-background px-3 py-1 text-xs font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-48"
          value={audioState.kitId || ""}
          onChange={(e) => handleKitChange(e.target.value)}
        >
          <option value="" disabled>Select Kit...</option>
          <optgroup label="Built-in Synthesis">
            {STARTER_KITS.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
          </optgroup>
          {customKits && customKits.length > 0 && (
            <optgroup label="Your Kits">
              {customKits.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </optgroup>
          )}
        </select>
        
        <Button 
          variant="secondary" 
          size="sm" 
          className="font-mono text-xs h-8"
          onClick={onRegenerate}
          disabled={isGenerating}
        >
          {isGenerating ? <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-2" />}
          Regenerate
        </Button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="font-mono text-xs h-8" disabled={!isAuthenticated || isSaving} onClick={onSave}>
          {isSaving ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Save className="w-3 h-3 mr-2" />}
          Save
        </Button>
        <Button variant="outline" size="sm" className="font-mono text-xs h-8" onClick={exportMidi}>
          <Download className="w-3 h-3 mr-2" />
          MIDI
        </Button>
        <Button variant="outline" size="sm" className="font-mono text-xs h-8" onClick={exportWav} disabled={isExportingWav}>
          {isExportingWav ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Download className="w-3 h-3 mr-2" />}
          WAV
        </Button>
      </div>
    </div>
  );
}
