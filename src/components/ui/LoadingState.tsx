import React from 'react';

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading FamilyHub...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-3">
      <div className="relative">
        <div className="w-10 h-10 border-3 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 rounded-full animate-spin" />
      </div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
};
