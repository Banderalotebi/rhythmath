import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  analyzePattern,
  generateGrooves,
  getGrammar,
  parseSpec,
  scorePattern,
  skeletonPattern,
  type DrumPattern,
  type GenerationSpec,
  type ParsedSpec,
  withId,
} from "@workspace/engine";
import {
  useCreateProject,
  useGetProject,
  useRecordGeneration,
  useUpdateProject,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Candidates } from "@/components/compose/Candidates";
import { Controls } from "@/components/compose/Controls";
import { Editor } from "@/components/compose/Editor";
import { SpecBar } from "@/components/compose/SpecBar";
import { Transport } from "@/components/compose/Transport";
import { audioEngine } from "@/audio/engine";
import { toEnginePattern, toApiPattern } from "@/lib/pattern-io";
import { Binary, Save, SlidersHorizontal } from "lucide-react";

const DEFAULT_SPEC: GenerationSpec = {
  style: "samba.batucada",
  tempo: getGrammar("samba.batucada").defaultTempo,
  bars: 2,
  energy: 0.6,
};

export default function Compose() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const projectId = new URLSearchParams(window.location.search).get("project");
  const fromAnalyze = new URLSearchParams(window.location.search).get("from") === "analyze";
  const { data: project } = useGetProject(projectId ?? "", {
    query: { enabled: Boolean(projectId && isAuthenticated), queryKey: ["project", projectId] },
  });
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const recordGeneration = useRecordGeneration();

  const [spec, setSpec] = useState<GenerationSpec>(DEFAULT_SPEC);
  const [parsed, setParsed] = useState<ParsedSpec | null>(null);
  const [candidates, setCandidates] = useState<ReturnType<typeof generateGrooves>["winners"]>([]);
  const [pattern, setPattern] = useState<DrumPattern | null>(null);
  const [lockedRows, setLockedRows] = useState<Record<string, boolean>>({});
  const [seed, setSeed] = useState(7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveName, setSaveName] = useState("New Groove");

  useEffect(() => {
    if (project) {
      const loaded = toEnginePattern(project.pattern);
      setPattern(loaded);
      setSpec({
        style: loaded.style,
        tempo: loaded.tempo,
        bars: loaded.bars,
        swing: loaded.swing,
      });
      setSaveName(project.name);
      audioEngine.setPattern(loaded);
    }
  }, [project]);

  useEffect(() => {
    if (!fromAnalyze || projectId || pattern) return;
    const raw = sessionStorage.getItem("rhythmath.handoff");
    if (!raw) return;
    try {
      const handoff = JSON.parse(raw) as DrumPattern;
      const loaded = withId(handoff);
      setPattern(loaded);
      setSpec({ style: loaded.style, tempo: loaded.tempo, bars: loaded.bars, swing: loaded.swing });
      audioEngine.setPattern(loaded);
      sessionStorage.removeItem("rhythmath.handoff");
    } catch {
      sessionStorage.removeItem("rhythmath.handoff");
    }
  }, [fromAnalyze, projectId, pattern]);

  const handleParsed = useCallback((next: ParsedSpec) => {
    setParsed(next);
    setSpec((current) => ({ ...current, ...next.spec }));
  }, []);

  const generate = useCallback(() => {
    setIsGenerating(true);
    const started = performance.now();
    try {
      const result = generateGrooves(spec, {
        seed,
        candidates: 100,
        keep: 5,
        locked: Object.fromEntries(
          Object.entries(lockedRows)
            .filter(([, locked]) => locked)
            .map(([instrument]) => [instrument, pattern?.events.filter((event) => event.instrument === instrument) ?? []]),
        ),
      });
      setCandidates(result.winners);
      const next = result.winners[0]?.pattern ?? skeletonPattern(spec.style, spec.bars ?? 2, spec.tempo);
      setPattern(next);
      audioEngine.setPattern(next);
      if (isAuthenticated) {
        recordGeneration.mutate({
          data: {
            tradition: next.tradition,
            style: next.style,
            tempo: next.tempo,
            bars: next.bars,
            candidateCount: result.candidateCount,
            bestScore: result.winners[0]?.score.total ?? 0,
            durationMs: performance.now() - started,
          },
        });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [isAuthenticated, lockedRows, pattern, recordGeneration, seed, spec]);

  const updatePattern = (next: DrumPattern) => {
    setPattern(next);
    audioEngine.setPattern(next);
  };

  const save = () => {
    if (!pattern || !isAuthenticated) return;
    const data = { name: saveName.trim() || "New Groove", pattern: toApiPattern(pattern) };
    if (projectId) {
      updateProject.mutate({ id: projectId, data });
    } else {
      createProject.mutate({ data }, { onSuccess: (created) => setLocation(`/compose?project=${created.id}`) });
    }
  };

  const score = useMemo(() => (pattern ? scorePattern(pattern) : null), [pattern]);
  const metrics = useMemo(() => (pattern ? analyzePattern(pattern) : null), [pattern]);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <div className="absolute inset-0 math-grid pointer-events-none opacity-40" />
      <header className="relative z-10 flex-none border-b border-border bg-card/80 backdrop-blur px-5 py-4">
        <SpecBar onParsed={handleParsed} onGenerate={generate} isGenerating={isGenerating} />
        {parsed && (
          <p className="pl-7 pt-1 text-[10px] font-mono text-muted-foreground">
            {parsed.recognised.length} recognised tokens · {parsed.unparsed.length} unparsed
          </p>
        )}
      </header>
      <div className="relative z-10 flex-1 min-h-0 overflow-auto p-4">
        <div className="grid xl:grid-cols-[280px_minmax(0,1fr)_260px] gap-4 min-h-full">
          <aside className="space-y-4">
            <Controls spec={spec} seed={seed} onChangeSpec={setSpec} onChangeSeed={setSeed} />
            <Card>
              <CardContent className="p-4 space-y-2">
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Project name</label>
                <Input value={saveName} onChange={(event) => setSaveName(event.target.value)} className="font-mono" />
                <Button className="w-full font-mono text-xs uppercase" onClick={save} disabled={!isAuthenticated || !pattern}>
                  <Save className="w-3 h-3 mr-2" /> {projectId ? "Update" : "Save"}
                </Button>
              </CardContent>
            </Card>
            <Candidates candidates={candidates} selectedPattern={pattern} onSelect={updatePattern} />
          </aside>
          <main className="min-w-0 min-h-[620px] flex flex-col rounded-lg border border-border bg-card/40 overflow-hidden">
            {pattern ? (
              <>
                <Transport
                  pattern={pattern}
                  onChange={updatePattern}
                  onSave={save}
                  onRegenerate={generate}
                  isSaving={createProject.isPending || updateProject.isPending}
                  isGenerating={isGenerating}
                />
                <Editor
                  pattern={pattern}
                  onChange={updatePattern}
                  lockedRows={lockedRows}
                  onToggleLock={(instrument) => setLockedRows((current) => ({ ...current, [instrument]: !current[instrument] }))}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center">
                <div className="max-w-sm space-y-3">
                  <Binary className="w-10 h-10 mx-auto text-primary/60" />
                  <h2 className="font-mono text-lg">No groove selected</h2>
                  <p className="text-sm text-muted-foreground">Describe a rhythm above and generate candidates to open the editor.</p>
                </div>
              </div>
            )}
          </main>
          <aside className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary" /> Score
                </h3>
                {score ? (
                  <>
                    <div className="text-3xl font-mono font-bold text-primary">{score.total.toFixed(1)}<span className="text-xs text-muted-foreground"> / 100</span></div>
                    {score.terms.map((term) => (
                      <div key={term.key} title={term.explanation} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono"><span>{term.label}</span><span>{Math.round(term.value * 100)}%</span></div>
                        <div className="h-1.5 bg-muted rounded"><div className="h-full bg-primary rounded" style={{ width: `${term.value * 100}%` }} /></div>
                      </div>
                    ))}
                  </>
                ) : <p className="text-xs text-muted-foreground">Generate a pattern to see its score.</p>}
              </CardContent>
            </Card>
            {metrics && (
              <Card>
                <CardContent className="p-4 space-y-2 text-xs font-mono">
                  <h3 className="uppercase tracking-widest text-muted-foreground mb-3">Metrics</h3>
                  <div className="flex justify-between"><span>Syncopation</span><span>{(metrics.syncopation * 100).toFixed(0)}%</span></div>
                  <div className="flex justify-between"><span>Density</span><span>{metrics.density.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Swing</span><span>{metrics.swingRatio.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Velocity variance</span><span>{metrics.velocityVariance.toFixed(2)}</span></div>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}