'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25',
      secondary: 'bg-wood-light hover:bg-wood text-white shadow-md',
      danger: 'bg-danger hover:bg-danger/90 text-white shadow-md',
      ghost: 'bg-transparent hover:bg-day-card text-day-text',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-lg',
      md: 'px-5 py-2.5 text-base rounded-xl',
      lg: 'px-8 py-3.5 text-lg rounded-2xl',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'font-heading font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2',
          variants[variant],
          sizes[size],
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
export { Button, type ButtonProps };
