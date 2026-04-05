
'use client';

import Image from 'next/image';
import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ShoppingCart } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
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
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/hooks/use-language';

const AddToCartDialog = ({ product, onOpenChange }: { product: any, onOpenChange: (open: boolean) => void }) => {
    const { toast } = useToast();
    const { addItem } = useCart();
    const [quantity, setQuantity] = useState(1);
    const { t } = useLanguage();

    const handleAddToCart = () => {
        if (!product) return;
        const productName = t(`products.${product.id}.name`);
        addItem({ ...product, name: product.id, isSample: false }, quantity);
        toast({
            title: t('marketplace.addedToCart'),
            description: t('marketplace.addedToCartDescription', { quantity: quantity, cropName: productName }),
        });
        onOpenChange(false);
    };

    useEffect(() => {
      if (product) {
        setQuantity(1);
      }
    }, [product]);

    if (!product) {
        return null;
    }
    
    const total = quantity * product.price;

    return (
        <Dialog open={!!product} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('marketplace.addToCart')}</DialogTitle>
                    <DialogDescription>
                        {t('marketplace.selectQuantityFor', { cropName: t(`products.${product.id}.name`) })}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <div className="flex justify-between items-baseline">
                            <Label htmlFor="quantity">{t('common.quantity')}</Label>
                            {(product.quantity || 0) > 0 && (
                                <span className="text-sm text-muted-foreground">
                                    {t('common.available', { quantity: product.quantity, unit: product.unit })}
                                </span>
                            )}
                        </div>
                        <Input
                            id="quantity"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.min(product.quantity || 0, Math.max(1, Number(e.target.value))))}
                            max={product.quantity || 0}
                            min={1}
                        />
                    </div>
                    <div className="text-right font-medium">
                        <p className="text-sm text-muted-foreground">
                            {t('common.pricePerUnit', { price: product.price.toFixed(2), unit: product.unit })}
                        </p>
                        <p className="text-lg">{t('common.total', { total: total.toFixed(2) })}</p>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">{t('common.cancel')}</Button>
                    </DialogClose>
                    <Button onClick={handleAddToCart}>{t('marketplace.addToCart')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function ShopPage() {
  const firestore = useFirestore();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const isMobile = useIsMobile();
  const { t } = useLanguage();

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products'));
  }, [firestore]);

  const { data: products, isLoading } = useCollection<any>(productsQuery);
  const safeProducts = products || [];

  const categories = useMemo(() => 
    ['All', ...Array.from(new Set(safeProducts.map((p) => p.category as string).filter(Boolean)))],
    [safeProducts]
  );
  
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const buttonsContainerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  useLayoutEffect(() => {
    if (isMobile) return;
    
    const setIndicator = () => {
      const activeTabRef = buttonRefs.current.get(selectedCategory);
      const tabsContainerNode = buttonsContainerRef.current;
      
      if (activeTabRef && tabsContainerNode) {
        const containerRect = tabsContainerNode.getBoundingClientRect();
        const tabRect = activeTabRef.getBoundingClientRect();
        const newLeft = tabRect.left - containerRect.left;
        const newWidth = tabRect.width;

        setIndicatorStyle(prevStyle => {
          if (prevStyle.left !== newLeft || prevStyle.width !== newWidth || prevStyle.opacity !== 1) {
            return {
              left: newLeft,
              width: newWidth,
              opacity: 1
            };
          }
          return prevStyle;
        });
      }
    };

    setIndicator();
    window.addEventListener('resize', setIndicator);

    return () => {
      window.removeEventListener('resize', setIndicator);
    };
  }, [selectedCategory, categories, isMobile]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') {
      return safeProducts;
    }
    return safeProducts.filter(p => p.category === selectedCategory);
  }, [safeProducts, selectedCategory]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-center">
        {isMobile ? (
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full max-w-xs mx-auto">
              <SelectValue placeholder={t('shop.selectCategory')} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category === 'All' ? t('shop.all') : t(`shop.categories.${category}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
            <div ref={buttonsContainerRef} className="relative flex items-center justify-center gap-1 flex-wrap bg-muted/50 text-muted-foreground p-1 rounded-lg">
                <div
                    className="absolute top-1 bottom-1 rounded-md bg-background/70 backdrop-blur-sm shadow-sm transition-all duration-500 ease-in-out"
                    style={indicatorStyle}
                />
                {categories.map((category) => (
                <Button 
                    key={category}
                    ref={(el) => {
                        if (el) buttonRefs.current.set(category, el);
                        else buttonRefs.current.delete(category);
                    }}
                    variant={'ghost'}
                    className="relative z-10 data-[active=true]:text-foreground data-[active=true]:bg-transparent data-[active=true]:shadow-none"
                    data-active={selectedCategory === category}
                    onClick={() => setSelectedCategory(category)}
                >
                    {category === 'All' ? t('shop.all') : t(`shop.categories.${category}`)}
                </Button>
                ))}
            </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader className="p-0">
                  <Skeleton className="aspect-video w-full" />
                </CardHeader>
                <CardContent className="p-4 flex-grow">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
                <CardFooter className="p-4 pt-0 flex justify-between items-center">
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-10 w-2/4" />
                </CardFooter>
              </Card>
            ))}
          </>
        ) : filteredProducts && filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
                const image = PlaceHolderImages.find((img) => img.id === product.imageId);
                const isOutOfStock = !product.quantity || product.quantity <= 0;
                return (
                    <Card key={product.id} className="flex flex-col">
                    <CardHeader className="p-0">
                        {image && (
                        <div className="relative aspect-video w-full">
                            <Image
                            src={image.imageUrl}
                            alt={product.name}
                            data-ai-hint={image.imageHint}
                            fill
                            className="object-cover rounded-t-lg"
                            />
                        </div>
                        )}
                    </CardHeader>
                    <CardContent className="p-4 flex-grow">
                        <h3 className="text-lg font-semibold">{t(`products.${product.id}.name`)}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                        {t(`products.${product.id}.description`)}
                        </p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-between items-center">
                        <p className="text-lg font-bold">₹{product.price.toFixed(2)}</p>
                        <Button onClick={() => setSelectedProduct(product)} disabled={isOutOfStock}>
                          {isOutOfStock ? t('common.outOfStock') : (
                            <>
                              <ShoppingCart />
                              {t('marketplace.addToCart')}
                            </>
                          )}
                        </Button>
                    </CardFooter>
                    </Card>
                );
                })
        ) : (
            <div className="col-span-full text-center text-muted-foreground mt-10">
                {t('shop.noProducts')}
            </div>
        )}
      </div>
      <AddToCartDialog product={selectedProduct} onOpenChange={(open) => {if (!open) setSelectedProduct(null)}} />
    </div>
  );
}
