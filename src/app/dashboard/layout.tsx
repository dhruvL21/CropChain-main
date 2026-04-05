'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Header } from '@/components/app/header';
import { CartProvider } from '@/hooks/use-cart';
import { useLanguage } from '@/hooks/use-language';

interface UserProfile {
  firstName: string;
  lastName: string;
  role: 'farmer' | 'buyer';
  language?: 'en' | 'hi' | 'mr' | 'gu';
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();
  const { setLanguage, t } = useLanguage();

  const userProfileRef = useMemoFirebase(() => {
    if (user?.uid && firestore) {
      return doc(firestore, 'users', user.uid);
    }
    return null;
  }, [user?.uid, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (userProfile?.language) {
      setLanguage(userProfile.language);
    }
  }, [userProfile, setLanguage]);

  useEffect(() => {
    if (userProfile) {
      const buyerAllowedPaths = ['/dashboard/marketplace', '/dashboard/my-offers', '/dashboard/profile', '/dashboard/settings'];
      if (userProfile.role === 'buyer' && !buyerAllowedPaths.includes(pathname)) {
        router.push('/dashboard/marketplace');
      } else if (userProfile.role === 'farmer' && pathname === '/dashboard/marketplace') {
        router.push('/dashboard');
      }
    }
  }, [userProfile, pathname, router]);

  const isLoading = isUserLoading || (!!user && isProfileLoading);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>{t('common.loading')}</p>
      </div>
    );
  }
  
  return (
    <CartProvider>
      <div className="flex min-h-screen w-full flex-col">
        <Header userProfile={userProfile} />
        <main className="flex-1 bg-transparent p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </CartProvider>
  );
}
