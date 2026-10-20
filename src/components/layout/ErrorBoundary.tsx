import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useLocale } from "@/i18n";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

function ErrorFallbackView({
  fallbackTitle,
  error,
  onReset,
}: {
  fallbackTitle?: string;
  error?: Error;
  onReset: () => void;
}) {
  const { t } = useLocale();

  return (
    <div className="p-6 my-4 bg-surface border border-hairline rounded-2xl text-center space-y-4 max-w-md mx-auto">
      <div className="w-12 h-12 rounded-2xl bg-danger-tint text-danger flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-base font-bold text-ink">
          {fallbackTitle || t("common.somethingWentWrong")}
        </h3>
        <p className="text-xs text-ink-muted mt-1 max-w-xs mx-auto">
          {error?.message || t("common.unexpectedError")}
        </p>
      </div>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white font-semibold text-xs hover:bg-accent/90 transition shadow-md shadow-accent/20"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        {t("common.reloadPage")}
      </button>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallbackView
          fallbackTitle={this.props.fallbackTitle}
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
