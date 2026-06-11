'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, query, where, doc, updateDoc, serverTimestamp, increment, runTransaction } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EscrowTimeline, OrderStatus, PaymentStatus } from '@/components/app/escrow-timeline';
import { HandCoins, Landmark, Package, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EscrowPayment {
  id: string;
  amount: number;
  buyerId: string;
  farmerId: string;
  orderId: string;
  status: PaymentStatus;
  orderStatus: OrderStatus;
  itemsSummary: string;
  createdAt: any;
}

interface UserProfile {
  role: 'farmer' | 'buyer';
}

const formatCurrency = (value: number) => `\u20B9${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getCreatedAtMillis = (createdAt: any) => {
  if (!createdAt) return 0;
  if (typeof createdAt.toMillis === 'function') return createdAt.toMillis();
  if (typeof createdAt.seconds === 'number') return createdAt.seconds * 1000;

  const parsed = new Date(createdAt).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function TransactionsDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const currentRole = userProfile?.role ?? 'buyer';

  const paymentsQuery = useMemo(() => {
    if (!firestore || !user) return null;

    const roleField = currentRole === 'farmer' ? 'farmerId' : 'buyerId';
    return query(collection(firestore, 'escrowPayments'), where(roleField, '==', user.uid));
  }, [currentRole, firestore, user]);

  const { data: paymentsData, isLoading: isLoadingPayments } = useCollection<EscrowPayment>(paymentsQuery);

  const payments = useMemo(
    () => [...(paymentsData ?? [])].sort((a, b) => getCreatedAtMillis(b.createdAt) - getCreatedAtMillis(a.createdAt)),
    [paymentsData]
  );

  const totalHeld = payments.filter((payment) => payment.status === 'held').reduce((sum, payment) => sum + payment.amount, 0);
  const totalReleased = payments.filter((payment) => payment.status === 'released').reduce((sum, payment) => sum + payment.amount, 0);
  const pendingDeliveries = payments.filter((payment) => payment.orderStatus !== 'Delivered').length;

  const updateOrderStatus = async (paymentId: string, orderId: string, newStatus: OrderStatus) => {
    if (!firestore || !user) return;

    try {
      const paymentRef = doc(firestore, 'escrowPayments', paymentId);
      await updateDoc(paymentRef, { orderStatus: newStatus, updatedAt: serverTimestamp() });

      const payment = payments.find((item) => item.id === paymentId);
      if (payment?.farmerId) {
        const orderRef = doc(firestore, 'users', payment.farmerId, 'orders', orderId);
        await updateDoc(orderRef, { status: newStatus, updatedAt: serverTimestamp() });
      }

      toast({ title: 'Status Updated', description: `Order is now ${newStatus}.` });
    } catch (error) {
      console.error(error);
      toast({ title: 'Update Failed', variant: 'destructive' });
    }
  };

  const releaseFunds = async (paymentId: string) => {
    if (!firestore || !user) return;

    const payment = payments.find((item) => item.id === paymentId);
    if (!payment) return;

    try {
      await runTransaction(firestore, async (transaction) => {
        const paymentRef = doc(firestore, 'escrowPayments', paymentId);
        const farmerProfileRef = doc(firestore, 'users', payment.farmerId);
        const orderRef = doc(firestore, 'users', payment.farmerId, 'orders', payment.orderId);

        transaction.update(paymentRef, { status: 'released', updatedAt: serverTimestamp() });
        transaction.update(orderRef, { status: 'Delivered', updatedAt: serverTimestamp() });
        transaction.update(farmerProfileRef, {
          balance: increment(payment.amount),
          updatedAt: serverTimestamp(),
        });
      });

      toast({ title: 'Funds Released', description: 'The farmer will receive the payment shortly.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Release Failed', variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Title section with proper heading and description */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-orange-500 to-emerald-600 bg-clip-text text-transparent sm:text-4xl md:text-5xl">
            Transactions & Escrow
          </h1>
          <p className="mt-2 flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
            All payments are securely held in escrow until delivery is confirmed.
          </p>
        </div>
      </div>

      {/* Summary Cards with premium styles */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Card 1: Total Escrow Held */}
        <Card className="relative overflow-hidden border border-border/40 bg-background/50 backdrop-blur-md shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Total Escrow Held</CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Landmark className="h-5 w-5 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoadingPayments ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-3xl font-bold tracking-tight text-foreground">{formatCurrency(totalHeld)}</div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Total Released */}
        <Card className="relative overflow-hidden border border-border/40 bg-background/50 backdrop-blur-md shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Total Released</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <HandCoins className="h-5 w-5 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoadingPayments ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{formatCurrency(totalReleased)}</div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Pending Deliveries */}
        <Card className="relative overflow-hidden border border-border/40 bg-background/50 backdrop-blur-md shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Pending Deliveries</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Package className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoadingPayments ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-3xl font-bold tracking-tight text-foreground">{pendingDeliveries}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Escrow Activity List */}
      <div className="space-y-6 pt-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Recent Escrow Activity
        </h2>

        {isLoadingPayments ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} className="overflow-hidden border border-border/40 bg-background/30 p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="h-5 w-48 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-12 w-full bg-muted animate-pulse rounded" />
              </Card>
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/60 bg-background/20 py-16 text-center shadow-inner">
            <p className="text-muted-foreground text-base">No transactions found.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Escrow transactions will show up here once orders are placed.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {payments.map((payment) => (
              <Card key={payment.id} className="overflow-hidden border border-border/30 bg-background/40 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="flex flex-col justify-between border-b border-border/20 bg-muted/20 p-6 md:flex-row md:items-center">
                  <div>
                    <h3 className="text-lg font-bold text-foreground tracking-tight">{payment.itemsSummary}</h3>
                    <p className="mt-1.5 font-mono text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded inline-block">
                      Ref: {payment.id}
                    </p>
                  </div>
                  <div className="mt-4 text-left md:mt-0 md:text-right">
                    <div className="text-2xl font-black text-foreground">{formatCurrency(payment.amount)}</div>
                    <div className="mt-2.5 inline-block">
                      {payment.status === 'held' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm animate-pulse">
                          Funds Held Securely
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
                          Funds Released
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <CardContent className="px-6 py-8">
                  <EscrowTimeline orderStatus={payment.orderStatus} paymentStatus={payment.status} />
                </CardContent>

                <CardFooter className="flex justify-end gap-3 border-t border-border/20 bg-muted/10 px-6 py-4">
                  {currentRole === 'farmer' && payment.orderStatus === 'Processing' && (
                    <Button 
                      id={`btn-transit-${payment.id}`}
                      onClick={() => updateOrderStatus(payment.id, payment.orderId, 'In Transit')}
                      className="bg-primary hover:bg-primary/90 shadow-sm"
                    >
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin-slow" /> Mark as In Transit
                    </Button>
                  )}

                  {currentRole === 'farmer' && payment.orderStatus === 'In Transit' && (
                    <Button 
                      id={`btn-delivered-${payment.id}`}
                      onClick={() => updateOrderStatus(payment.id, payment.orderId, 'Delivered')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                      Mark as Delivered
                    </Button>
                  )}

                  {currentRole === 'buyer' && payment.orderStatus === 'Delivered' && payment.status === 'held' && (
                    <Button 
                      id={`btn-release-${payment.id}`}
                      onClick={() => releaseFunds(payment.id)} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all hover:translate-x-0.5"
                    >
                      Confirm Receipt & Release Funds <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}

                  {payment.status === 'released' && (
                    <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" /> Transaction Completed
                    </span>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
