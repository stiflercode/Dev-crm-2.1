import { cn } from '@/lib/utils';

interface SectionCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  noPadding?: boolean;
  compact?: boolean;
}

export function SectionCard({
  title,
  description,
  children,
  className,
  headerAction,
  noPadding = false,
  compact = false,
}: SectionCardProps) {
  const padClass = noPadding ? '' : compact ? 'p-4' : 'p-5 sm:p-6';

  return (
    <div
      className={cn('form-section', className)}
    >
      {(title || headerAction) && (
        <div
          className={cn(
            'flex items-center justify-between gap-4',
            !noPadding && compact ? 'px-4 pt-4 pb-3' : !noPadding ? 'px-5 sm:px-6 pt-5 pb-4' : 'px-5 py-3',
            (title || headerAction) && 'border-b border-[var(--border-default)]',
            noPadding && 'pb-3'
          )}
        >
          <div className="min-w-0">
            {title && (
              <p className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}>
                {title}
              </p>
            )}
            {description && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {description}
              </p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      <div className={cn(noPadding ? '' : padClass)}>
        {children}
      </div>
    </div>
  );
}
