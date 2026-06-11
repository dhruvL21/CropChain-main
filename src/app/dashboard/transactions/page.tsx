import { Metadata } from 'next';
import TransactionsDashboard from './transactions-client';

export const metadata: Metadata = {
  title: 'Transactions Dashboard | CropChain',
  description: 'Track secure escrow payments, update order shipping status, and confirm receipt to release funds on the CropChain agricultural supply chain ecosystem.',
};

export default function TransactionsPage() {
  return <TransactionsDashboard />;
}
