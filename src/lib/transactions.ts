'use client';

export type TransactionStatus = 'pending' | 'paid' | 'in_escrow' | 'delivered' | 'released' | 'disputed' | 'cancelled';
export type TransactionType = 'retail_order' | 'wholesale_offer' | 'manual_record' | 'shop_purchase' | 'wallet_top_up';
export type VerificationStatus = 'unverified' | 'partially_verified' | 'verified';

export interface TransactionRecord {
  id: string;
  type: TransactionType;
  cropName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  farmerId?: string;
  farmerName: string;
  buyerId?: string;
  buyerName: string;
  status: TransactionStatus;
  verificationStatus: VerificationStatus;
  paymentMode: string;
  referenceNumber: string;
  notes?: string;
  orderId?: string;
  source: 'checkout' | 'manual' | 'firestore' | 'wallet';
  createdAt: string;
  updatedAt: string;
  checksum: string;
}

export const TRANSACTION_STORAGE_KEY = 'cropchain.transactions.v1';
export const TRANSACTION_EVENT = 'cropchain-transactions-updated';

const checksumFields = [
  'id',
  'type',
  'cropName',
  'quantity',
  'unit',
  'unitPrice',
  'totalAmount',
  'farmerId',
  'farmerName',
  'buyerId',
  'buyerName',
  'status',
  'verificationStatus',
  'paymentMode',
  'referenceNumber',
  'orderId',
  'source',
  'createdAt',
] as const;

function getChecksumPayload(record: Omit<TransactionRecord, 'checksum'> | TransactionRecord) {
  return checksumFields.map((field) => `${field}:${record[field] ?? ''}`).join('|');
}

export function createTransactionChecksum(record: Omit<TransactionRecord, 'checksum'> | TransactionRecord) {
  const payload = getChecksumPayload(record);
  let hash = 2166136261;

  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function isTransactionIntact(record: TransactionRecord) {
  return record.checksum === createTransactionChecksum(record);
}

export function createTransactionId(prefix = 'TXN') {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${random}`;
}

export function readLocalTransactions() {
  if (typeof window === 'undefined') {
    return [] as TransactionRecord[];
  }

  try {
    const raw = window.localStorage.getItem(TRANSACTION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as TransactionRecord[] : [];
  } catch {
    return [];
  }
}

export function writeLocalTransactions(records: TransactionRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(TRANSACTION_EVENT));
}

export function upsertLocalTransactions(records: TransactionRecord[]) {
  const current = readLocalTransactions();
  const byId = new Map(current.map((record) => [record.id, record]));

  records.forEach((record) => {
    byId.set(record.id, {
      ...record,
      checksum: createTransactionChecksum(record),
    });
  });

  writeLocalTransactions(Array.from(byId.values()));
}

export function buildTransactionRecord(record: Omit<TransactionRecord, 'checksum'>): TransactionRecord {
  return {
    ...record,
    checksum: createTransactionChecksum(record),
  };
}
