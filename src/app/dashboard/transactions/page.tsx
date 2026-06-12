'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, FileCheck2, LockKeyhole, Plus, ShieldCheck } from 'lucide-react';
import { collection, doc, query, where } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import {
  buildTransactionRecord,
  createTransactionId,
  isTransactionIntact,
  readLocalTransactions,
  TRANSACTION_EVENT,
  TransactionRecord,
  TransactionStatus,
  VerificationStatus,
  writeLocalTransactions,
} from '@/lib/transactions';

interface UserProfile {
  firstName?: string;
  lastName?: string;
  role?: 'farmer' | 'buyer';
}

interface OfferRecord {
  buyerId: string;
  buyerName?: string;
  farmerId: string;
  cropName: string;
  quantity: number;
  unit: string;
  offerPrice: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: { toDate?: () => Date } | string;
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
  return `INR ${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getDate(value: OfferRecord['createdAt']) {
  if (!value) return new Date();
  if (typeof value === 'string') return new Date(value);
  if (value.toDate) return value.toDate();
  return new Date();
}

function csvEscape(value: string | number | undefined) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

export default function TransactionsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [localTransactions, setLocalTransactions] = useState<TransactionRecord[]>([]);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    const refresh = () => setLocalTransactions(readLocalTransactions());
    refresh();
    window.addEventListener(TRANSACTION_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(TRANSACTION_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const buyerOffersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'offers'), where('buyerId', '==', user.uid));
  }, [firestore, user]);

  const farmerOffersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'offers'), where('farmerId', '==', user.uid));
  }, [firestore, user]);

  const { data: buyerOffers } = useCollection<OfferRecord>(buyerOffersQuery);
  const { data: farmerOffers } = useCollection<OfferRecord>(farmerOffersQuery);

  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const firestoreTransactions = useMemo(() => {
    const mergedOffers = [...(buyerOffers ?? []), ...(farmerOffers ?? [])];
    const unique = new Map<string, TransactionRecord>();

    mergedOffers
      .filter((offer) => offer.status === 'accepted')
      .forEach((offer) => {
        const createdAt = getDate(offer.createdAt).toISOString();
        const totalAmount = Number(offer.offerPrice || 0) * Number(offer.quantity || 0);
        const record = buildTransactionRecord({
          id: `OFF-${offer.id}`,
          type: 'wholesale_offer',
          cropName: offer.cropName,
          quantity: Number(offer.quantity || 0),
          unit: offer.unit || 'unit',
          unitPrice: Number(offer.offerPrice || 0),
          totalAmount,
          farmerId: offer.farmerId,
          farmerName: offer.farmerId === user?.uid ? 'You' : 'Farmer',
          buyerId: offer.buyerId,
          buyerName: offer.buyerId === user?.uid ? 'You' : offer.buyerName || 'Buyer',
          status: 'pending',
          verificationStatus: 'partially_verified',
          paymentMode: 'To be settled',
          referenceNumber: offer.id,
          source: 'firestore',
          createdAt,
          updatedAt: createdAt,
        });

        unique.set(record.id, record);
      });

    return Array.from(unique.values());
  }, [buyerOffers, farmerOffers, user?.uid]);

  const transactions = useMemo(() => {
    const byId = new Map<string, TransactionRecord>();
    [...firestoreTransactions, ...localTransactions]
      .filter((record) => !user?.uid || record.buyerId === user.uid || record.farmerId === user.uid || record.source === 'manual')
      .forEach((record) => byId.set(record.id, record));

    return Array.from(byId.values()).sort((first, second) => {
      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    });
  }, [firestoreTransactions, localTransactions, user?.uid]);

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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

    const now = new Date().toISOString();
    const currentUserName = [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') || user?.displayName || 'Current user';
    const record = buildTransactionRecord({
      id: createTransactionId(),
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

    const nextTransactions = [record, ...localTransactions];
    writeLocalTransactions(nextTransactions);
    setLocalTransactions(nextTransactions);
    setForm(initialForm);
    toast({
      title: 'Transaction recorded',
      description: `${record.id} was added to the local ledger.`,
    });
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
            Track crop payments, escrow status, verification, and records between farmers and buyers.
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
            <p className="text-xs text-muted-foreground">Checksum mismatches in local records</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Ledger</CardTitle>
            <CardDescription>
              Accepted offers are read from Firestore. Checkout and manual records are stored in this browser for free.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
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
                          <div className="text-sm">{transaction.farmerName}</div>
                          <div className="text-xs text-muted-foreground">to {transaction.buyerName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[220px] truncate font-medium">{transaction.cropName}</div>
                          <div className="text-xs text-muted-foreground">
                            {transaction.quantity} {transaction.unit} at {formatCurrency(transaction.unitPrice)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(transaction.totalAmount)}</TableCell>
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
                          <div className="mt-1 text-xs text-muted-foreground">{transaction.paymentMode} · {transaction.referenceNumber}</div>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Record Transaction
            </CardTitle>
            <CardDescription>
              Add cash, UPI, bank, or offline escrow records without any paid API.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="cropName">Crop or item</Label>
                <Input id="cropName" value={form.cropName} onChange={(event) => setForm({ ...form, cropName: event.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" type="number" min="0" step="0.01" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input id="unit" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitPrice">Unit price</Label>
                <Input id="unitPrice" type="number" min="0" step="0.01" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="farmerName">Farmer</Label>
                  <Input id="farmerName" value={form.farmerName} onChange={(event) => setForm({ ...form, farmerName: event.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="buyerName">Buyer</Label>
                  <Input id="buyerName" value={form.buyerName} onChange={(event) => setForm({ ...form, buyerName: event.target.value })} />
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
                  <Label htmlFor="paymentMode">Payment mode</Label>
                  <Input id="paymentMode" value={form.paymentMode} onChange={(event) => setForm({ ...form, paymentMode: event.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="referenceNumber">Reference</Label>
                  <Input id="referenceNumber" value={form.referenceNumber} onChange={(event) => setForm({ ...form, referenceNumber: event.target.value })} placeholder="UPI/bank/invoice last 4" />
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
