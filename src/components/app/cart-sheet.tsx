'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useCart, type CartItem } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trash2, ShoppingCart } from 'lucide-react';
import { Badge } from '../ui/badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useLanguage } from '@/hooks/use-language';
import { getCropDisplayName } from '@/lib/get-crop-display-name';
import { useFirestore, useUser, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import { CheckoutPaymentDialog } from './checkout-payment-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { buildTransactionRecord, createTransactionId } from '@/lib/transactions';

export function CartSheet() {
  const { cartItems, removeItem, cartCount, clearCart } = useCart();
  const { t } = useLanguage();
  const { user: buyer } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const buyerProfileRef = useMemo(() => {
    if (buyer?.uid && firestore) {
      return doc(firestore, 'users', buyer.uid);
    }
    return null;
  }, [buyer?.uid, firestore]);

  const { data: userProfile } = useDoc<{ balance?: number; firstName?: string; lastName?: string }>(buyerProfileRef);

  const totalCartAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const getTranslatedItemName = (item: CartItem) => {
    // Shop items are identified by their 'prod-' prefix.
    if (item.id.startsWith('prod-')) {
        return t(`products.${item.name}.name`);
    }
    // Marketplace items
    const translatedCropName = getCropDisplayName(item.name, t);
    if (item.isSample) {
        return t('marketplace.sampleName', { cropName: translatedCropName });
    }
    return translatedCropName;
  }

  const handleCheckout = async () => {
    if (!buyer || !firestore) {
        toast({ title: t('common.error'), description: t('marketplace.authErrorDescription'), variant: "destructive" });
        return;
    }

    const currentBalance = userProfile?.balance ?? 0;
    if (currentBalance < totalCartAmount) {
        toast({
            title: t('common.error') || 'Error',
            description: `Insufficient wallet balance. Your balance is ₹${currentBalance.toFixed(0)}, but your order total is ₹${totalCartAmount.toFixed(2)}. Please add money to your wallet on the Transactions page.`,
            variant: "destructive"
        });
        return;
    }

    const marketplaceItems = cartItems.filter(item => !!item.userId);
    const shopItems = cartItems.filter(item => !item.userId);

    try {
        // Import updateDoc dynamically or make sure it's referenced
        const { updateDoc } = await import('firebase/firestore');

        // Deduct balance from buyer in Firestore first
        const buyerRef = doc(firestore, 'users', buyer.uid);
        await updateDoc(buyerRef, {
            balance: increment(-totalCartAmount),
            updatedAt: serverTimestamp()
        });

        if (marketplaceItems.length > 0) {
            const itemsByFarmer = marketplaceItems.reduce((acc, item) => {
                const farmerId = item.userId!;
                if (!acc[farmerId]) acc[farmerId] = [];
                acc[farmerId].push(item);
                return acc;
            }, {} as Record<string, CartItem[]>);

            for (const farmerId in itemsByFarmer) {
                const items = itemsByFarmer[farmerId];
                if (items.length === 0) continue;

                const batch = writeBatch(firestore);

                // 1. Create the Order document for the farmer
                const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const orderRef = doc(collection(firestore, 'users', farmerId, 'orders'));
                
                batch.set(orderRef, {
                    userId: farmerId,
                    buyerId: buyer.uid,
                    buyerName: buyer.displayName || 'anonymous_buyer',
                    orderDate: serverTimestamp(),
                    totalAmount,
                    status: 'Processing',
                    items: items.map(item => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        unit: item.unit || null,
                        isSample: !!item.isSample,
                        imageId: item.imageId || null,
                        imageUrl: item.imageUrl || null,
                    })),
                });

                // 2. Create the EscrowPayment document securely linking this order
                const itemsSummary = items.map(i => `${i.name} (x${i.quantity})`).join(', ');
                const paymentRef = doc(collection(firestore, 'escrowPayments'));
                batch.set(paymentRef, {
                    buyerId: buyer.uid,
                    farmerId: farmerId,
                    orderId: orderRef.id,
                    amount: totalAmount,
                    status: 'held',
                    orderStatus: 'Processing',
                    itemsSummary: itemsSummary,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });

                // 3. Create a notification for the farmer
                const notificationRef = doc(collection(firestore, 'users', farmerId, 'notifications'));
                batch.set(notificationRef, {
                    userId: farmerId,
                    messageKey: 'notifications.newOrder',
                    messagePayload: {
                        buyerName: buyer.displayName || 'anonymous_buyer',
                        items: items.map(item => ({
                            name: item.name,
                            quantity: item.quantity,
                            isSample: !!item.isSample,
                        }))
                    },
                    link: '/dashboard',
                    read: false,
                    createdAt: serverTimestamp(),
                });

                // 4. Create shared transaction records in Firestore for each item!
                items.forEach((item) => {
                  const amount = item.price * item.quantity;
                  const txnRef = doc(collection(firestore, 'transactions'));
                  
                  const record = {
                    id: createTransactionId('CHK'),
                    type: 'retail_order' as const,
                    cropName: item.name,
                    quantity: item.quantity,
                    unit: item.unit || 'unit',
                    unitPrice: item.price,
                    totalAmount: amount,
                    farmerId,
                    farmerName: 'Farmer', // resolved dynamically on display
                    buyerId: buyer.uid,
                    buyerName: [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') || buyer.displayName || 'Anonymous Buyer',
                    status: amount > 0 ? ('in_escrow' as const) : ('pending' as const),
                    verificationStatus: 'partially_verified' as const,
                    paymentMode: amount > 0 ? 'Escrow payment' : 'Sample request',
                    referenceNumber: orderRef.id,
                    orderId: orderRef.id,
                    source: 'checkout' as const,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  
                  batch.set(txnRef, buildTransactionRecord(record));
                });

                await batch.commit();
            }
        }

        if (shopItems.length > 0) {
            const shopBatch = writeBatch(firestore);
            shopItems.forEach((item) => {
              const amount = item.price * item.quantity;
              const txnRef = doc(collection(firestore, 'transactions'));
              
              const record = {
                id: createTransactionId('SHOP'),
                type: 'shop_purchase' as const,
                cropName: getTranslatedItemName(item),
                quantity: item.quantity,
                unit: item.unit || 'unit',
                unitPrice: item.price,
                totalAmount: amount,
                buyerId: buyer.uid,
                buyerName: [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') || buyer.displayName || 'Current user',
                farmerName: 'CropChain Shop',
                status: 'paid' as const,
                verificationStatus: 'verified' as const,
                paymentMode: 'Wallet Balance',
                referenceNumber: createTransactionId('SHOPREF'),
                source: 'checkout' as const,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              
              shopBatch.set(txnRef, buildTransactionRecord(record));
            });
            await shopBatch.commit();
        }
        
        // Determine which toast to show
        if (marketplaceItems.length > 0) {
            toast({
                title: t('cart.checkoutSuccessTitle'),
                description: t('cart.checkoutSuccessDescription'),
            });
        } else if (shopItems.length > 0) {
             toast({
                title: t('cart.checkoutSuccessTitle'),
                description: t('cart.shopCheckoutSuccessDescription'),
            });
        }

        clearCart();

    } catch (error) {
        console.error("Checkout failed:", error);
        toast({
            title: t('common.uhOh'),
            description: t('cart.checkoutFailedDescription'),
            variant: "destructive",
        });
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart />
          {cartCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-2 -top-2 h-6 w-6 rounded-full flex items-center justify-center text-xs"
            >
              {cartCount}
            </Badge>
          )}
          <span className="sr-only">Open cart</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col pr-0 sm:max-w-lg">
        <SheetHeader className="px-6">
          <SheetTitle>{t('cart.title', { cartCount })}</SheetTitle>
        </SheetHeader>
        <Separator />
        {cartCount > 0 ? (
          <>
            <ScrollArea className="flex-1 px-6">
              <div className="flex flex-col gap-4 py-4">
                {cartItems.map(item => {
                   const imageFromPlaceholder = PlaceHolderImages.find((img) => img.id === item.imageId);
                   const imageUrl = item.imageUrl || imageFromPlaceholder?.imageUrl;
                   const imageHint = imageFromPlaceholder?.imageHint;
                   const itemName = getTranslatedItemName(item);

                   return(
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md">
                        <Image
                          src={imageUrl ?? 'https://placehold.co/80x80'}
                          alt={itemName}
                          data-ai-hint={imageHint}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{itemName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} x ₹{item.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">{t('cart.removeItem')}</span>
                        </Button>
                      </div>
                    </div>
                   )
                })}
              </div>
            </ScrollArea>
            <Separator />
            <SheetFooter className="p-6">
              {isMobile ? (
                <Button onClick={handleCheckout} disabled={cartCount === 0} className="w-full">
                  {t('cart.checkout')}
                </Button>
              ) : (
                <CheckoutPaymentDialog 
                  totalAmount={totalCartAmount} 
                  onConfirmPayment={handleCheckout} 
                  disabled={cartCount === 0} 
                />
              )}
            </SheetFooter>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground" />
            <p className="text-xl font-semibold">{t('cart.empty')}</p>
            <p className="text-muted-foreground">{t('cart.emptyDescription')}</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
