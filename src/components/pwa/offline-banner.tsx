'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

import { useLanguage } from '@/hooks/use-language';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

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

  useEffect(() => {
    if (isOffline) {
      toast({
        title: t('pwa.offlineTitle'),
        description: t('pwa.offlineDesc'),
        variant: "destructive",
      });
    }
  }, [isOffline, toast, t]);

  return null;
}
