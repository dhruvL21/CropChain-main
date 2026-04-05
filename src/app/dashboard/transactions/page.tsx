'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EscrowTimeline, OrderStatus, PaymentStatus } from '@/components/app/escrow-timeline';
import { HandCoins, Landmark, Package, ArrowRight, ShieldCheck } from 'lucide-react';
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

export default function TransactionsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const isFarmer = user?.displayName !== 'Buyer'; // Assuming role logic via context/profile

  // Dynamic query based on user ID
  const paymentsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    
    // In a real app we'd fetch profile role to distinguish, but fallback:
    // query by buyerId OR farmerId. For simplicity in NoSQL we try fetching both or combine client side.
    // However, Firestore doesn't support logical OR across different fields in a single query easily without composite indexes.
    // We'll query using farmerId if farmer, otherwise buyerId. We'll determine role implicitly:
    // if farmer fields exist, or we can just fetch where farmerId == user.uid. If empty, fetch where buyerId == user.uid.
    // Let's do two queries, or just assume the user uses the generic query hook correctly.
    // For this mockup, we'll try buyer query. If empty, assume they might be farmer. 
    // Usually, you know the role. Let's just query where `farmerId == uid`, and if empty, try `buyerId == uid`.
    // Better: use two separate hooks.
    return query(collection(firestore, 'escrowPayments'), where('buyerId', '==', user.uid), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const paymentsQueryFarmer = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'escrowPayments'), where('farmerId', '==', user.uid), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const { data: buyerPayments } = useCollection<EscrowPayment>(paymentsQuery);
  const { data: farmerPayments } = useCollection<EscrowPayment>(paymentsQueryFarmer);

  const payments = (buyerPayments?.length ? buyerPayments : farmerPayments) || [];
  const currentRole = buyerPayments?.length ? 'buyer' : 'farmer';

  // Stats calculation
  const totalHeld = payments.filter(p => p.status === 'held').reduce((acc, p) => acc + p.amount, 0);
  const totalReleased = payments.filter(p => p.status === 'released').reduce((acc, p) => acc + p.amount, 0);
  const pendingDeliveries = payments.filter(p => p.orderStatus !== 'Delivered').length;

  const updateOrderStatus = async (paymentId: string, orderId: string, newStatus: OrderStatus) => {
    if (!firestore || !user) return;
    try {
      // Note: In real app, we must also update the actual 'orders' document.
      // We perform updates to the shared escrow record here for the UI mock.
      const paymentRef = doc(firestore, 'escrowPayments', paymentId);
      await updateDoc(paymentRef, { orderStatus: newStatus, updatedAt: serverTimestamp() });
      toast({ title: 'Status Updated', description: `Order is now ${newStatus}.` });
    } catch (e) {
      console.error(e);
      toast({ title: 'Update Failed', variant: 'destructive' });
    }
  };

  const releaseFunds = async (paymentId: string) => {
    if (!firestore || !user) return;
    try {
      const paymentRef = doc(firestore, 'escrowPayments', paymentId);
      await updateDoc(paymentRef, { status: 'released', updatedAt: serverTimestamp() });
      toast({ title: 'Funds Released', description: 'The farmer will receive the payment shortly.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Release Failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transactions & Escrow</h2>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
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
            <div className="text-3xl font-bold">₹{totalHeld.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Released</CardTitle>
            <HandCoins className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">₹{totalReleased.toFixed(2)}</div>
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
        <h3 className="text-xl font-semibold mt-8 mb-4">Recent Escrow Activity</h3>
        
        {payments.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
            <p className="text-muted-foreground">No transactions found.</p>
          </div>
        ) : (
          payments.map((payment) => (
            <Card key={payment.id} className="overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-muted/10 border-b">
                <div>
                  <h4 className="font-semibold text-lg">{payment.itemsSummary}</h4>
                  <p className="text-sm text-muted-foreground font-mono mt-1">Ref: {payment.id}</p>
                </div>
                <div className="mt-4 md:mt-0 text-right">
                  <div className="text-2xl font-bold">₹{payment.amount.toFixed(2)}</div>
                  <div className="text-sm border rounded-full px-3 py-1 inline-block mt-2 bg-background shadow-sm">
                    {payment.status === 'held' ? (
                      <span className="text-amber-500 font-medium">Funds Held securely</span>
                    ) : (
                      <span className="text-green-500 font-medium">Funds Released</span>
                    )}
                  </div>
                </div>
              </div>
              
              <CardContent className="pt-6 pb-2">
                <EscrowTimeline orderStatus={payment.orderStatus} paymentStatus={payment.status} />
              </CardContent>

              <CardFooter className="bg-muted/10 pt-4 flex justify-end gap-3 border-t">
                {currentRole === 'farmer' && payment.orderStatus === 'Processing' && (
                  <Button onClick={() => updateOrderStatus(payment.id, payment.orderId, 'In Transit')}>
                    Mark as In Transit
                  </Button>
                )}
                
                {currentRole === 'farmer' && payment.orderStatus === 'In Transit' && (
                  <Button onClick={() => updateOrderStatus(payment.id, payment.orderId, 'Delivered')}>
                    Mark as Delivered
                  </Button>
                )}

                {currentRole === 'buyer' && payment.orderStatus === 'Delivered' && payment.status === 'held' && (
                  <Button onClick={() => releaseFunds(payment.id)} className="bg-green-600 hover:bg-green-700">
                    Confirm Receipt & Release Funds <ArrowRight className="ml-2 w-4 h-4" />
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
