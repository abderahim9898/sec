import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  overlay?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  text,
  overlay = false
}) => {
  const spinner = (
    <div className={cn(
      'flex items-center justify-center',
      overlay ? 'absolute inset-0 bg-white/80 backdrop-blur-sm z-50' : '',
      className
    )}>
      <div className="flex flex-col items-center space-y-2">
        <Loader2 className={cn(
          'animate-spin text-blue-600',
          sizeClasses[size]
        )} />
        {text && (
          <p className="text-sm text-gray-600 font-medium">
            {text}
          </p>
        )}
      </div>
    </div>
  );

  return spinner;
};

// Page-level loading component
export const PageLoading: React.FC<{ text?: string }> = ({ text = 'Chargement...' }) => (
  <div className="min-h-[400px] flex items-center justify-center">
    <LoadingSpinner size="xl" text={text} />
  </div>
);

// Inline loading component for buttons
export const ButtonLoading: React.FC<{ text?: string }> = ({ text }) => (
  <div className="flex items-center">
    <LoadingSpinner size="sm" className="mr-2" />
    {text && <span>{text}</span>}
  </div>
);

// Table loading component
export const TableLoading: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div 
            key={colIndex} 
            className="h-4 bg-gray-200 rounded animate-pulse flex-1"
          />
        ))}
      </div>
    ))}
  </div>
);

// Card loading skeleton
export const CardLoading: React.FC = () => (
  <div className="p-6 space-y-4">
    <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6" />
    </div>
  </div>
);
