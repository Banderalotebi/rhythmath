import { type GenerationSpec, TRADITIONS, GRAMMARS, type Tradition, getGrammar, grammarsFor } from "@workspace/engine";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dices } from "lucide-react";
import { cn } from "@/lib/utils";

// A simple deterministic hash for the "new seed" button
function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; 
  }
  return Math.abs(hash);
}

export function Controls({
  spec,
  seed,
  onChangeSpec,
  onChangeSeed
}: {
  spec: GenerationSpec;
  seed: number;
  onChangeSpec: (spec: GenerationSpec) => void;
  onChangeSeed: (seed: number) => void;
}) {
  const grammar = getGrammar(spec.style || "samba.batucada");
  const tradition = grammar?.tradition || "samba";
  
  const handleTraditionChange = (t: Tradition) => {
    const styles = grammarsFor(t);
    if (styles.length > 0) {
      onChangeSpec({ ...spec, style: styles[0].id, tempo: styles[0].defaultTempo });
    }
  };

  const handleStyleChange = (styleId: string) => {
    const newGrammar = getGrammar(styleId);
    if (newGrammar) {
      onChangeSpec({ ...spec, style: styleId, tempo: newGrammar.defaultTempo });
    }
  };

  const tempoRange = grammar?.tempoRange || [60, 200];
  
  return (
    <div className="flex flex-col gap-6 p-4 border border-border rounded-lg bg-card">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-mono uppercase text-muted-foreground">Tradition</Label>
          <div className="flex gap-1">
            {TRADITIONS.map(t => (
              <Button
                key={t.id}
                variant="outline"
                size="sm"
                onClick={() => handleTraditionChange(t.id)}
                className={cn(
                  "flex-1 font-mono text-xs h-8", 
                  tradition === t.id && (t.id === 'samba' ? "bg-primary/20 text-primary border-primary/50" : "bg-secondary/20 text-secondary border-secondary/50")
                )}
              >
                {t.localName}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-mono uppercase text-muted-foreground">Style</Label>
          <select 
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={spec.style}
            onChange={(e) => handleStyleChange(e.target.value)}
          >
            {grammarsFor(tradition).map(g => (
              <option key={g.id} value={g.id}>{g.localName}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-[10px] font-mono uppercase text-muted-foreground">Tempo (BPM)</Label>
            <span className="text-[10px] font-mono">{spec.tempo || grammar.defaultTempo}</span>
          </div>
          <Slider 
            min={tempoRange[0]} max={tempoRange[1]} step={1}
            value={[spec.tempo || grammar.defaultTempo]}
            onValueChange={(v) => onChangeSpec({ ...spec, tempo: v[0] })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-[10px] font-mono uppercase text-muted-foreground">Energy</Label>
            <span className="text-[10px] font-mono">{((spec.energy ?? 0.5) * 100).toFixed(0)}%</span>
          </div>
          <Slider 
            min={0} max={1} step={0.01}
            value={[spec.energy ?? 0.5]}
            onValueChange={(v) => onChangeSpec({ ...spec, energy: v[0] })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-[10px] font-mono uppercase text-muted-foreground">Swing</Label>
            <span className="text-[10px] font-mono">{(spec.swing ?? grammar.defaultSwing).toFixed(2)}</span>
          </div>
          <Slider 
            min={0.5} max={0.75} step={0.01}
            value={[spec.swing ?? grammar.defaultSwing]}
            onValueChange={(v) => onChangeSpec({ ...spec, swing: v[0] })}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-mono uppercase text-muted-foreground">Bars</Label>
            <select 
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={spec.bars || 2}
              onChange={(e) => onChangeSpec({ ...spec, bars: parseInt(e.target.value, 10) })}
            >
              {[1,2,4,8].map(b => (
                <option key={b} value={b}>{b} Bar{b>1?'s':''}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-mono uppercase text-muted-foreground flex justify-between">
              Seed
              <button 
                className="text-primary hover:text-primary/80 transition-colors"
                onClick={() => onChangeSeed(hashString(String(seed) + "next"))}
              >
                <Dices className="w-3 h-3" />
              </button>
            </Label>
            <Input 
              type="number" 
              className="h-8 text-xs font-mono"
              value={seed}
              onChange={(e) => onChangeSeed(parseInt(e.target.value, 10) || 1)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
