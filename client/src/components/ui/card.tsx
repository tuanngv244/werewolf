'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'game' | 'night';
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover = false, children, ...props }, ref) => {
    const variants = {
      default: 'bg-white border border-day-border shadow-sm',
      game: 'bg-day-card border-2 border-wood-light/30 shadow-lg',
      night: 'bg-night-card border border-night-border shadow-lg',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl p-6',
          variants[variant],
          hover && 'transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl cursor-pointer',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
export { Card, type CardProps };
