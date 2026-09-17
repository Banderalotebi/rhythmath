import React from "react";

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; resetKey?: any },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: any) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-background">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-destructive font-mono text-2xl font-bold">!</span>
          </div>
          <h2 className="text-xl font-bold font-sans text-foreground">Something went wrong</h2>
          <p className="text-sm font-mono text-muted-foreground max-w-md bg-muted p-4 rounded text-left overflow-auto">
            {this.state.error?.message}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-6 py-2 bg-primary text-primary-foreground font-mono uppercase text-sm tracking-wider rounded font-bold"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
