'use client';

import { Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export function Logo({
  iconClassName,
  textClassName,
}: {
  iconClassName?: string;
  textClassName?: string;
}) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!window.navigator.onLine);
    }
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 text-foreground">
      <Leaf className={cn("h-7 w-7 transition-colors duration-500", isOffline ? "text-destructive" : "text-primary", iconClassName)} />
      <span className={cn("text-2xl font-semibold", textClassName)}>
        CropChain
      </span>
    </div>
  );
}
