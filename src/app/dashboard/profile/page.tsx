'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { useLanguage } from "@/hooks/use-language";
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Building, Tractor, List, CheckCircle, Clock, Handshake } from 'lucide-react';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'farmer' | 'buyer';
  language: string;
  farmName?: string;
  farmAddress?: string;
  companyName?: string;
  businessType?: string;
}


const ProfileInfoRow = ({ label, value }: { label: string, value?: string | number }) => (
    <div className="flex justify-between py-2 border-b">
        <p className="text-muted-foreground">{label}</p>
        <p className="font-medium text-right">{value ?? '-'}</p>
    </div>
);

const StatRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: number }) => (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
        <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <p className="text-muted-foreground">{label}</p>
        </div>
        <p className="font-medium">{value}</p>
    </div>
);


export default function ProfilePage() {
    const { t } = useLanguage();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
        if (user?.uid && firestore) {
            return doc(firestore, 'users', user.uid);
        }
        return null;
    }, [user?.uid, firestore]);

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    
    // Farmer stats
    const farmerListingsQuery = useMemoFirebase(() => {
        if (!firestore || !user || userProfile?.role !== 'farmer') return null;
        return query(collection(firestore, 'cropListings'), where('userId', '==', user.uid));
    }, [firestore, user, userProfile?.role]);
    const { data: farmerListings, isLoading: isLoadingFarmerListings } = useCollection(farmerListingsQuery);

    const farmerOffersQuery = useMemoFirebase(() => {
        if (!firestore || !user || userProfile?.role !== 'farmer') return null;
        return query(collection(firestore, 'offers'), where('farmerId', '==', user.uid));
    }, [firestore, user, userProfile?.role]);
    const { data: farmerOffers, isLoading: isLoadingFarmerOffers } = useCollection(farmerOffersQuery);

    // Buyer stats
    const buyerOffersQuery = useMemoFirebase(() => {
        if (!firestore || !user || userProfile?.role !== 'buyer') return null;
        return query(collection(firestore, 'offers'), where('buyerId', '==', user.uid));
    }, [firestore, user, userProfile?.role]);
    const { data: buyerOffers, isLoading: isLoadingBuyerOffers } = useCollection(buyerOffersQuery);


    const isLoading = isUserLoading || isProfileLoading || isLoadingFarmerListings || isLoadingFarmerOffers || isLoadingBuyerOffers;
    const displayName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : (user?.displayName || '');
    const fallbackInitial = (userProfile?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase();

    const stats = useMemo(() => {
        if (!userProfile) return null;

        if (userProfile.role === 'farmer') {
            return {
                stat1: { label: t('profile.totalListings'), value: farmerListings?.length ?? 0, icon: List },
                stat2: { label: t('profile.acceptedOffers'), value: farmerOffers?.filter(o => o.status === 'accepted').length ?? 0, icon: CheckCircle },
                stat3: { label: t('profile.pendingOffers'), value: farmerOffers?.filter(o => o.status === 'pending').length ?? 0, icon: Clock },
            }
        }

        if (userProfile.role === 'buyer') {
            return {
                stat1: { label: t('profile.offersMade'), value: buyerOffers?.length ?? 0, icon: Handshake },
                stat2: { label: t('profile.acceptedOffers'), value: buyerOffers?.filter(o => o.status === 'accepted').length ?? 0, icon: CheckCircle },
                stat3: { label: t('profile.pendingOffers'), value: buyerOffers?.filter(o => o.status === 'pending').length ?? 0, icon: Clock },
            }
        }
        return null;
    }, [userProfile, farmerListings, farmerOffers, buyerOffers, t]);


    if (isLoading) {
        return (
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('profile.title')}</h1>
                    <p className="text-muted-foreground">{t('profile.description')}</p>
                </div>
                <div className="grid gap-8 md:grid-cols-3">
                    <div className="md:col-span-1 grid gap-8">
                        <Card>
                            <CardHeader className="items-center">
                                <Skeleton className="h-24 w-24 rounded-full" />
                                <Skeleton className="h-6 w-3/4 mt-4" />
                                <Skeleton className="h-4 w-1/2 mt-2" />
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle><Skeleton className="h-6 w-1/2" /></CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                            </CardContent>
                        </Card>
                    </div>
                    <div className="md:col-span-2 grid gap-8">
                        <Card>
                            <CardHeader>
                                <CardTitle><Skeleton className="h-6 w-1/3" /></CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle><Skeleton className="h-6 w-1/3" /></CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('profile.title')}</h1>
                <p className="text-muted-foreground">{t('profile.description')}</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-1 grid gap-8">
                    <Card>
                        <CardHeader className="items-center text-center">
                            <Avatar className="h-24 w-24 mb-4">
                                {user?.photoURL && <AvatarImage src={user.photoURL} alt={displayName} />}
                                <AvatarFallback className="text-3xl">{fallbackInitial}</AvatarFallback>
                            </Avatar>
                            <CardTitle>{displayName}</CardTitle>
                            <p className="text-sm text-muted-foreground">{userProfile?.email}</p>
                        </CardHeader>
                    </Card>
                    
                    {stats && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('profile.activityStats')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <StatRow icon={stats.stat1.icon} label={stats.stat1.label} value={stats.stat1.value} />
                                <StatRow icon={stats.stat2.icon} label={stats.stat2.label} value={stats.stat2.value} />
                                <StatRow icon={stats.stat3.icon} label={stats.stat3.label} value={stats.stat3.value} />
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="md:col-span-2 grid gap-8 content-start">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserIcon className="h-5 w-5" />
                                {t('profile.personalInfo')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ProfileInfoRow label={t('profile.name')} value={displayName} />
                            <ProfileInfoRow label={t('profile.email')} value={userProfile?.email} />
                            <ProfileInfoRow label={t('profile.phone')} value={userProfile?.phone} />
                            <ProfileInfoRow label={t('profile.role')} value={userProfile?.role ? t(`profile.${userProfile.role}`) : ''} />
                        </CardContent>
                    </Card>

                    {userProfile?.role === 'farmer' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Tractor className="h-5 w-5" />
                                    {t('profile.farmInfo')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ProfileInfoRow label={t('profile.farmName')} value={userProfile.farmName} />
                                <ProfileInfoRow label={t('profile.farmAddress')} value={userProfile.farmAddress} />
                            </CardContent>
                        </Card>
                    )}

                    {userProfile?.role === 'buyer' && (
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building className="h-5 w-5" />
                                    {t('profile.buyerInfo')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ProfileInfoRow label={t('profile.companyName')} value={userProfile.companyName} />
                                <ProfileInfoRow label={t('profile.businessType')} value={userProfile.businessType} />
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
