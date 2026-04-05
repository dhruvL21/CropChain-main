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
  import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
  } from '@/components/ui/chart';
  import { BarChart, CartesianGrid, XAxis, YAxis, Bar, LineChart, Line } from 'recharts';
  import { Badge } from '@/components/ui/badge';
  import { IndianRupee, ShoppingCart, Percent, Activity } from 'lucide-react';
import { PriceOptimizerForm } from '@/components/app/price-optimizer-form';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, serverTimestamp } from 'firebase/firestore';
import type { ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useLanguage } from '@/hooks/use-language';
import { getCropDisplayName } from '@/lib/get-crop-display-name';
import { sampleOrders } from '@/lib/placeholder-data';

  
  const iconMap = {
    'dollar-sign': IndianRupee,
    'shopping-cart': ShoppingCart,
    'percent': Percent,
    'activity': Activity,
  };
  
  export default function DashboardPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { t } = useLanguage();

    const salesChartConfig: ChartConfig = useMemo(() => ({
      sales: {
        label: t('dashboard.sales'),
        color: "hsl(var(--chart-1))",
      },
      revenue: {
        label: t('dashboard.revenue'),
        color: "hsl(var(--chart-2))",
      },
    }), [t]);
    
    const cropAvailabilityChartConfig: ChartConfig = useMemo(() => ({
        wholesale: {
            label: t('common.wholesale'),
            color: 'hsl(var(--chart-1))',
        },
        retail: {
            label: t('common.retail'),
            color: 'hsl(var(--chart-2))',
        },
    }), [t]);

    // Data fetching
    const ordersQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'users', user.uid, 'orders'));
    }, [firestore, user]);
    const { data: orders, isLoading: isLoadingOrders } = useCollection<any>(ordersQuery);

    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'products'));
    }, [firestore]);
    const { data: products, isLoading: isLoadingProducts } = useCollection<any>(productsQuery);

    const listingsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'cropListings'), where('userId', '==', user.uid));
    }, [firestore, user]);
    const { data: listings, isLoading: isLoadingListings } = useCollection<any>(listingsQuery);

    const offersQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'offers'), where('farmerId', '==', user.uid));
    }, [firestore, user]);
    const { data: offers, isLoading: isLoadingOffers } = useCollection<any>(offersQuery);

    const isLoading = isLoadingOrders || isLoadingProducts || isLoadingListings || isLoadingOffers;

    // Data processing
    const dashboardStats = useMemo(() => {
        const dataToUse = (orders && orders.length > 0) ? orders : sampleOrders;
        const totalRevenue = dataToUse.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalSales = dataToUse.length;
        const activeOrders = dataToUse.filter(o => o.status === 'Processing' || o.status === 'Shipped').length;
        
        // The "change" data is static for this demo.
        return [
            { title: t('dashboard.totalRevenue'), value: `₹${totalRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, change: t('dashboard.fromLastMonth', { change: '+20.1%' }), icon: 'dollar-sign' },
            { title: t('dashboard.totalSales'), value: `+${totalSales}`, change: t('dashboard.fromLastMonth', { change: '+19%' }), icon: 'shopping-cart' },
            { title: t('dashboard.profitMargin'), value: '25.6%', change: t('dashboard.fromLastMonth', { change: '+2.1%' }), icon: 'percent' },
            { title: t('dashboard.activeOrders'), value: `${activeOrders}`, change: t('dashboard.sinceLastHour', { change: '+2' }), icon: 'activity' },
        ];
    }, [orders, t]);

    const salesChartData = useMemo(() => {
        const dataToUse = (orders && orders.length > 0) ? orders : sampleOrders;
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const initialData = monthNames.map(m => ({ month: m, sales: 0, revenue: 0 }));

        const monthlyData = dataToUse.reduce((acc, order) => {
            const date = order.orderDate?.toDate ? order.orderDate.toDate() : new Date(order.orderDate);
            const monthIndex = date.getMonth();
            if (acc[monthIndex]) {
              acc[monthIndex].sales += 1;
              acc[monthIndex].revenue += order.totalAmount;
            }
            return acc;
        }, initialData);

        return monthlyData;
    }, [orders]);

    const cropAvailabilityData = useMemo(() => {
        const dataToUse = listings || [];
        return dataToUse.map(listing => ({
            crop: getCropDisplayName(listing.cropName, t),
            wholesale: listing.wholesaleQuantity,
            retail: listing.retailQuantity,
        }));
    }, [listings, t]);

    const inventoryData = useMemo(() => {
        const dataToUse = products || [];
        return dataToUse.map(product => {
            let status = 'inStock';
            if (product.quantity === 0) {
                status = 'outOfStock';
            } else if (product.quantity < 100) {
                status = 'lowStock';
            }
            return {
                id: product.id,
                item: product.name,
                status,
                quantity: product.quantity || 0,
                unit: product.unit || t('common.unit'),
            };
        });
    }, [products, t]);

    const handleOfferAction = (offer: any, newStatus: 'accepted' | 'rejected') => {
        if (!firestore) return;
        const offerRef = doc(firestore, 'offers', offer.id);
        updateDocumentNonBlocking(offerRef, { status: newStatus });
    
        const notificationRef = collection(firestore, 'users', offer.buyerId, 'notifications');
        addDocumentNonBlocking(notificationRef, {
            userId: offer.buyerId,
            messageKey: 'dashboard.offerStatusUpdate',
            messagePayload: {
                cropName: offer.cropName,
                status: newStatus,
            },
            link: '/dashboard/my-offers',
            read: false,
            createdAt: serverTimestamp(),
        });
    };


    return (
      <div className="flex flex-col gap-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({length: 4}).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-1/2 mb-2" />
                        <Skeleton className="h-3 w-full" />
                    </CardContent>
                </Card>
            ))
          ) : (
            dashboardStats.map((stat) => {
                const Icon = iconMap[stat.icon as keyof typeof iconMap];
                return (
                <Card key={stat.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {stat.title}
                    </CardTitle>
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">{stat.change}</p>
                    </CardContent>
                </Card>
                );
            })
          )}
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>{t('dashboard.receivedOffers')}</CardTitle>
                <CardDescription>{t('dashboard.receivedOffersDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('common.crop')}</TableHead>
                            <TableHead>{t('dashboard.buyer')}</TableHead>
                            <TableHead>{t('dashboard.offer')}</TableHead>
                            <TableHead>{t('common.quantity')}</TableHead>
                            <TableHead>{t('common.status')}</TableHead>
                            <TableHead className="text-right">{t('dashboard.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingOffers ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : offers && offers.length > 0 ? (
                            offers.map((offer) => {
                                const cropDisplayName = getCropDisplayName(offer.cropName, t);
                                let buyerDisplayName = offer.buyerName;
                                if (!buyerDisplayName || buyerDisplayName.toLowerCase() === 'anonymous_buyer') {
                                    buyerDisplayName = t('dashboard.anonymous_buyer');
                                }

                                return (
                                <TableRow key={offer.id}>
                                    <TableCell className="font-medium">{cropDisplayName}</TableCell>
                                    <TableCell>{buyerDisplayName}</TableCell>
                                    <TableCell>₹{offer.offerPrice.toFixed(2)} / {offer.unit}</TableCell>
                                    <TableCell>{offer.quantity} {offer.unit}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            offer.status === 'pending' ? 'secondary' : offer.status === 'accepted' ? 'default' : 'destructive'
                                        }>
                                            {t(`myOffers.status.${offer.status}`)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {offer.status === 'pending' && (
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="outline" size="sm" onClick={() => handleOfferAction(offer, 'accepted')}>{t('dashboard.accept')}</Button>
                                                <Button variant="destructive" size="sm" onClick={() => handleOfferAction(offer, 'rejected')}>{t('dashboard.reject')}</Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )})
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground">
                                    {t('dashboard.noPendingOffers')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
            <Card>
                <CardHeader>
                <CardTitle>{t('dashboard.salesRevenueOverview')}</CardTitle>
                <CardDescription>{t('dashboard.salesRevenueRange')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
                        <ChartContainer config={salesChartConfig} className="h-[250px] w-full">
                            <LineChart data={salesChartData} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="month"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                            />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Line type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false}/>
                            </LineChart>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                <CardTitle>{t('dashboard.cropAvailability')}</CardTitle>
                <CardDescription>{t('dashboard.cropAvailabilityDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
                        <ChartContainer config={cropAvailabilityChartConfig} className="h-[250px] w-full">
                            <BarChart data={cropAvailabilityData} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="crop"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                            />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Bar dataKey="wholesale" fill="var(--color-wholesale)" radius={4} />
                            <Bar dataKey="retail" fill="var(--color-retail)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="flex flex-col gap-6">
            <div className="mb-2">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {t('priceOptimizer.aiStrategy')}
                </h2>
                <p className="mt-1 text-base text-muted-foreground">
                    {t('priceOptimizer.aiStrategyDescription')}
                </p>
            </div>
            <PriceOptimizerForm />
        </div>
  
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.inventoryStatus')}</CardTitle>
            <CardDescription>{t('dashboard.inventoryStatusDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dashboard.item')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.quantity')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    Array.from({length: 5}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : (
                    inventoryData.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{t(`products.${item.id}.name`)}</TableCell>
                            <TableCell>
                            <Badge
                                variant={
                                item.status === 'inStock'
                                    ? 'default'
                                    : item.status === 'lowStock'
                                    ? 'secondary'
                                    : 'destructive'
                                }
                                className={item.status === 'lowStock' ? 'bg-accent text-accent-foreground' : ''}
                            >
                                {t(`common.${item.status}`)}
                            </Badge>
                            </TableCell>
                            <TableCell className="text-right">{`${item.quantity} ${item.unit}`}</TableCell>
                        </TableRow>
                        ))
                    )
                }
                 {!isLoading && inventoryData.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                            {t('dashboard.noInventory')}
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

    












    