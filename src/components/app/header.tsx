'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Menu,
  ShoppingCart,
  Store,
  List,
  Handshake,
  Landmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { UserNav } from './user-nav';
import { Logo } from './logo';
import { cn } from '@/lib/utils';
import { CartSheet } from './cart-sheet';
import { useMemo } from 'react';
import { NotificationBell } from './notification-bell';
import { LanguageSwitcher } from './language-switcher';
import { useLanguage } from '@/hooks/use-language';
import { OfflineIndicator } from '@/components/pwa/offline-indicator';

interface UserProfile {
    firstName: string;
    lastName: string;
    role: 'farmer' | 'buyer';
}

const allLinks = [
  {
    href: '/dashboard',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/schemes',
    labelKey: 'nav.govtSchemes',
    icon: Landmark,
  },
  {
    href: '/dashboard/shop',
    labelKey: 'nav.shop',
    icon: ShoppingCart,
  },
  {
    href: '/dashboard/my-listings',
    labelKey: 'nav.myListings',
    icon: List,
  },
  {
    href: '/dashboard/marketplace',
    labelKey: 'nav.marketplace',
    icon: Store,
  },
  {
    href: '/dashboard/my-offers',
    labelKey: 'nav.myOffers',
    icon: Handshake,
  },
] as const;

export function Header({ userProfile }: { userProfile?: UserProfile | null }) {
  const pathname = usePathname();
  const { t, language } = useLanguage();

  const userRole = userProfile?.role;

  const mainLinks = useMemo(() => {
    if (userRole === 'farmer') {
      return allLinks.filter(link => ['/dashboard', '/dashboard/schemes', '/dashboard/shop', '/dashboard/my-listings'].includes(link.href));
    }
    if (userRole === 'buyer') {
      return allLinks.filter(link => ['/dashboard/marketplace', '/dashboard/my-offers'].includes(link.href));
    }
    return [];
  }, [userRole]);

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between bg-background/80 px-4 backdrop-blur-sm md:px-6">
      
      {/* Left Group: Logo */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <Logo />
        </Link>
      </div>

      {/* Center: Desktop Nav */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <nav className={cn("hidden items-center text-base font-medium md:flex", language === 'en' ? 'gap-1' : 'gap-4')}>
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-500',
                pathname === link.href
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-primary/10 hover:text-primary hover:shadow-sm'
              )}
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>
      </div>


      {/* Right side: Icons and mobile menu */}
      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden items-center gap-2 md:flex md:gap-4">
          <OfflineIndicator />
          <LanguageSwitcher />
          {userProfile && <NotificationBell />}
          <UserNav userProfile={userProfile} />
        </div>
        <CartSheet />
        
        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col">
            <SheetHeader>
                <SheetTitle className="sr-only">Mobile Menu</SheetTitle>
            </SheetHeader>
            <nav className="grid gap-6 text-lg font-medium">
              <SheetClose asChild>
                  <Link
                      href="/dashboard"
                      className="flex items-center gap-2 text-lg font-semibold"
                  >
                      <Logo />
                      <span className="sr-only">CropChain</span>
                  </Link>
              </SheetClose>
              {mainLinks.map((link) => (
                   <SheetClose asChild key={link.href}>
                      <Link href={link.href} className="text-muted-foreground hover:text-foreground">{t(link.labelKey)}</Link>
                  </SheetClose>
              ))}
            </nav>
            <div className="mt-auto border-t pt-4">
              <div className="flex items-center justify-center gap-4">
                  <OfflineIndicator />
                  <LanguageSwitcher />
                  {userProfile && <NotificationBell />}
                  <UserNav userProfile={userProfile} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
