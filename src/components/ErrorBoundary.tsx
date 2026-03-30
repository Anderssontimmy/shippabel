import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-danger" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {this.props.fallbackTitle ?? "Something went wrong"}
          </h3>
          <p className="text-surface-400 text-sm mb-6 max-w-md">
            An unexpected error occurred. Try refreshing this section.
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-white text-sm transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
