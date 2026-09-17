import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Activity, Library, PlaySquare, AudioWaveform, AudioLines, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isAuthenticated, login, logout, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { href: "/compose", label: "Compose", icon: PlaySquare },
    { href: "/analyze", label: "Analyze", icon: AudioWaveform },
    { href: "/sounds", label: "Sounds", icon: AudioLines },
    { href: "/library", label: "Library", icon: Library },
    { href: "/about", label: "About", icon: Activity },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background text-foreground font-sans">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center border border-primary/50">
            <div className="w-4 h-4 bg-primary rotate-45" />
          </div>
          <span className="font-mono font-bold text-lg tracking-tight">
            RHYTHMATH
          </span>
        </Link>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-muted-foreground">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card/50 flex-col transition-all md:flex",
        mobileMenuOpen ? "flex" : "hidden"
      )}>
        <div className="hidden md:flex p-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center border border-primary/50 group-hover:bg-primary/30 transition-colors">
              <div className="w-4 h-4 bg-primary rotate-45 transform group-hover:rotate-90 transition-transform duration-500" />
            </div>
            <span className="font-mono font-bold text-lg tracking-tight">
              RHYTHMATH
            </span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-4 md:py-0 space-y-1">
          {links.map((link) => {
            const active = location.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  active 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border bg-background/50">
          {isAuthenticated ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center border border-secondary/30">
                  <span className="text-secondary font-mono text-xs font-bold">
                    {user?.firstName?.[0] || user?.email?.[0] || "?"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground truncate w-32">
                    {user?.firstName || "Musician"}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground truncate w-32">
                    {user?.email}
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={logout} className="w-full text-xs font-mono">
                Sign out
              </Button>
            </div>
          ) : (
            <Button onClick={login} className="w-full font-mono text-xs uppercase tracking-wider">
              Sign In
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col min-h-0">
        {children}
      </main>
    </div>
  );
}
