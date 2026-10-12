import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      const timer = setTimeout(() => {
        setJustReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !justReconnected) {
    return null;
  }

  if (justReconnected) {
    return (
      <div className="bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition-all animate-in slide-in-from-top-2 duration-200 z-50 shrink-0">
        <Wifi className="w-4 h-4 shrink-0" />
        <span>Internet connection restored. Synchronizing live family space...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-amber-300 border-b border-amber-500/30 px-3 py-1.5 text-xs font-semibold flex items-center justify-between shadow-md transition-all animate-in slide-in-from-top-2 duration-200 z-50 shrink-0">
      <div className="flex items-center gap-2 overflow-hidden">
        <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
        <span className="truncate">
          You are currently offline. Live messages and changes require an internet connection.
        </span>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] shrink-0 transition-colors ml-2 cursor-pointer"
        title="Retry connection"
      >
        <RefreshCw className="w-3 h-3" />
        <span>Retry</span>
      </button>
    </div>
  );
};
