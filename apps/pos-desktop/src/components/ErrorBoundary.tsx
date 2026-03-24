import React from "react";
import { Button, Icon } from "@repo/ui";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error Boundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="rounded-full bg-destructive/10 p-4 mb-4">
            <Icon name="AlertCircle" className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            An unexpected error occurred. The error has been logged. You can try
            refreshing the page or go back.
          </p>
          {this.state.error && (
            <details className="mb-4 max-w-lg">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                View error details
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded-md text-left text-xs overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <Icon name="RefreshCw" className="mr-2 h-4 w-4" />
              Refresh Page
            </Button>
            <Button onClick={this.handleReset}>
              <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
