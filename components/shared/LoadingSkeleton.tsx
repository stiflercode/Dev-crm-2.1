import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  variant?: 'table' | 'card' | 'form' | 'metric' | 'text' | 'list';
  rows?: number;
  className?: string;
}

function SkeletonBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('skeleton rounded', className)} style={style} />;
}

export function LoadingSkeleton({ variant = 'text', rows = 5, className }: LoadingSkeletonProps) {
  if (variant === 'table') {
    return (
      <div className={cn('form-section overflow-hidden', className)}>
        {/* Table header */}
        <div className="flex gap-4 px-4 py-3 border-b border-[var(--border-default)] bg-[#EFF6FF] dark:bg-[#1A2338]">
          {[20, 30, 25, 15, 10].map((w, i) => (
            <SkeletonBlock key={i} className={`h-3 w-[${w}%]`} style={{ width: `${w}%` } as React.CSSProperties} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-[var(--border-muted)] last:border-0">
            <SkeletonBlock className="h-3.5 flex-[2]" />
            <SkeletonBlock className="h-3.5 flex-[3]" />
            <SkeletonBlock className="h-3.5 flex-[2.5]" />
            <SkeletonBlock className="h-5 w-16 rounded-full" />
            <SkeletonBlock className="h-3.5 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'metric') {
    return (
      <div className={cn('grid grid-cols-2 xl:grid-cols-4 gap-4', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card">
            <SkeletonBlock className="h-3 w-24 mb-3" />
            <SkeletonBlock className="h-7 w-16 mb-2" />
            <SkeletonBlock className="h-2.5 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('form-section space-y-3', className)}>
        <SkeletonBlock className="h-4 w-1/3 mb-4" />
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div className={cn('space-y-5', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-9 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="form-section p-4 flex items-center gap-3">
            <SkeletonBlock className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <SkeletonBlock className="h-3 w-1/2" />
              <SkeletonBlock className="h-2.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // default: text lines
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} className={`h-3 ${i === rows - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}
