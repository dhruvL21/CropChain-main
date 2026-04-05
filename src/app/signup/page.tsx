'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useMemo } from 'react';
import { doc } from 'firebase/firestore';

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/hooks/use-language';

const useSignupFormSchema = () => {
    const { t } = useLanguage();
    return useMemo(() => z.object({
        firstName: z.string().min(1, { message: t('signup.validation.firstName') }),
        lastName: z.string().min(1, { message: t('signup.validation.lastName') }),
        email: z.string().email({ message: t('login.validation.email') }),
        password: z
          .string()
          .min(6, { message: t('login.validation.password') }),
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


export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { t } = useLanguage();
  const formSchema = useSignupFormSchema();


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
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
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (auth && firestore) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const newUser = userCredential.user;

        // Create user profile in Firestore
        const userDocRef = doc(firestore, 'users', newUser.uid);
        
        const commonData = {
            id: newUser.uid,
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
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
        
        // Using non-blocking update
        setDocumentNonBlocking(userDocRef, userData, { merge: false });

        toast({
          title: t('signup.accountCreated'),
          description: t('signup.accountCreatedSuccess'),
        });

        router.push('/dashboard');
      } catch (error: any) {
        let description = t('signup.genericError');
        if (error.code === 'auth/email-already-in-use') {
          description = t('signup.emailInUse');
        } else if (error.message) {
          description = error.message;
        }

        toast({
          variant: 'destructive',
          title: t('signup.signUpFailed'),
          description: description,
        });
      }
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
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-4 text-center">
              <div className="flex justify-center">
                <Logo />
              </div>
              <CardTitle className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('signup.title')}</CardTitle>
              <CardDescription className="pt-2 text-base sm:text-lg">
                {t('signup.description')}
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
                  <div className="grid grid-cols-2 gap-4">
                      <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>{t('signup.firstName')}</FormLabel>
                          <FormControl>
                              <Input placeholder={t('signup.firstNamePlaceholder')} {...field} suppressHydrationWarning />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                      <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>{t('signup.lastName')}</FormLabel>
                          <FormControl>
                              <Input placeholder={t('signup.lastNamePlaceholder')} {...field} suppressHydrationWarning />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                  </div>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('login.email')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('login.emailPlaceholder')}
                            type="email"
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
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('login.password')}</FormLabel>
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
                
                  <Button type="submit" className="w-full" suppressHydrationWarning>
                    {t('signup.signUp')}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-center text-sm">
              <p>{t('signup.hasAccount')}</p>
              <Link href="/login" className="underline ml-1">
                {t('signup.login')}
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
