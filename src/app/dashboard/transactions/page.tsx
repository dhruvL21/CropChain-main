'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  FileCheck2,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Wallet,
  Clock,
  Truck,
  PackageCheck,
  Banknote,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { collection, doc, query, where, writeBatch, serverTimestamp, increment, runTransaction } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { EscrowTimeline, OrderStatus, PaymentStatus } from '@/components/app/escrow-timeline';
import {
  buildTransactionRecord,
  createTransactionId,
  isTransactionIntact,
  TransactionRecord,
  TransactionStatus,
  VerificationStatus,
} from '@/lib/transactions';

interface UserProfile {
  firstName?: string;
  lastName?: string;
  role?: 'farmer' | 'buyer';
  balance?: number;
}

const statusLabels: Record<TransactionStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  in_escrow: 'In Escrow',
  delivered: 'Delivered',
  released: 'Released',
  disputed: 'Disputed',
  cancelled: 'Cancelled',
};

const verificationLabels: Record<VerificationStatus, string> = {
  unverified: 'Unverified',
  partially_verified: 'Partially Verified',
  verified: 'Verified',
};

const statusVariant: Record<TransactionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  paid: 'default',
  in_escrow: 'default',
  delivered: 'outline',
  released: 'default',
  disputed: 'destructive',
  cancelled: 'destructive',
};

const initialForm = {
  cropName: '',
  quantity: '1',
  unit: 'kg',
  unitPrice: '',
  farmerName: '',
  buyerName: '',
  paymentMode: 'UPI',
  referenceNumber: '',
  status: 'pending' as TransactionStatus,
  verificationStatus: 'unverified' as VerificationStatus,
  notes: '',
};

function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function csvEscape(value: string | number | undefined) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

