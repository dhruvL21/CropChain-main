'use client';

import { useTheme } from 'next-themes';
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sun, Moon, Laptop } from "lucide-react";
import { useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

type LanguageCode = 'en' | 'hi' | 'mr' | 'gu';

const languages: { code: LanguageCode, name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'mr', name: 'मराठी' },
    { code: 'gu', name: 'ગુજરાતી' },
];


export default function SettingsPage() {
    const { t, language, setLanguage } = useLanguage();
    const { theme, setTheme } = useTheme();
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
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {t('settings.title')}
                </h1>
                <p className="text-muted-foreground">{t('settings.description')}</p>
            </div>
            
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('settings.appearance.title')}</CardTitle>
                        <CardDescription>{t('settings.appearance.description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={theme}
                            onValueChange={setTheme}
                            className="grid max-w-md grid-cols-1 gap-4 sm:grid-cols-3"
                        >
                            <div>
                                <RadioGroupItem value="light" id="light" className="peer sr-only" />
                                <Label
                                    htmlFor="light"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                >
                                    <Sun className="mb-3 h-6 w-6" />
                                    {t('settings.appearance.light')}
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                                <Label
                                    htmlFor="dark"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                >
                                    <Moon className="mb-3 h-6 w-6" />
                                    {t('settings.appearance.dark')}
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="system" id="system" className="peer sr-only" />
                                <Label
                                    htmlFor="system"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                >
                                    <Laptop className="mb-3 h-6 w-6" />
                                    {t('settings.appearance.system')}
                                </Label>
                            </div>
                        </RadioGroup>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('settings.language.title')}</CardTitle>
                        <CardDescription>{t('settings.language.description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={language}
                            onValueChange={(value) => handleSelectLanguage(value as LanguageCode)}
                            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                        >
                            {languages.map(lang => (
                                <div key={lang.code}>
                                    <RadioGroupItem value={lang.code} id={lang.code} className="peer sr-only" />
                                    <Label
                                        htmlFor={lang.code}
                                        className="flex h-full w-full cursor-pointer items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                    >
                                        {lang.name}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
