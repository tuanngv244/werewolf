import { cn } from '@/lib/utils';

interface BadgeProps {
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const variants = {
    default: 'bg-day-card text-day-text',
    success: 'bg-status-alive/10 text-status-alive',
    danger: 'bg-danger/10 text-danger',
    warning: 'bg-seer-unknown/10 text-seer-unknown',
    info: 'bg-primary/10 text-primary',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
