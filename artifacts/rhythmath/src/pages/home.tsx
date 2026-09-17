import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useGetStats, useGetRecentActivity } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Play, Square, Activity, Github, Users, Mic, Binary, Zap } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { audioEngine, useAudioEngine } from "@/audio/engine";
import { STARTER_KITS } from "@/audio/kits";
import { skeletonPattern } from "@workspace/engine";

export default function Home() {
  const { isAuthenticated, login } = useAuth();
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: activities, isLoading: activitiesLoading } = useGetRecentActivity();
  
  const [demoTradition, setDemoTradition] = useState<"samba" | "arabic" | null>(null);
  const audioState = useAudioEngine();

  const toggleDemo = async (tradition: "samba" | "arabic") => {
    await audioEngine.unlock();
    
    if (audioState.isPlaying && demoTradition === tradition) {
      audioEngine.stop();
      setDemoTradition(null);
    } else {
      const kit = STARTER_KITS.find(k => k.tradition === tradition);
      if (kit) {
        await audioEngine.loadKit(kit);
        const styleId = tradition === "samba" ? "samba.batucada" : "arabic.maqsum";
        const tempo = tradition === "samba" ? 140 : 110;
        const pattern = skeletonPattern(styleId, 1, tempo);
        audioEngine.setPattern(pattern);
        audioEngine.play();
        setDemoTradition(tradition);
      }
    }
  };

  useEffect(() => {
    return () => audioEngine.stop();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero Section */}
      <section className="relative px-6 py-24 md:py-32 math-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono font-medium mb-4">
            <Binary className="w-3 h-3" />
            <span>Open-Source Music Engine</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            Rhythm as <span className="text-primary italic">Mathematics</span>.
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            Generate, score, and explain percussion grooves from the living traditions of Rio and Riyadh.
            Precise, tactile, and alive with motion.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-8">
            <Link href="/compose" className="inline-flex">
              <Button size="lg" className="h-12 px-8 font-mono text-sm uppercase tracking-wider font-bold">
                Start Composing
              </Button>
            </Link>
            
            {!isAuthenticated && (
              <Button size="lg" variant="outline" onClick={login} className="h-12 px-8 font-mono text-sm uppercase tracking-wider">
                Sign In to Save
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="px-6 py-16 bg-muted/30 border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-background border-primary/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-primary">Rio Batucada</span>
                </CardTitle>
                <CardDescription>Samba grammar, 140 BPM, heavy swing</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant={audioState.isPlaying && demoTradition === "samba" ? "default" : "outline"}
                  className="w-full border-primary/50"
                  onClick={() => toggleDemo("samba")}
                >
                  {audioState.isPlaying && demoTradition === "samba" ? (
                    <><Square className="w-4 h-4 mr-2" /> Stop Demo</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" /> Play Demo</>
                  )}
                </Button>
                {audioState.isPlaying && demoTradition === "samba" && (
                  <div className="mt-4 flex gap-1 h-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`flex-1 rounded-sm transition-colors duration-75 ${
                          audioState.currentStep % 8 === i ? 'bg-primary' : 'bg-primary/20'
                        }`} 
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-background border-secondary/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-secondary">Arabic Maqsūm</span>
                </CardTitle>
                <CardDescription>Iqāʿāt grammar, 110 BPM, precise</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant={audioState.isPlaying && demoTradition === "arabic" ? "secondary" : "outline"}
                  className="w-full border-secondary/50 hover:text-secondary-foreground"
                  onClick={() => toggleDemo("arabic")}
                >
                  {audioState.isPlaying && demoTradition === "arabic" ? (
                    <><Square className="w-4 h-4 mr-2" /> Stop Demo</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" /> Play Demo</>
                  )}
                </Button>
                {audioState.isPlaying && demoTradition === "arabic" && (
                  <div className="mt-4 flex gap-1 h-2">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`flex-1 rounded-sm transition-colors duration-75 ${
                          audioState.currentStep % 16 === i ? 'bg-secondary' : 'bg-secondary/20'
                        }`} 
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats & Activity */}
      <section className="px-6 py-24">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-12">
          {/* Stats Column */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <h2 className="text-xl font-bold font-mono uppercase tracking-widest flex items-center gap-2 mb-6 text-foreground/80">
                <Activity className="w-5 h-5 text-primary" /> Live Telemetry
              </h2>
            </div>
            
            {statsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
              </div>
            ) : stats ? (
              <div className="space-y-4">
                <StatCard label="Grooves Generated" value={stats.generations} icon={Zap} />
                <StatCard label="Saved Projects" value={stats.projects} icon={Users} />
                <StatCard label="Samples Uploaded" value={stats.samplesUploaded} icon={Mic} />
                <StatCard 
                  label="Avg Generation Time" 
                  value={stats.averageGenerationMs ? `${Math.round(stats.averageGenerationMs)}ms` : "—"} 
                  icon={Binary} 
                />
              </div>
            ) : null}
            
            <a 
              href="https://github.com/Banderalotebi/rhythmath" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mt-8"
            >
              <Github className="w-4 h-4" />
              github.com/Banderalotebi/rhythmath
            </a>
          </div>

          {/* Activity Column */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold font-mono uppercase tracking-widest flex items-center gap-2 mb-6 text-foreground/80">
              <Activity className="w-5 h-5 text-secondary" /> Recent Activity
            </h2>
            
            {activitiesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />)}
              </div>
            ) : activities ? (
              <div className="space-y-3">
                {activities.map((act) => (
                  <div key={act.id} className="flex items-center justify-between p-4 rounded-md border border-border bg-card/50 hover:bg-card transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${act.tradition === 'samba' ? 'bg-primary' : 'bg-secondary'}`} />
                      <div>
                        <p className="font-mono text-sm text-foreground">
                          {act.kind === 'generation' ? 'Generated' : 'Saved'} <span className="font-bold">{act.style}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {act.tempo} BPM • {new Date(act.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="p-8 text-center border border-dashed border-border rounded-md text-muted-foreground font-mono text-sm">
                    No recent activity on the network.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string, value: number | string, icon: React.ElementType }) {
  return (
    <Card className="border-border/50 bg-background overflow-hidden relative">
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none">
        <Icon className="w-32 h-32" />
      </div>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1 font-sans">{label}</p>
        <p className="text-3xl font-mono font-bold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      </CardContent>
    </Card>
  );
}
