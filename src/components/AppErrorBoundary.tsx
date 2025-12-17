import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App crashed:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground safe-area-all">
        <main className="container max-w-md mx-auto px-4 py-10 flex flex-col items-center text-center gap-4">
          <Logo size="medium" />

          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <p className="text-sm font-medium">Noe gikk galt</p>
          </div>

          <p className="text-sm text-muted-foreground">
            Appen klarte ikke å starte. Prøv å laste på nytt.
          </p>

          <div className="flex w-full gap-2">
            <Button className="flex-1" onClick={() => window.location.reload()}>
              Last på nytt
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => (window.location.href = "/")}
            >
              Til start
            </Button>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <pre className="w-full text-left text-xs bg-muted p-3 rounded-lg overflow-auto">
              {this.state.error.stack ?? this.state.error.message}
            </pre>
          )}
        </main>
      </div>
    );
  }
}
