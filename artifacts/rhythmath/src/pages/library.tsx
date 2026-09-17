import { useAuth } from "@workspace/replit-auth-web";
import { useListProjects, useDeleteProject, useDuplicateProject } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Library as LibIcon, Trash2, Copy, PlaySquare, Calendar, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Library() {
  const { isAuthenticated, login } = useAuth();
  const [, setLocation] = useLocation();
  const { data: projects, isLoading } = useListProjects({
    query: { enabled: isAuthenticated, queryKey: ['listProjects'] }
  });

  const deleteProject = useDeleteProject();
  const duplicateProject = useDuplicateProject();

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background">
        <div className="max-w-md text-center space-y-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
            <LibIcon className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold font-sans">Your Library</h1>
          <p className="text-muted-foreground">Sign in to save generated grooves, edit patterns, and access them across devices.</p>
          <Button size="lg" onClick={login} className="font-mono uppercase tracking-widest font-bold w-full">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <LibIcon className="w-8 h-8 text-primary" />
              Library
            </h1>
            <p className="text-muted-foreground font-light text-lg">
              Saved grooves and compositions.
            </p>
          </div>
          <Link href="/compose">
            <Button className="font-mono uppercase tracking-widest text-xs">
              <PlaySquare className="w-4 h-4 mr-2" /> New Groove
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : projects?.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-border rounded-lg bg-card/30">
            <p className="font-mono text-sm text-muted-foreground mb-6">Your library is empty.</p>
            <Link href="/compose">
              <Button variant="outline" className="font-mono uppercase text-xs">
                Start Composing
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects?.map((p) => (
              <Card key={p.id} className="border-border bg-card hover:border-primary/50 transition-colors group">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setLocation(`/compose?project=${p.id}`)}>
                    <div className={`w-12 h-12 rounded flex items-center justify-center font-bold text-xl ${
                      p.tradition === 'samba' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'
                    }`}>
                      {p.tempo}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{p.name}</h3>
                      <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mt-1">
                        <span className="uppercase tracking-widest text-foreground/70">{p.style}</span>
                        <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {p.meter.beatsPerBar}/{p.meter.beatUnit}</span>
                        <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {formatDistanceToNow(new Date(p.updatedAt))} ago</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="font-mono text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateProject.mutate({ id: p.id });
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" /> Duplicate
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject.mutate({ id: p.id });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
