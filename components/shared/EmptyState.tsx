import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  actionHref?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'md',
}: EmptyStateProps) {
  const sizeMap = {
    sm: { py: 'py-8',  iconBox: 'w-10 h-10', icon: 'w-5 h-5',  title: 'text-sm',  desc: 'text-xs'  },
    md: { py: 'py-14', iconBox: 'w-14 h-14', icon: 'w-6 h-6',  title: 'text-base', desc: 'text-sm' },
    lg: { py: 'py-20', iconBox: 'w-16 h-16', icon: 'w-7 h-7',  title: 'text-lg',  desc: 'text-sm'  },
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${sizeMap.py} px-6`}>
      {Icon && (
        <div
          className={`${sizeMap.iconBox} rounded-full flex items-center justify-center mb-4`}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
          }}
        >
          <Icon className={`${sizeMap.icon}`} style={{ color: 'var(--text-muted)' }} />
        </div>
      )}
      <h3
        className={`font-semibold mb-1 ${sizeMap.title}`}
        style={{ color: 'var(--text-heading)' }}
      >
        {title}
      </h3>
      {description && (
        <p
          className={`max-w-xs ${sizeMap.desc}`}
          style={{ color: 'var(--text-muted)' }}
        >
          {description}
        </p>
      )}
      {action && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
