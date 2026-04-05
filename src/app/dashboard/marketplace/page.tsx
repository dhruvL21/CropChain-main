'use client';

import Image from 'next/image';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/hooks/use-cart';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useLanguage } from '@/hooks/use-language';
import { getCropDisplayName } from '@/lib/get-crop-display-name';


const PurchaseDialog = ({ crop, isWholesale, onOpenChange, open }: { crop: any, isWholesale: boolean, open: boolean, onOpenChange: (open: boolean) => void }) => {
    const { toast } = useToast();
    const { addItem } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [offerPrice, setOfferPrice] = useState(isWholesale ? crop.wholesalePrice : 0);
    const firestore = useFirestore();
    const { user: buyer } = useUser();
    const { t } = useLanguage();
    
    const cropDisplayName = getCropDisplayName(crop.cropName, t);
    
    const handleAction = () => {
        if (isWholesale) {
            if (!firestore || !buyer) {
                toast({
                    title: t('marketplace.authError'),
                    description: t('marketplace.authErrorDescription'),
                    variant: "destructive",
                });
                return;
            }

            addDocumentNonBlocking(collection(firestore, 'offers'), {
                cropListingId: crop.id,
                farmerId: crop.userId,
                buyerId: buyer.uid,
                buyerName: buyer.displayName || 'anonymous_buyer',
                cropName: crop.cropName,
                quantity: quantity,
                unit: crop.unit,
                offerPrice: offerPrice,
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            // Also create a notification for the farmer
            const farmerNotificationRef = collection(firestore, 'users', crop.userId, 'notifications');
            addDocumentNonBlocking(farmerNotificationRef, {
                userId: crop.userId,
                messageKey: 'notifications.newOfferReceived',
                messagePayload: {
                    buyerName: buyer.displayName || 'anonymous_buyer',
                    cropName: crop.cropName,
                },
                link: '/dashboard',
                read: false,
                createdAt: serverTimestamp(),
            });

            toast({
                title: t('marketplace.offerSubmitted'),
                description: t('marketplace.offerSubmittedDescription', { quantity: quantity, cropName: cropDisplayName, offerPrice: offerPrice.toFixed(2), unit: crop.unit }),
            });
        } else {
            addItem({ ...crop, name: crop.cropName, price: crop.retailPrice, id: crop.id, userId: crop.userId, isSample: false }, quantity);
            toast({
                title: t('marketplace.addedToCart'),
                description: t('marketplace.addedToCartDescription', { quantity: quantity, cropName: cropDisplayName }),
            });
        }
        onOpenChange(false);
    };

    const price = isWholesale ? crop.wholesalePrice : crop.retailPrice;
    const maxQuantity = isWholesale ? crop.wholesaleQuantity : crop.retailQuantity;
    const total = isWholesale ? quantity * offerPrice : quantity * price;

    useEffect(() => {
        if (open) {
            setQuantity(1);
            if (isWholesale) {
                setOfferPrice(crop.wholesalePrice);
            }
        }
    }, [open, crop.wholesalePrice, isWholesale]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isWholesale ? t('marketplace.makeOffer') : t('marketplace.addToCart')}</DialogTitle>
                    <DialogDescription>
                        {isWholesale ? t('marketplace.submitOfferFor', { cropName: cropDisplayName }) : t('marketplace.selectQuantityFor', { cropName: cropDisplayName })}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <div className="flex justify-between items-baseline">
                            <Label htmlFor="quantity">{t('common.quantity')}</Label>
                            {maxQuantity > 0 && (
                                <span className="text-sm text-muted-foreground">
                                    {t('common.available', { quantity: maxQuantity, unit: crop.unit })}
                                </span>
                            )}
                        </div>
                        <Input
                            id="quantity"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.min(maxQuantity, Math.max(1, Number(e.target.value))))}
                            max={maxQuantity}
                            min={1}
                        />
                    </div>
                    {isWholesale && (
                        <div className="grid gap-2">
                            <Label htmlFor="offerPrice">
                                {t('marketplace.offerPricePerUnit', { unit: crop.unit })}
                            </Label>
                            <Input
                                id="offerPrice"
                                type="number"
                                value={offerPrice}
                                onChange={(e) => setOfferPrice(Number(e.target.value))}
                                step="0.01"
                                min="0"
                            />
                        </div>
                    )}
                    <div className="text-right font-medium">
                        <p className="text-sm text-muted-foreground">
                            {isWholesale ? t('marketplace.currentWholesalePrice', { price: price.toFixed(2), unit: crop.unit }) : t('common.pricePerUnit', { price: price.toFixed(2), unit: crop.unit })}
                        </p>
                        <p className="text-lg">{t('common.total', { total: total.toFixed(2) })}</p>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">{t('common.cancel')}</Button>
                    </DialogClose>
                    <Button onClick={handleAction}>{isWholesale ? t('marketplace.submitOffer') : t('marketplace.addToCart')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


const CropCard = ({ crop, isWholesale }: { crop: any, isWholesale: boolean }) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { addItem } = useCart();
    const imageFromPlaceholder = PlaceHolderImages.find((img) => img.id === crop.imageId);
    const imageUrl = crop.imageUrl || imageFromPlaceholder?.imageUrl;
    const imageHint = imageFromPlaceholder?.imageHint;
    const price = isWholesale ? crop.wholesalePrice : crop.retailPrice;
    const quantity = isWholesale ? crop.wholesaleQuantity : crop.retailQuantity;
    const { toast } = useToast();
    const isSampleAvailable = !!crop.hasSampleBag;
    const { t } = useLanguage();

    const cropDisplayName = getCropDisplayName(crop.cropName, t);

    const handleSampleAction = () => {
      if (isSampleAvailable) {
        addItem({ ...crop, name: crop.cropName, price: 0, id: `${crop.id}-sample`, isSample: true, userId: crop.userId }, 1);
        toast({
            title: t('marketplace.sampleBagRequested'),
            description: t('marketplace.sampleBagRequestedDescription', { cropName: cropDisplayName }),
        });
      } else {
        toast({
            variant: 'destructive',
            title: t('marketplace.sampleNotAvailable'),
            description: t('marketplace.sampleNotAvailableDescription', { cropName: cropDisplayName }),
        });
      }
    };

    const isOutOfStock = !quantity || quantity <= 0;

    return (
        <>
            <Card className="overflow-hidden">
                {imageUrl && (
                    <div className="relative aspect-video w-full">
                        <Image
                            src={imageUrl}
                            alt={crop.cropName}
                            data-ai-hint={imageHint}
                            fill
                            className="object-cover"
                        />
                    </div>
                )}
                <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold">{cropDisplayName}</h3>
                        <Badge variant="secondary">{crop.qualityGrade}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{crop.certifications}</p>
                    <div className="mt-4">
                        <p className="text-2xl font-bold">₹{price.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">/ {crop.unit}</span></p>
                        <p className="text-sm text-muted-foreground">{t('common.available', { quantity, unit: crop.unit })}</p>
                    </div>
                </CardContent>
                <CardFooter className={cn("grid gap-2 p-4 pt-0", isWholesale ? 'grid-cols-1' : 'grid-cols-2')}>
                    <Button onClick={() => setIsDialogOpen(true)} disabled={isOutOfStock}>
                        {isOutOfStock ? t('common.outOfStock') : (isWholesale ? t('marketplace.makeOffer') : t('marketplace.addToCart'))}
                    </Button>
                    {!isWholesale &&
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={handleSampleAction} disabled={!isSampleAvailable}>
                                        {t('marketplace.sample')}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {isSampleAvailable 
                                        ? <p>{t('marketplace.sampleTooltip')}</p>
                                        : <p>{t('marketplace.sampleNotAvailableTooltip')}</p>
                                    }
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    }
                </CardFooter>
            </Card>
            <PurchaseDialog crop={crop} isWholesale={isWholesale} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
        </>
    )
}

const MarketplaceGrid = ({ isWholesale }: { isWholesale: boolean }) => {
    const firestore = useFirestore();
    const { t } = useLanguage();
    
    const cropsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'cropListings'));
    }, [firestore]);

    const { data: crops, isLoading } = useCollection<any>(cropsQuery);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
                {Array.from({ length: 4 }).map((_, i) => (
                     <Card key={i} className="overflow-hidden">
                        <Skeleton className="aspect-video w-full" />
                        <CardContent className="p-4">
                           <Skeleton className="h-5 w-3/4 mb-2" />
                           <Skeleton className="h-4 w-1/2 mb-4" />
                           <Skeleton className="h-8 w-1/3 mb-2" />
                           <Skeleton className="h-4 w-1/4" />
                        </CardContent>
                        <CardFooter className={cn("grid gap-2 p-4 pt-0", isWholesale ? 'grid-cols-1' : 'grid-cols-2')}>
                            <Skeleton className="h-10 w-full" />
                            {!isWholesale && <Skeleton className="h-10 w-full" />}
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )
    }

    if (!crops || crops.length === 0) {
        return (
            <div className="text-center text-muted-foreground mt-10 col-span-full">
                {t('marketplace.noCrops')}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
            {crops?.map(crop => (
                <CropCard key={crop.id} crop={crop} isWholesale={isWholesale} />
            ))}
        </div>
    );
}

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState('retail');
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const retailTabRef = useRef<HTMLButtonElement>(null);
  const wholesaleTabRef = useRef<HTMLButtonElement>(null);
  const { t } = useLanguage();

  useLayoutEffect(() => {
    const setIndicator = () => {
      const activeTabRef = activeTab === 'retail' ? retailTabRef : wholesaleTabRef;
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

  return (
    <div className="flex flex-col gap-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="retail">
        <TabsList ref={tabsContainerRef} className="relative grid w-full max-w-[400px] grid-cols-2 mx-auto">
          <div
            className="absolute top-1 bottom-1 rounded-sm bg-background/70 backdrop-blur-sm shadow-sm transition-all duration-500 ease-in-out"
            style={indicatorStyle}
          />
          <TabsTrigger
            ref={retailTabRef}
            value="retail"
            className="relative z-10 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {t('common.retail')}
          </TabsTrigger>
          <TabsTrigger
            ref={wholesaleTabRef}
            value="wholesale"
            className="relative z-10 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {t('common.wholesale')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="retail">
          <MarketplaceGrid isWholesale={false} />
        </TabsContent>
        <TabsContent value="wholesale">
          <MarketplaceGrid isWholesale={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
