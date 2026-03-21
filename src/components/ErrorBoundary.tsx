import { Component, type ErrorInfo, type ReactNode } from "react";
import { captureError } from "@/lib/observability";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    captureError(error, {
      source: "boundary",
      context: { componentStack: info.componentStack?.slice(0, 4_000) },
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const err = this.state.error;
      return (
        <div
          className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-6 text-sm"
          style={{
            fontFamily: "system-ui, sans-serif",
            background: "#0A0F1F",
            color: "#e2e8f0",
          }}
          role="alert"
        >
          <p className="max-w-md text-center">Something went wrong. Try a hard refresh.</p>
          {import.meta.env.DEV && err ? (
            <pre
              className="max-h-48 max-w-full overflow-auto rounded-md border border-white/10 bg-black/30 p-3 text-left text-xs text-red-300"
              style={{ wordBreak: "break-word" }}
            >
              {err.message}
            </pre>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}
