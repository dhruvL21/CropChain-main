'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  signInWithEmailAndPassword,
  User,
} from 'firebase/auth';
import { useEffect, useState, useRef, useLayoutEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Logo } from '@/components/app/logo';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/hooks/use-language';

const RoleSelectionDialog = ({
  open,
  onOpenChange,
  onContinue,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (data: z.infer<ReturnType<typeof useRoleFormSchema>>) => void;
  user: User | null;
}) => {
  const { t } = useLanguage();
  const roleFormSchema = useRoleFormSchema();
  const form = useForm<z.infer<typeof roleFormSchema>>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      role: 'farmer',
      phone: '',
      farmName: '',
      farmAddress: '',
      companyName: '',
      businessType: '',
    },
  });

  const role = form.watch('role');

  useEffect(() => {
    if (user) {
      form.reset({
        role: 'farmer',
        phone: user.phoneNumber || '',
        farmName: '',
        farmAddress: '',
        companyName: '',
        businessType: '',
      });
    }
  }, [user, form]);

  const onSubmit = (data: z.infer<typeof roleFormSchema>) => {
    onContinue(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('login.completeProfile')}</DialogTitle>
          <DialogDescription>
            {t('login.completeProfileDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>{t('login.youAreA')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="farmer" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {t('login.farmer')}
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="buyer" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {t('login.buyer')}
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('login.phone')}</FormLabel>
                  <FormControl>
                    <Input placeholder="9876543210" type="tel" {...field} suppressHydrationWarning />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {role === 'farmer' && (
              <>
                <FormField
                  control={form.control}
                  name="farmName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('login.farmName')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('login.farmNamePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="farmAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('login.farmAddress')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('login.farmAddressPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {role === 'buyer' && (
              <>
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('login.companyName')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('login.companyNamePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('login.businessType')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder={t('login.selectBusinessType')} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="wholesaler">{t('login.wholesaler')}</SelectItem>
                          <SelectItem value="retailer">{t('login.retailer')}</SelectItem>
                          <SelectItem value="restaurant">{t('login.restaurant')}</SelectItem>
                          <SelectItem value="individual">{t('login.individual')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <DialogFooter>
              <Button type="submit">{t('login.continue')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const useLoginFormSchema = () => {
  const { t } = useLanguage();
  return useMemo(() => z.object({
    email: z.string().email({ message: t('login.validation.email') }),
    password: z
      .string()
      .min(6, { message: t('login.validation.password') }),
  }), [t]);
}

const useRoleFormSchema = () => {
  const { t } = useLanguage();
  return useMemo(() => z.object({
    role: z.enum(['farmer', 'buyer'], { required_error: t('login.validation.role') }),
    phone: z.string().min(10, { message: t('login.validation.phone') }).max(10, { message: t('login.validation.phone') }),
    farmName: z.string().optional(),
    farmAddress: z.string().optional(),
    companyName: z.string().optional(),
    businessType: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (data.role === 'farmer') {
      if (!data.farmName || data.farmName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['farmName'],
          message: t('login.validation.farmName'),
        });
      }
      if (!data.farmAddress || data.farmAddress.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['farmAddress'],
          message: t('login.validation.farmAddress'),
        });
      }
    } else if (data.role === 'buyer') {
      if (!data.businessType || data.businessType.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['businessType'],
          message: t('login.validation.businessType'),
        });
      }
    }
  }), [t]);
}


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { t } = useLanguage();
  const formSchema = useLoginFormSchema();


  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState<User | null>(null);

  const [activeTab, setActiveTab] = useState('farmer');
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const farmerTabRef = useRef<HTMLButtonElement>(null);
  const buyerTabRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const setIndicator = () => {
      const activeTabRef = activeTab === 'farmer' ? farmerTabRef : buyerTabRef;
      const tabsContainerNode = tabsContainerRef.current;

      if (activeTabRef.current && tabsContainerNode) {
        const containerRect = tabsContainerNode.getBoundingClientRect();
        const tabRect = activeTabRef.current.getBoundingClientRect();

        setIndicatorStyle({
          left: tabRect.left - containerRect.left,
          width: tabRect.width,
          opacity: 1,
        });
      }
    };

    setIndicator();
    window.addEventListener('resize', setIndicator);

    return () => {
      window.removeEventListener('resize', setIndicator);
    };
  }, [activeTab]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && user && !isRoleDialogOpen) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router, isRoleDialogOpen]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (auth && firestore) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;

        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.role === activeTab) {
            router.push('/dashboard');
          } else {
            await auth.signOut();
            toast({
              variant: 'destructive',
              title: t('login.authFailed'),
              description: t('login.wrongRole', { role: userData.role }),
            });
          }
        } else {
          await auth.signOut();
          toast({
            variant: 'destructive',
            title: t('login.authFailed'),
            description: t('login.noProfile'),
          });
        }
      } catch (error: any) {
        let description = 'There was a problem with sign-in.';
        if (
          error.code === 'auth/invalid-credential' ||
          error.code === 'auth/user-not-found' ||
          error.code === 'auth/wrong-password'
        ) {
          description = t('login.invalidCredentials');
        } else if (error.message) {
          description = error.message;
        }

        toast({
          variant: 'destructive',
          title: t('login.loginFailed'),
          description: description,
        });
      }
    }
  };

  const handleRoleSelection = async (values: z.infer<ReturnType<typeof useRoleFormSchema>>) => {
    if (firestore && newUser) {
      const userDocRef = doc(firestore, 'users', newUser.uid);
      const [firstName, lastName] = newUser.displayName?.split(' ') || ['', ''];

      const commonData = {
        id: newUser.uid,
        firstName: firstName || '',
        lastName: lastName || '',
        email: newUser.email,
        phone: values.phone,
        language: 'en',
        role: values.role,
      };

      let roleSpecificData = {};
      if (values.role === 'farmer') {
        roleSpecificData = {
          farmName: values.farmName,
          farmAddress: values.farmAddress,
        };
      } else if (values.role === 'buyer') {
        roleSpecificData = {
          companyName: values.companyName,
          businessType: values.businessType,
        };
      }

      const userData = { ...commonData, ...roleSpecificData };

      setDocumentNonBlocking(userDocRef, userData, { merge: false });

      setIsRoleDialogOpen(false);
      setNewUser(null);
      router.push('/dashboard');
    }
  };



  if (isUserLoading || user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="flex min-h-screen w-full items-center justify-center p-4 sm:p-6">
        <RoleSelectionDialog
          open={isRoleDialogOpen}
          onOpenChange={setIsRoleDialogOpen}
          onContinue={handleRoleSelection}
          user={newUser}
        />
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-4 text-center">
              <div className="flex justify-center">
                <Logo />
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="farmer" className="w-full">
                <TabsList ref={tabsContainerRef} className="relative grid w-full grid-cols-2">
                  <div
                    className="absolute top-1 bottom-1 rounded-sm bg-background/70 backdrop-blur-sm shadow-sm transition-all duration-500 ease-in-out"
                    style={indicatorStyle}
                  />
                  <TabsTrigger
                    ref={farmerTabRef}
                    value="farmer"
                    className="relative z-10 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {t('login.farmer')}
                  </TabsTrigger>
                  <TabsTrigger
                    ref={buyerTabRef}
                    value="buyer"
                    className="relative z-10 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {t('login.buyer')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <CardTitle className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('login.welcome')}</CardTitle>
              <CardDescription className="pt-2 text-base sm:text-lg">
                {t('login.welcomeDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="grid gap-4"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('login.email')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('login.emailPlaceholder')}
                            {...field}
                            suppressHydrationWarning
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center">
                          <FormLabel>{t('login.password')}</FormLabel>
                          <Link
                            href="/forgot-password"
                            className="ml-auto inline-block text-sm underline"
                          >
                            {t('login.forgotPassword')}
                          </Link>
                        </div>
                        <FormControl>
                          <Input
                            type="password"
                            {...field}
                            suppressHydrationWarning
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" suppressHydrationWarning>
                    {t('login.login')}
                  </Button>
                </form>
              </Form>

            </CardContent>
            <CardFooter className="flex justify-center text-sm">
              <p>{t('login.noAccount')}</p>
              <Link href="/signup" className="underline ml-1">
                {t('login.signUp')}
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
