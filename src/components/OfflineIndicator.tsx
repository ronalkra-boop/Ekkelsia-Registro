import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 lg:bottom-4 left-4 right-4 sm:right-auto z-50 inline-flex items-center gap-2 rounded-md bg-amber-700 px-3.5 py-2 text-xs font-medium text-white shadow-md"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Sin conexión — Mostrando datos en caché local.</span>
    </div>
  );
}
