import React from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'away' | 'offline';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  status,
  className = '',
}) => {
  const [imageError, setImageError] = React.useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-semibold',
    lg: 'w-12 h-12 text-base font-semibold',
    xl: 'w-16 h-16 text-xl font-bold',
  };

  const statusDotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
  };

  const statusColors = {
    online: 'bg-emerald-500 ring-white dark:ring-slate-900',
    away: 'bg-amber-500 ring-white dark:ring-slate-900',
    offline: 'bg-slate-300 dark:bg-slate-600 ring-white dark:ring-slate-900',
  };

  const initials = name
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Pick deterministic friendly background color based on name
  const bgColors = [
    'bg-indigo-500 text-white',
    'bg-emerald-500 text-white',
    'bg-rose-500 text-white',
    'bg-sky-500 text-white',
    'bg-violet-500 text-white',
    'bg-amber-500 text-white',
  ];
  const colorIndex = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % bgColors.length;

  return (
    <div className={`relative inline-block shrink-0 select-none ${className}`}>
      {src && !imageError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImageError(true)}
          className={`${sizeClasses[size]} rounded-full object-cover ring-1 ring-black/5 shadow-xs`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} ${bgColors[colorIndex]} rounded-full flex items-center justify-center font-bold ring-1 ring-black/5 shadow-xs`}
        >
          {initials}
        </div>
      )}

      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-2 ${statusDotSizes[size]} ${statusColors[status]}`}
          title={status}
        />
      )}
    </div>
  );
};
