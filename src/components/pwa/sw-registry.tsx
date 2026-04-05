'use client';

import { useEffect } from 'react';

export function SWRegistry() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register the service worker
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered successfully:', registration.scope);
          })
          .catch((error) => {
            console.error('SW registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
