'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Lock, CreditCard, CheckCircle2, ShieldCheck } from 'lucide-react';

interface CheckoutPaymentDialogProps {
  totalAmount: number;
  onConfirmPayment: () => Promise<void>;
  disabled?: boolean;
}

export function CheckoutPaymentDialog({ totalAmount, onConfirmPayment, disabled }: CheckoutPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    // Simulate network payment gateway delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      await onConfirmPayment();
      setIsSuccess(true);
      // Wait a moment for the user to see the success state
      setTimeout(() => {
        setOpen(false);
        setIsSuccess(false);
        setIsProcessing(false);
      }, 1500);
    } catch (e) {
      console.error('Payment failed', e);
      setIsProcessing(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (isProcessing) return; // Prevent closing while processing
    setOpen(newOpen);
    if (!newOpen) {
      setIsSuccess(false);
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full" disabled={disabled}>
          <CreditCard className="mr-2 h-4 w-4" />
          Pay Now (₹{totalAmount.toFixed(2)})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Complete Payment
          </DialogTitle>
          <DialogDescription>
            Review your payment details to confirm your order.
          </DialogDescription>
        </DialogHeader>
        
        {!isSuccess ? (
          <div className="flex flex-col gap-6 py-6">
            <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/20 p-6 text-center">
              <span className="text-sm font-medium text-muted-foreground mb-1">Total Amount Due</span>
              <span className="text-4xl font-bold">₹{totalAmount.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-center gap-2 rounded-md bg-green-100 p-3 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm font-medium tracking-tight">Secured by Escrow 🔒</span>
            </div>
            <p className="text-xs text-center text-muted-foreground px-4">
              Your funds will be held securely in escrow and only released to the seller upon delivery confirmation.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 animate-in zoom-in duration-300" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Payment Successful</h3>
              <p className="text-sm text-muted-foreground">Your funds are now securely held.</p>
            </div>
          </div>
        )}

        {!isSuccess && (
          <DialogFooter className="sm:justify-between flex-row items-center">
            <div className="flex items-center text-xs text-muted-foreground">
              <Lock className="mr-1 h-3 w-3" />
              256-bit encryption
            </div>
            <Button onClick={handleConfirm} disabled={isProcessing}>
              {isProcessing ? 'Processing Securely...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
