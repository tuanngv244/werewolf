'use client';

import { Fragment, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative bg-white rounded-3xl shadow-2xl p-6 mx-4 w-full animate-bounce-in',
          sizes[size],
        )}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-bold text-day-text">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-day-card flex items-center justify-center text-day-muted hover:text-day-text transition-colors"
            >
              &times;
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
