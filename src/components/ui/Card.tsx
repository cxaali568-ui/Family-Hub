import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'flat' | 'interactive' | 'private' | 'urgent';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variants = {
    default: 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_3px_0_rgba(0,0,0,0.04)] rounded-2xl relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent dark:before:via-white/10 overflow-hidden',
    flat: 'bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl',
    interactive: 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1),0_2px_6px_-1px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all cursor-pointer rounded-2xl relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent dark:before:via-white/10 overflow-hidden',
    private: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-[0_4px_16px_-2px_rgba(79,70,229,0.25)] rounded-2xl relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-indigo-400/40 before:to-transparent overflow-hidden',
    urgent: 'bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 shadow-[0_2px_8px_-2px_rgba(225,29,72,0.15)] rounded-2xl',
  };

  return (
    <div className={`p-4 md:p-5 transition-colors ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};