export default function TransactionsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [form, setForm] = useState(initialForm);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpPaymentMode, setTopUpPaymentMode] = useState('UPI');
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [escrowProcessing, setEscrowProcessing] = useState<Record<string, boolean>>({});

  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const currentRole = userProfile?.role ?? 'buyer';

  // Real-time Escrow Payments
  const escrowQuery = useMemo(() => {
    if (!firestore || !user || !userProfile?.role) return null;
    const roleField = userProfile.role === 'farmer' ? 'farmerId' : 'buyerId';
    return query(collection(firestore, 'escrowPayments'), where(roleField, '==', user.uid));
  }, [firestore, user, userProfile?.role]);

  const { data: escrowPayments, isLoading: isLoadingEscrow } = useCollection<any>(escrowQuery);

  // Real-time Transactions from Firestore
  const transactionsQuery = useMemo(() => {
    if (!firestore || !user || !userProfile?.role) return null;
    const roleField = userProfile.role === 'farmer' ? 'farmerId' : 'buyerId';
    return query(collection(firestore, 'transactions'), where(roleField, '==', user.uid));
  }, [firestore, user, userProfile?.role]);

  const { data: firestoreTransactions, isLoading: isLoadingTxns } = useCollection<TransactionRecord>(transactionsQuery);

  const transactions = useMemo(() => {
    const list = [...(firestoreTransactions ?? [])];
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [firestoreTransactions]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (summary, transaction) => {
        summary.total += transaction.totalAmount;
        if (transaction.status === 'in_escrow') summary.escrow += transaction.totalAmount;
        if (transaction.status === 'released' || transaction.status === 'paid') summary.completed += transaction.totalAmount;
        if (!isTransactionIntact(transaction)) summary.flagged += 1;
        return summary;
      },
      { total: 0, escrow: 0, completed: 0, flagged: 0 }
    );
  }, [transactions]);

  // Wallet top-up action
  const handleTopUp = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a positive amount to add.',
        variant: 'destructive',
      });
      return;
    }

    setIsToppingUp(true);
    try {
      const now = new Date().toISOString();
      const userRef = doc(firestore!, 'users', user!.uid);
      const txnRef = doc(collection(firestore!, 'transactions'));

      const currentUserName = [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') || user?.displayName || 'User';

      const txnRecord = buildTransactionRecord({
        id: createTransactionId('TOPUP'),
        type: 'wallet_top_up',
        cropName: 'Wallet Top Up',
        quantity: 1,
        unit: 'topup',
        unitPrice: amount,
        totalAmount: amount,
        farmerId: userProfile?.role === 'farmer' ? user!.uid : undefined,
        farmerName: userProfile?.role === 'farmer' ? currentUserName : 'CropChain System',
        buyerId: userProfile?.role === 'buyer' ? user!.uid : undefined,
        buyerName: userProfile?.role === 'buyer' ? currentUserName : 'CropChain System',
        status: 'paid',
        verificationStatus: 'verified',
        paymentMode: topUpPaymentMode,
        referenceNumber: createTransactionId('REF'),
        source: 'wallet',
        createdAt: now,
        updatedAt: now,
      });

      await runTransaction(firestore!, async (transaction) => {
        transaction.update(userRef, {
          balance: increment(amount),
          updatedAt: serverTimestamp(),
        });
        transaction.set(txnRef, txnRecord);
      });

      toast({
        title: 'Wallet Topped Up Successfully',
        description: `Added ₹${amount.toFixed(2)} to your wallet balance.`,
      });
      setTopUpAmount('');
    } catch (err) {
      console.error(err);
      toast({
        title: 'Top up failed',
        description: 'An error occurred while topping up. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsToppingUp(false);
    }
  };

  // Farmer updates order status
  const handleUpdateOrderStatus = async (paymentId: string, orderId: string, newStatus: OrderStatus) => {
    if (!firestore || !user) return;

    setEscrowProcessing((prev) => ({ ...prev, [paymentId]: true }));
    try {
      const paymentRef = doc(firestore, 'escrowPayments', paymentId);
      const payment = escrowPayments?.find((item) => item.id === paymentId);
      if (!payment) return;

      const batch = writeBatch(firestore);
      batch.update(paymentRef, { orderStatus: newStatus, updatedAt: serverTimestamp() });

      if (payment.farmerId) {
        const orderRef = doc(firestore, 'users', payment.farmerId, 'orders', orderId);
        batch.update(orderRef, { status: newStatus, updatedAt: serverTimestamp() });
      }

      await batch.commit();

      // Update matching transactions status in background
      await updateOrderStatusInTransactions(orderId, newStatus === 'Delivered' ? 'delivered' : 'in_escrow');

      toast({ title: 'Status Updated', description: `Order status is now ${newStatus}.` });
    } catch (error) {
      console.error(error);
      toast({ title: 'Update Failed', variant: 'destructive' });
    } finally {
      setEscrowProcessing((prev) => ({ ...prev, [paymentId]: false }));
    }
  };

  const updateOrderStatusInTransactions = async (orderId: string, newStatus: TransactionStatus) => {
    try {
      const { getDocs, query, collection, where, updateDoc } = await import('firebase/firestore');
      const q = query(collection(firestore!, 'transactions'), where('orderId', '==', orderId));
      const querySnapshot = await getDocs(q);
      const updatePromises = querySnapshot.docs.map((d) => {
        return updateDoc(d.ref, {
          status: newStatus,
          updatedAt: new Date().toISOString()
        });
      });
      await Promise.all(updatePromises);
    } catch (e) {
      console.error('Failed to sync transaction status in Firestore', e);
    }
  };

  // Buyer confirms receipt & releases funds
  const handleReleaseFunds = async (paymentId: string) => {
    if (!firestore || !user) return;

    const payment = escrowPayments?.find((item) => item.id === paymentId);
    if (!payment) return;

    setEscrowProcessing((prev) => ({ ...prev, [paymentId]: true }));
    try {
      const { getDocs, query, collection, where } = await import('firebase/firestore');
      const q = query(collection(firestore, 'transactions'), where('orderId', '==', payment.orderId));
      const querySnapshot = await getDocs(q);

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

        querySnapshot.docs.forEach((docSnapshot) => {
          transaction.update(docSnapshot.ref, {
            status: 'released',
            verificationStatus: 'verified',
            updatedAt: new Date().toISOString()
          });
        });
      });

      toast({ title: 'Funds Released', description: 'The farmer has received the payment.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Release Failed', variant: 'destructive' });
    } finally {
      setEscrowProcessing((prev) => ({ ...prev, [paymentId]: false }));
    }
  };

  // Create manual transaction
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const quantity = Number(form.quantity);
    const unitPrice = Number(form.unitPrice);

    if (!form.cropName.trim() || !form.farmerName.trim() || !form.buyerName.trim() || quantity <= 0 || unitPrice <= 0) {
      toast({
        title: 'Check the transaction details',
        description: 'Crop, farmer, buyer, quantity, and unit price are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const now = new Date().toISOString();
      const currentUserName = [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') || user?.displayName || 'Current user';
      
      const record = buildTransactionRecord({
        id: createTransactionId('MAN'),
        type: 'manual_record',
        cropName: form.cropName.trim(),
        quantity,
        unit: form.unit.trim() || 'unit',
        unitPrice,
        totalAmount: quantity * unitPrice,
        farmerId: userProfile?.role === 'farmer' ? user?.uid : undefined,
        farmerName: form.farmerName.trim() || (userProfile?.role === 'farmer' ? currentUserName : 'Farmer'),
        buyerId: userProfile?.role === 'buyer' ? user?.uid : undefined,
        buyerName: form.buyerName.trim() || (userProfile?.role === 'buyer' ? currentUserName : 'Buyer'),
        status: form.status,
        verificationStatus: form.verificationStatus,
        paymentMode: form.paymentMode,
        referenceNumber: form.referenceNumber.trim() || 'Not provided',
        notes: form.notes.trim(),
        source: 'manual',
        createdAt: now,
        updatedAt: now,
      });

      const { setDoc } = await import('firebase/firestore');
      const txnRef = doc(collection(firestore!, 'transactions'));
      await setDoc(txnRef, record);

      setForm(initialForm);
      toast({
        title: 'Transaction recorded',
        description: `${record.id} was saved to Firestore ledger.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Failed to record transaction',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleExport = () => {
    const headers = [
      'Transaction ID',
      'Date',
      'Farmer',
      'Buyer',
      'Crop',
      'Quantity',
      'Unit',
      'Total Amount',
      'Status',
      'Verification',
      'Payment Mode',
      'Reference',
      'Checksum',
    ];
    const rows = transactions.map((transaction) => [
      transaction.id,
      new Date(transaction.createdAt).toLocaleString(),
      transaction.farmerName,
      transaction.buyerName,
      transaction.cropName,
      transaction.quantity,
      transaction.unit,
      transaction.totalAmount,
      statusLabels[transaction.status],
      verificationLabels[transaction.verificationStatus],
      transaction.paymentMode,
      transaction.referenceNumber,
      transaction.checksum,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cropchain-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Transactions</h1>
          <p className="text-muted-foreground">
            Track secure escrow payments, update order shipping status, and manage your wallet balance in real-time.
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" disabled={transactions.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recorded Value</CardTitle>
            <FileCheck2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.total)}</div>
            <p className="text-xs text-muted-foreground">{transactions.length} transaction records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Held in Escrow</CardTitle>
            <LockKeyhole className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.escrow)}</div>
            <p className="text-xs text-muted-foreground">Funds awaiting delivery or release</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Value</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.completed)}</div>
            <p className="text-xs text-muted-foreground">Paid or released transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Flags</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.flagged}</div>
            <p className="text-xs text-muted-foreground">Checksum mismatches in ledger</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          {/* Wallet Balance Card */}
          <Card className="relative overflow-hidden border border-border bg-background/50 backdrop-blur-md shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Your CropChain Wallet</CardTitle>
                <CardDescription>Add money to top up your balance and purchase secure escrow orders.</CardDescription>
              </div>
              <Wallet className="h-8 w-8 text-primary" />
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 items-center">
              <div className="flex flex-col gap-1.5 p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-sm max-w-sm">
                <span className="text-sm text-primary font-medium tracking-wide uppercase">Wallet Balance</span>
                <span className="text-4xl font-extrabold text-primary">{formatCurrency(userProfile?.balance ?? 0)}</span>
              </div>
              <form onSubmit={handleTopUp} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="topUpAmount">Top-up Amount (₹)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="topUpAmount"
                      type="number"
                      placeholder="e.g. 500"
                      min="1"
                      step="1"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      required
                    />
                    <Button type="submit" disabled={isToppingUp} className="bg-primary hover:bg-primary/90">
                      {isToppingUp ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Add Money'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Escrow Timeline / Active Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Escrow Payment Pipelines</CardTitle>
              <CardDescription>
                {currentRole === 'farmer' 
                  ? 'Manage and fulfill orders placed by buyers. Update status to trigger escrow checkpoints.' 
                  : 'Track payment custody. Confirm delivery receipt to release escrow funds directly to the farmer.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingEscrow ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !escrowPayments || escrowPayments.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-border/60 rounded-xl bg-background/20">
                  <p className="text-muted-foreground text-sm">No active escrow transactions found.</p>
                </div>
              ) : (
                escrowPayments.map((payment) => (
                  <Card key={payment.id} className="overflow-hidden border border-border/30 bg-background/40 backdrop-blur-md shadow-sm">
                    <div className="flex flex-col justify-between border-b border-border/20 bg-muted/20 p-4 md:flex-row md:items-center">
                      <div>
                        <h4 className="text-md font-bold text-foreground">{payment.itemsSummary}</h4>
                        <p className="font-mono text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded inline-block">
                          Ref: {payment.id}
                        </p>
                      </div>
                      <div className="mt-3 text-left md:mt-0 md:text-right">
                        <div className="text-xl font-bold text-foreground">{formatCurrency(payment.amount)}</div>
                        <div className="mt-1">
                          {payment.status === 'held' ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                              Funds Held Securely
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Funds Released
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      <EscrowTimeline orderStatus={payment.orderStatus} paymentStatus={payment.status} />
                    </CardContent>

                    <CardFooter className="flex justify-end gap-2 border-t border-border/20 bg-muted/10 p-3">
                      {currentRole === 'farmer' && payment.orderStatus === 'Processing' && (
                        <Button 
                          disabled={escrowProcessing[payment.id]}
                          onClick={() => handleUpdateOrderStatus(payment.id, payment.orderId, 'In Transit')}
                          className="bg-primary hover:bg-primary/90 text-xs py-1 h-8"
                        >
                          {escrowProcessing[payment.id] ? <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Truck className="mr-1 h-3.5 w-3.5" />} Mark as In Transit
                        </Button>
                      )}

                      {currentRole === 'farmer' && payment.orderStatus === 'In Transit' && (
                        <Button 
                          disabled={escrowProcessing[payment.id]}
                          onClick={() => handleUpdateOrderStatus(payment.id, payment.orderId, 'Delivered')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1 h-8"
                        >
                          {escrowProcessing[payment.id] ? <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" /> : <PackageCheck className="mr-1 h-3.5 w-3.5" />} Mark as Delivered
                        </Button>
                      )}

                      {currentRole === 'buyer' && payment.orderStatus === 'Delivered' && payment.status === 'held' && (
                        <Button 
                          disabled={escrowProcessing[payment.id]}
                          onClick={() => handleReleaseFunds(payment.id)} 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1 h-8"
                        >
                          {escrowProcessing[payment.id] ? <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="mr-1 h-3.5 w-3.5" />} Confirm Receipt & Release Funds
                        </Button>
                      )}

                      {payment.status === 'released' && (
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <ShieldCheck className="h-4 w-4 text-emerald-500" /> Fulfill Completed
                        </span>
                      )}
                    </CardFooter>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Transactions History Ledger */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Ledger</CardTitle>
              <CardDescription>
                Real-time audited transactions record synced with Firestore. Cryptographic checksums ensure ledger integrity.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {isLoadingTxns ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Parties</TableHead>
                      <TableHead>Crop</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Security</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length > 0 ? (
                      transactions.map((transaction) => {
                        const intact = isTransactionIntact(transaction);
                        return (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              <div className="font-medium">{transaction.id}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(transaction.createdAt).toLocaleDateString()} · {transaction.source}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-semibold">{transaction.farmerName}</div>
                              <div className="text-xs text-muted-foreground">to {transaction.buyerName}</div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[180px] truncate font-medium">{transaction.cropName}</div>
                              <div className="text-xs text-muted-foreground">
                                {transaction.quantity} {transaction.unit} at {formatCurrency(transaction.unitPrice)}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">{formatCurrency(transaction.totalAmount)}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariant[transaction.status]}>{statusLabels[transaction.status]}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={transaction.verificationStatus === 'verified' ? 'default' : 'secondary'}>
                                {verificationLabels[transaction.verificationStatus]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={intact ? 'outline' : 'destructive'}>
                                {intact ? 'Checksum OK' : 'Review'}
                              </Badge>
                              <div className="mt-1 text-[10px] text-muted-foreground">{transaction.paymentMode}</div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          No transactions recorded yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Record Offline / Manual Transactions */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Record Transaction
            </CardTitle>
            <CardDescription>
              Add offline crop trades, cash, UPI, bank transfers directly to the Firestore ledger.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="cropName">Crop or item</Label>
                <Input id="cropName" value={form.cropName} onChange={(event) => setForm({ ...form, cropName: event.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" type="number" min="0.01" step="0.01" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input id="unit" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitPrice">Unit price (₹)</Label>
                <Input id="unitPrice" type="number" min="0.01" step="0.01" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="farmerName">Farmer Name</Label>
                  <Input id="farmerName" value={form.farmerName} onChange={(event) => setForm({ ...form, farmerName: event.target.value })} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="buyerName">Buyer Name</Label>
                  <Input id="buyerName" value={form.buyerName} onChange={(event) => setForm({ ...form, buyerName: event.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(status: TransactionStatus) => setForm({ ...form, status })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Verification</Label>
                  <Select value={form.verificationStatus} onValueChange={(verificationStatus: VerificationStatus) => setForm({ ...form, verificationStatus })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(verificationLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="paymentMode">Payment Mode</Label>
                  <Input id="paymentMode" value={form.paymentMode} onChange={(event) => setForm({ ...form, paymentMode: event.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="referenceNumber">Reference Number</Label>
                  <Input id="referenceNumber" value={form.referenceNumber} onChange={(event) => setForm({ ...form, referenceNumber: event.target.value })} placeholder="UPI/bank transaction ID" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </div>
              <Button type="submit" className="w-full">Save Transaction</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
