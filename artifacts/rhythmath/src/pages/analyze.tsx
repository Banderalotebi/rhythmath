import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, AudioWaveform, ArrowRight, Music2 } from "lucide-react";
import { analyzeAudio, METERS, type AnalysisResult, type Tradition } from "@workspace/engine";
import { decodeAudioFile } from "@/audio/decode";

export default function Analyze() {
  const [, setLocation] = useLocation();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [sampleRate, setSampleRate] = useState(44100);
  const [tradition, setTradition] = useState<Tradition>("samba");
  const [tempoOverride, setTempoOverride] = useState("");
  const [meterKey, setMeterKey] = useState("4/4");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const analyzeFile = async (file?: File) => {
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const decoded = await decodeAudioFile(file);
      const meter = METERS[meterKey] ?? METERS["4/4"];
      const { channelData } = decoded;
      setAudioData(channelData);
      setSampleRate(decoded.sampleRate);
      
      const analysis = analyzeAudio(channelData, decoded.sampleRate, {
        tradition,
        meter,
        ...(tempoOverride ? { tempo: Number(tempoOverride) } : {}),
      });
      setResult(analysis);
      
    } catch (err) {
      console.error(err);
      setError("Failed to analyze audio file. Must be valid WAV/MP3/OGG/FLAC.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await analyzeFile(e.target.files?.[0]);
  };

  const sendToCompose = () => {
    if (!result?.pattern) return;
    sessionStorage.setItem("rhythmath.handoff", JSON.stringify(result.pattern));
    setLocation("/compose?from=analyze");
  };

  useEffect(() => {
    if (!result || !audioData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw waveform
    ctx.fillStyle = "rgba(100, 100, 150, 0.2)";
    const step = Math.ceil(audioData.length / width);
    const amp = height / 2;
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = audioData[i * step + j]; 
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
    }

    // Draw onsets
    ctx.fillStyle = "rgba(0, 255, 255, 0.8)";
     const duration = audioData.length / sampleRate;
    result.onsets.forEach(onset => {
      const x = (onset.time / duration) * width;
      ctx.fillRect(x - 1, 0, 2, height);
    });

  }, [result, audioData, sampleRate]);

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <AudioWaveform className="w-8 h-8 text-primary" />
            Analyze Audio
          </h1>
          <p className="text-muted-foreground font-light text-lg">
            Drop a percussion loop here to extract tempo, meter, and quantised patterns.
            Runs entirely in your browser.
          </p>
        </div>

         {!result ? (
           <>
           <Card className="border-border bg-card/50">
             <CardContent className="p-4 grid sm:grid-cols-3 gap-4">
               <label className="text-xs font-mono space-y-2">
                 <span className="text-muted-foreground uppercase">Tradition</span>
                 <select className="h-9 w-full rounded border border-input bg-background px-2" value={tradition} onChange={(e) => setTradition(e.target.value as Tradition)}>
                   <option value="samba">Samba</option>
                   <option value="arabic">Arabic iqāʿāt</option>
                 </select>
               </label>
               <label className="text-xs font-mono space-y-2">
                 <span className="text-muted-foreground uppercase">Meter</span>
                 <select className="h-9 w-full rounded border border-input bg-background px-2" value={meterKey} onChange={(e) => setMeterKey(e.target.value)}>
                   {Object.keys(METERS).map((key) => <option key={key} value={key}>{key}</option>)}
                 </select>
               </label>
               <label className="text-xs font-mono space-y-2">
                 <span className="text-muted-foreground uppercase">Tempo override</span>
                 <input className="h-9 w-full rounded border border-input bg-background px-2" type="number" min="30" max="300" placeholder="Auto-estimate" value={tempoOverride} onChange={(e) => setTempoOverride(e.target.value)} />
               </label>
             </CardContent>
           </Card>
          <Card className="border-2 border-dashed border-border bg-card/30">
             <CardContent
               className="flex flex-col items-center justify-center p-12 text-center min-h-[300px]"
               onDragOver={(e) => e.preventDefault()}
               onDrop={(e) => { e.preventDefault(); void analyzeFile(e.dataTransfer.files[0]); }}
             >
              {isAnalyzing ? (
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
                  <p className="font-mono text-sm uppercase tracking-wider text-muted-foreground">Decoding Audio...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium text-lg">Click to upload or drag & drop</p>
                    <p className="text-sm text-muted-foreground">WAV, MP3, OGG, or FLAC</p>
                  </div>
                  <label className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm h-10 px-8 py-2 font-mono uppercase">
                    Select File
                    <input type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
                  </label>
                  {error && <p className="text-destructive text-sm mt-4">{error}</p>}
                </div>
              )}
            </CardContent>
          </Card>
           </>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <Card className="border-border bg-card p-4">
               <canvas ref={canvasRef} width={800} height={150} className="w-full h-[150px] bg-background rounded border border-border/50" />
            </Card>

            <div className="flex flex-wrap items-center justify-between p-4 bg-card border border-border rounded-lg gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 text-primary rounded flex items-center justify-center">
                  <Music2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg font-mono">{Math.round(result.tempo)} BPM</h3>
                  <p className="text-sm text-muted-foreground capitalize">{result.tempoSource} tempo • {result.meter.beatsPerBar}/{result.meter.beatUnit}</p>
                </div>
              </div>
              <Button onClick={sendToCompose} className="font-mono text-sm uppercase">
                Send to Compose <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h4 className="text-sm font-mono text-muted-foreground uppercase tracking-widest font-bold">Metrics</h4>
                  <div className="space-y-3 font-mono text-sm">
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Syncopation</span>
                      <span className="font-bold">{(result.metrics.syncopation * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Swing Ratio</span>
                      <span className="font-bold">{result.metrics.swingRatio.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Density</span>
                      <span className="font-bold">{result.metrics.density.toFixed(1)} onsets/beat</span>
                    </div>
                    <div className="flex justify-between pb-2">
                      <span className="text-muted-foreground">Grid Fit</span>
                      <span className="font-bold text-primary">{(result.gridFit * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <h4 className="text-sm font-mono text-muted-foreground uppercase tracking-widest font-bold">Closest Grammars</h4>
                  <div className="space-y-3">
                    {result.closestGrammars.slice(0, 3).map((g, i) => (
                      <div key={i} className="flex justify-between items-center bg-muted/50 p-3 rounded">
                        <span className="font-medium text-sm">{g.displayName}</span>
                        <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                          {(g.similarity * 100).toFixed(1)}% Match
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardContent className="p-5 space-y-3">
                <h4 className="text-sm font-mono text-muted-foreground uppercase tracking-widest font-bold">Quantised pattern</h4>
                <div className="overflow-x-auto">
                  <div className="min-w-[620px] space-y-1">
                    {result.pattern.instruments.map((instrument) => (
                      <div key={instrument} className="flex gap-1">
                        <span className="w-32 shrink-0 text-[10px] font-mono text-muted-foreground truncate">{instrument}</span>
                        {Array.from({ length: result.meter.beatsPerBar * result.meter.stepsPerBeat * result.bars }).map((_, step) => (
                          <span key={step} className={`h-4 flex-1 rounded-sm ${result.pattern.events.some((event) => event.instrument === instrument && event.step === step) ? "bg-primary" : "bg-muted/50"}`} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-center mt-8">
               <Button variant="ghost" onClick={() => setResult(null)} className="font-mono text-xs text-muted-foreground">
                 Analyze Another File
               </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
