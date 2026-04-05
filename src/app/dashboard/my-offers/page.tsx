'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/use-language';
import { getCropDisplayName } from '@/lib/get-crop-display-name';


export default function MyOffersPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { t } = useLanguage();

    const offersQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'offers'), where('buyerId', '==', user.uid));
    }, [firestore, user]);

    const { data: offers, isLoading: isLoadingOffers } = useCollection<any>(offersQuery);

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {t('myOffers.title')}
                </h1>
                <p className="text-muted-foreground">{t('myOffers.description')}</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{t('myOffers.history')}</CardTitle>
                    <CardDescription>{t('myOffers.historyDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('common.crop')}</TableHead>
                                <TableHead>{t('myOffers.yourOffer')}</TableHead>
                                <TableHead>{t('common.quantity')}</TableHead>
                                <TableHead>{t('myOffers.totalValue')}</TableHead>
                                <TableHead className="text-right">{t('common.status')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingOffers ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-6 w-20 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : offers && offers.length > 0 ? (
                                offers.map((offer) => {
                                    const cropDisplayName = getCropDisplayName(offer.cropName, t);

                                    return (
                                        <TableRow key={offer.id}>
                                            <TableCell className="font-medium">{cropDisplayName}</TableCell>
                                            <TableCell>₹{offer.offerPrice.toFixed(2)} / {offer.unit}</TableCell>
                                            <TableCell>{offer.quantity} {offer.unit}</TableCell>
                                            <TableCell>₹{(offer.offerPrice * offer.quantity).toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={
                                                    offer.status === 'pending' ? 'secondary' : offer.status === 'accepted' ? 'default' : 'destructive'
                                                }>
                                                    {t(`myOffers.status.${offer.status}`)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        {t('myOffers.noOffers')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
