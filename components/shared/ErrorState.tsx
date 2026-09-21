import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  inline?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred. Please try again or contact support if the problem persists.',
  onRetry,
  inline = false,
}: ErrorStateProps) {
  if (inline) {
    return (
      <div
        className="flex items-start gap-3 rounded-lg p-4 text-sm"
        style={{
          background: 'rgba(220, 38, 38, 0.05)',
          border: '1px solid rgba(220, 38, 38, 0.2)',
        }}
      >
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-red-700 dark:text-red-400">{title}</p>
          <p className="text-red-600/80 dark:text-red-400/70 mt-0.5 text-xs">{message}</p>
        </div>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="shrink-0 h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{
          background: 'rgba(220, 38, 38, 0.06)',
          border: '1px solid rgba(220, 38, 38, 0.15)',
        }}
      >
        <AlertTriangle className="w-6 h-6 text-red-500" />
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>
        {title}
      </h3>
      <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </Button>
      )}
    </div>
  );
}
