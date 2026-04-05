'use client';

import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/hooks/use-language';
import { useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

type LanguageCode = 'en' | 'hi' | 'mr' | 'gu';

const languages: { code: LanguageCode, name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'mr', name: 'मराठी' },
    { code: 'gu', name: 'ગુજરાતી' },
];

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  const { user } = useUser();
  const firestore = useFirestore();

  const handleSelectLanguage = (langCode: LanguageCode) => {
    setLanguage(langCode);
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      updateDocumentNonBlocking(userDocRef, { language: langCode });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Globe />
          <span className="sr-only">{t('languageSwitcher.changeLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => handleSelectLanguage(lang.code)}
            className={language === lang.code ? 'bg-primary/10 text-primary' : ''}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
