import * as React from 'react';
import { cn } from '@/lib/utils';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'warning' | 'success';
}

const variantStyles = {
  default: {
    container: 'border-[var(--border-default)] bg-[var(--bg-elevated)]',
    icon: 'text-[var(--text-muted)]',
    title: 'text-[var(--text-heading)]',
    desc: 'text-[var(--text-secondary)]',
  },
  destructive: {
    container: 'border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/20',
    icon: 'text-red-600 dark:text-red-400',
    title: 'text-red-800 dark:text-red-300',
    desc: 'text-red-700 dark:text-red-400',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20',
    icon: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-800 dark:text-amber-300',
    desc: 'text-amber-700 dark:text-amber-400',
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/20',
    icon: 'text-emerald-600 dark:text-emerald-400',
    title: 'text-emerald-800 dark:text-emerald-300',
    desc: 'text-emerald-700 dark:text-emerald-400',
  },
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const styles = variantStyles[variant];
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-xl border px-4 py-3.5 text-sm',
          '[&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4',
          styles.container,
          className
        )}
        {...props}
      />
    );
  }
);
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & { variant?: AlertProps['variant'] }
>(({ className, variant = 'default', ...props }, ref) => {
  const styles = variantStyles[variant];
  return (
    <h5
      ref={ref}
      className={cn('mb-1 font-semibold leading-none tracking-tight text-sm', styles.title, className)}
      {...props}
    />
  );
});
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & { variant?: AlertProps['variant'] }
>(({ className, variant = 'default', ...props }, ref) => {
  const styles = variantStyles[variant];
  return (
    <div
      ref={ref}
      className={cn('text-sm [&_p]:leading-relaxed', styles.desc, className)}
      {...props}
    />
  );
});
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
