'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, query, where, doc, updateDoc, serverTimestamp, increment, runTransaction } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EscrowTimeline, OrderStatus, PaymentStatus } from '@/components/app/escrow-timeline';
import { HandCoins, Landmark, Package, ArrowRight, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EscrowPayment {
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

const formatCurrency = (value: number) => `\u20B9${value.toFixed(2)}`;

const getCreatedAtMillis = (createdAt: any) => {
  if (!createdAt) return 0;
  if (typeof createdAt.toMillis === 'function') return createdAt.toMillis();
  if (typeof createdAt.seconds === 'number') return createdAt.seconds * 1000;

  const parsed = new Date(createdAt).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function TransactionsPage() {
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

  const { data: paymentsData } = useCollection<EscrowPayment>(paymentsQuery);

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
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transactions & Escrow</h2>
          <p className="mt-2 flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            All payments are securely held in escrow until delivery is confirmed.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Escrow Held</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalHeld)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Released</CardTitle>
            <HandCoins className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatCurrency(totalReleased)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Deliveries</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingDeliveries}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="mb-4 mt-8 text-xl font-semibold">Recent Escrow Activity</h3>

        {payments.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center">
            <p className="text-muted-foreground">No transactions found.</p>
          </div>
        ) : (
          payments.map((payment) => (
            <Card key={payment.id} className="overflow-hidden">
              <div className="flex flex-col justify-between border-b bg-muted/10 p-6 md:flex-row md:items-center">
                <div>
                  <h4 className="text-lg font-semibold">{payment.itemsSummary}</h4>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">Ref: {payment.id}</p>
                </div>
                <div className="mt-4 text-right md:mt-0">
                  <div className="text-2xl font-bold">{formatCurrency(payment.amount)}</div>
                  <div className="mt-2 inline-block rounded-full border bg-background px-3 py-1 text-sm shadow-sm">
                    {payment.status === 'held' ? (
                      <span className="font-medium text-amber-500">Funds Held securely</span>
                    ) : (
                      <span className="font-medium text-green-500">Funds Released</span>
                    )}
                  </div>
                </div>
              </div>

              <CardContent className="pb-2 pt-6">
                <EscrowTimeline orderStatus={payment.orderStatus} paymentStatus={payment.status} />
              </CardContent>

              <CardFooter className="flex justify-end gap-3 border-t bg-muted/10 pt-4">
                {currentRole === 'farmer' && payment.orderStatus === 'Processing' && (
                  <Button onClick={() => updateOrderStatus(payment.id, payment.orderId, 'In Transit')}>Mark as In Transit</Button>
                )}

                {currentRole === 'farmer' && payment.orderStatus === 'In Transit' && (
                  <Button onClick={() => updateOrderStatus(payment.id, payment.orderId, 'Delivered')}>Mark as Delivered</Button>
                )}

                {currentRole === 'buyer' && payment.orderStatus === 'Delivered' && payment.status === 'held' && (
                  <Button onClick={() => releaseFunds(payment.id)} className="bg-green-600 hover:bg-green-700">
                    Confirm Receipt & Release Funds <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}

                {payment.status === 'released' && (
                  <span className="text-sm font-medium text-muted-foreground">Transaction Completed</span>
                )}
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
