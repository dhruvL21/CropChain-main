'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export function OfflineIndicator() {
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
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          title="Offline Mode Active"
        >
          <Button 
            variant="outline" 
            size="icon" 
            className="border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
          >
            <WifiOff className="h-5 w-5" />
            <span className="sr-only">Offline Mode Active</span>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
