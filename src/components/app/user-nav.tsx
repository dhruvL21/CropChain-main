'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth, useUser } from '@/firebase';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/use-language';

interface UserProfile {
  firstName: string;
  lastName: string;
  role: 'farmer' | 'buyer';
}

export function UserNav({ userProfile }: { userProfile?: UserProfile | null }) {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
    }
    router.push('/login');
  };

  const displayName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : (user?.displayName || '');
  const fallbackInitial = (userProfile?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase();


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            {user?.photoURL && (
              <AvatarImage
                src={user.photoURL}
                alt={t('userNav.avatarAlt')}
              />
            )}
            <AvatarFallback>{fallbackInitial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName || (userProfile && t(`login.${userProfile.role}`))}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/dashboard/profile">
            <DropdownMenuItem>
              <UserIcon />
              {t('userNav.profile')}
            </DropdownMenuItem>
          </Link>
          <Link href="/dashboard/settings">
            <DropdownMenuItem>
              <Settings />
              {t('userNav.settings')}
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut />
          {t('userNav.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
