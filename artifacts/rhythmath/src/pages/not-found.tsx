import { Link } from "wouter";
export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background p-6">
      <h1 className="font-mono text-6xl font-bold text-muted-foreground mb-4">404</h1>
      <p className="text-xl font-sans text-foreground mb-8">Pattern Not Found.</p>
      <Link href="/">
        <button className="px-6 py-2 bg-primary text-primary-foreground font-mono uppercase text-sm tracking-wider rounded font-bold">
          Return to Base
        </button>
      </Link>
    </div>
  );
}
