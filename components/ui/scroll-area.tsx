import * as React from 'react';
import { cn } from '@/lib/utils';

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: 'vertical' | 'horizontal' }
>(({ className, children, orientation = 'vertical', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative overflow-hidden',
      orientation === 'vertical' ? 'overflow-y-auto' : 'overflow-x-auto',
      '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent',
      '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--scrollbar-thumb)]',
      '[&::-webkit-scrollbar-thumb:hover]:bg-[var(--scrollbar-thumb-hover)]',
      className
    )}
    {...props}
  >
    {children}
  </div>
));
ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };
