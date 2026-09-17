import { Activity, ShieldCheck, Cpu, Code2 } from "lucide-react";

export default function About() {
  return (
    <div className="flex-1 p-6 overflow-y-auto bg-background text-foreground">
      <div className="max-w-3xl mx-auto py-12 space-y-16">
        
        <header className="space-y-6 border-b border-border pb-12">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-2xl mb-4 text-primary border border-primary/20">
            <Activity className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">About Rhythmath</h1>
          <p className="text-xl text-muted-foreground font-light leading-relaxed">
            An open-source music engine treating rhythm as mathematics.
            Built to generate, score, and explain authentic percussion grooves.
          </p>
        </header>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold font-sans flex items-center gap-3">
            <Cpu className="w-6 h-6 text-primary" /> The Method
          </h2>
          <div className="prose prose-invert prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none">
            <p>
              Rhythmath does not use large language models or scraped datasets. It uses a deterministic, rule-based approach 
              grounded in deep musical study of each tradition.
            </p>
            <p>
              The engine compiles <strong>Grammars</strong> (templates of what an instrument plays in a given style) and 
              applies <strong>Markov variation</strong> based on energy levels. For every generation request, the engine produces 
              100 candidate grooves. Each candidate is run through a rigorous <strong>scoring function</strong> looking at syncopation, 
              density, swing, and interlocking pairs.
            </p>
            <p>
              The top candidates are passed through a novelty filter to ensure you see 5 distinct grooves. The winning grooves 
              are presented with plain-language explanations of why they scored highly.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold font-sans flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-secondary" /> The Provenance Promise
          </h2>
          <div className="bg-card border border-border p-6 rounded-lg space-y-4">
            <p className="text-muted-foreground">
              We believe machine generation in music must respect the human traditions it models. Rhythmath guarantees:
            </p>
            <ul className="space-y-3 font-mono text-sm">
              <li className="flex items-start gap-3">
                <span className="text-primary">01</span>
                <span className="text-foreground"><strong>No scraped audio datasets.</strong> All grammars are transcribed directly or sourced with permission.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary">02</span>
                <span className="text-foreground"><strong>Explicit attribution.</strong> Built-in sample kits use modal synthesis (math, not recordings) or explicitly licensed sounds.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary">03</span>
                <span className="text-foreground"><strong>Sample Contributor License.</strong> Any uploaded sounds must have explicit ownership assertion from the user.</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold font-sans flex items-center gap-3">
            <Code2 className="w-6 h-6 text-primary" /> Licensing & Code
          </h2>
          <div className="prose prose-invert prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none">
            <p>
              Rhythmath uses a dual-license structure:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 marker:text-primary">
              <li><strong>The Engine</strong> (`@workspace/engine`) is licensed under <strong>Apache-2.0</strong>. You can use it in commercial plugins or DAWs.</li>
              <li><strong>The Platform</strong> (this web interface) is licensed under <strong>AGPL-3.0</strong>.</li>
            </ul>
            <p className="pt-4">
              All generated MIDI and WAV files belong to the user. No credits required.
            </p>
            <div className="pt-6">
              <a 
                href="https://github.com/Banderalotebi/rhythmath" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-8 py-2 font-mono uppercase tracking-widest"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
