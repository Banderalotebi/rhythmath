import { type ScoredCandidate, type DrumPattern } from "@workspace/engine";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Candidates({
  candidates,
  selectedPattern,
  onSelect
}: {
  candidates: ScoredCandidate[];
  selectedPattern: DrumPattern | null;
  onSelect: (pattern: DrumPattern) => void;
}) {
  if (candidates.length === 0) {
    return (
      <div className="text-center py-12 px-4 border border-dashed border-border rounded text-sm font-mono text-muted-foreground">
        Enter a specification and generate to see grooves.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {candidates.map((c, i) => {
        const isSelected = selectedPattern?.id === c.pattern.id;
        const colorClass = c.pattern.tradition === 'samba' ? 'text-primary' : 'text-secondary';
        const bgClass = c.pattern.tradition === 'samba' ? 'bg-primary/10' : 'bg-secondary/10';
        const borderClass = c.pattern.tradition === 'samba' ? 'border-primary' : 'border-secondary';

        return (
          <Card 
            key={i} 
            className={cn(
              "cursor-pointer border transition-all duration-200 overflow-hidden",
              isSelected 
                ? `${borderClass} ${bgClass}` 
                : "border-border bg-card hover:border-border/80"
            )}
            onClick={() => onSelect(c.pattern)}
          >
            <CardContent className="p-0 flex flex-col">
              <div className="p-3 flex justify-between items-center border-b border-border/20">
                <div className="flex items-center gap-2">
                  <span className={cn("font-mono font-bold text-xs uppercase tracking-widest", colorClass)}>
                    #{c.rank}
                  </span>
                </div>
                <span className="font-mono text-xs bg-background/50 px-2 py-0.5 rounded text-foreground font-bold">
                  {c.score.total.toFixed(0)}
                </span>
              </div>
              
              <div className="p-3 bg-background/20 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                  {c.score.explanation[0]}
                </p>
                
                {/* Mini Histogram */}
                <div className="h-4 flex items-end gap-[1px]">
                  {c.metrics.histogram.map((val, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "flex-1 rounded-t-[1px] opacity-70",
                        isSelected ? colorClass.replace('text-', 'bg-') : 'bg-muted-foreground'
                      )}
                      style={{ height: `${Math.max(10, val * 100)}%` }}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
