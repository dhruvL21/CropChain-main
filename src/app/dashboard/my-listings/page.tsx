'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { AddListingDialog } from '@/components/app/add-listing-dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { getCropDisplayName } from '@/lib/get-crop-display-name';


const ListingCard = ({ listing, onEdit }: { listing: any, onEdit: () => void }) => {
    const imageFromPlaceholder = PlaceHolderImages.find((img) => img.id === listing.imageId);
    const imageUrl = listing.imageUrl || imageFromPlaceholder?.imageUrl;
    const imageHint = imageFromPlaceholder?.imageHint;
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useLanguage();
    
    const cropDisplayName = getCropDisplayName(listing.cropName, t);

    const handleDelete = () => {
        if (!firestore) return;
        const listingRef = doc(firestore, 'cropListings', listing.id);
        deleteDocumentNonBlocking(listingRef);
        toast({
            title: t('myListings.listingDeleted'),
            description: t('myListings.listingDeletedDescription', { cropName: cropDisplayName }),
          });
    }

    return (
        <Card className="flex flex-col">
            <CardHeader className="p-0">
                {imageUrl && (
                    <div className="relative aspect-video w-full">
                        <Image
                            src={imageUrl}
                            alt={listing.cropName}
                            data-ai-hint={imageHint}
                            fill
                            className="object-cover rounded-t-lg"
                        />
                    </div>
                )}
            </CardHeader>
            <CardContent className="p-4 flex-grow">
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold">{cropDisplayName}</h3>
                    <Badge variant="secondary">{listing.qualityGrade}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{listing.certifications || t('myListings.noCerts')}</p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('common.retail')}</p>
                        <p className="font-semibold">₹{listing.retailPrice.toFixed(2)} / {listing.unit}</p>
                        <p className="text-xs text-muted-foreground">{t('myListings.available', { quantity: listing.retailQuantity })}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('common.wholesale')}</p>
                        <p className="font-semibold">₹{listing.wholesalePrice.toFixed(2)} / {listing.unit}</p>
                        <p className="text-xs text-muted-foreground">{t('myListings.available', { quantity: listing.wholesaleQuantity })}</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 p-4 pt-0">
                <Button variant="outline" size="sm" onClick={onEdit}><Edit className="mr-2 h-4 w-4" /> {t('myListings.edit')}</Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> {t('myListings.delete')}</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>{t('myListings.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                           {t('myListings.deleteDescription')}
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>{t('myListings.continue')}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
};


export default function MyListingsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [listingToEdit, setListingToEdit] = useState<any | null>(null);
    const { t } = useLanguage();

    const listingsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'cropListings'), where('userId', '==', user.uid));
    }, [firestore, user]);

    const { data: listings, isLoading } = useCollection<any>(listingsQuery);
    
    const handleOpenDialog = (listing: any | null = null) => {
        setListingToEdit(listing);
        setIsDialogOpen(true);
    };

    const handleDialogChange = (isOpen: boolean) => {
        setIsDialogOpen(isOpen);
        if (!isOpen) {
            setListingToEdit(null);
        }
    };


    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {t('myListings.title')}
                    </h1>
                    <p className="text-muted-foreground">{t('myListings.description')}</p>
                </div>
                <Button onClick={() => handleOpenDialog()} className='w-full sm:w-auto'>
                    <PlusCircle className="mr-2 h-4 w-4" /> {t('myListings.addNew')}
                </Button>
            </div>

            <AddListingDialog 
                open={isDialogOpen} 
                onOpenChange={handleDialogChange} 
                listingToEdit={listingToEdit}
            />
            
            {isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="flex flex-col">
                            <CardHeader className="p-0"><Skeleton className="aspect-video w-full" /></CardHeader>
                            <CardContent className="p-4 flex-grow space-y-4">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Skeleton className="h-4 w-1/4 mb-2" />
                                        <Skeleton className="h-5 w-3/4" />
                                        <Skeleton className="h-3 w-1/2 mt-1" />
                                    </div>
                                    <div>
                                        <Skeleton className="h-4 w-1/4 mb-2" />
                                        <Skeleton className="h-5 w-3/4" />
                                        <Skeleton className="h-3 w-1/2 mt-1" />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2 p-4 pt-0">
                                <Skeleton className="h-9 w-24" />
                                <Skeleton className="h-9 w-24" />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {!isLoading && listings && listings.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings.map(listing => <ListingCard key={listing.id} listing={listing} onEdit={() => handleOpenDialog(listing)} />)}
                </div>
            )}

            {!isLoading && (!listings || listings.length === 0) && (
                 <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
                    <div className="flex flex-col items-center gap-1 py-24 text-center">
                        <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                            {t('myListings.noListings')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {t('myListings.noListingsDescription')}
                        </p>
                        <Button className="mt-4" onClick={() => handleOpenDialog()}>
                            <PlusCircle className="mr-2 h-4 w-4" /> {t('myListings.addNew')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
