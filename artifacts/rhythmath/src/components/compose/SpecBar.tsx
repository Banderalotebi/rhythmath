import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wand2, RefreshCw } from "lucide-react";
import { parseSpec, type ParsedSpec } from "@workspace/engine";

export function SpecBar({ 
  onParsed, 
  onGenerate, 
  isGenerating 
}: { 
  onParsed: (parsed: ParsedSpec) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedSpec | null>(null);

  useEffect(() => {
    if (!text.trim()) {
      setParsed(null);
      return;
    }
    const result = parseSpec(text);
    setParsed(result);
    onParsed(result);
  }, [text, onParsed]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-2">
        <Wand2 className="w-5 h-5 text-primary opacity-50" />
        <Input 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a spec: e.g. 'samba batucada 140bpm high energy'" 
          className="border-none shadow-none bg-transparent font-mono text-lg focus-visible:ring-0 px-0 placeholder:text-muted-foreground/50"
        />
        <Button 
          onClick={onGenerate} 
          disabled={isGenerating || text.trim().length === 0}
          className="font-mono uppercase tracking-wider whitespace-nowrap ml-4"
        >
          {isGenerating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
          Generate
        </Button>
      </div>

      {parsed && (
        <div className="flex flex-wrap items-center gap-2 pl-7 min-h-[24px]">
          {parsed.recognised.map((token, i) => (
            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20" title={token.meaning}>
              {token.token}
            </span>
          ))}
          {parsed.unparsed.map((token, i) => (
            <span key={`u-${i}`} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-destructive/10 text-destructive border border-destructive/20 line-through">
              {token}
            </span>
          ))}
          {parsed.language !== 'unknown' && parsed.recognised.length > 0 && (
             <span className="text-[10px] font-mono text-muted-foreground ml-2 uppercase opacity-50">
               {parsed.language} ({(parsed.confidence * 100).toFixed(0)}%)
             </span>
          )}
        </div>
      )}
    </div>
  );
}
