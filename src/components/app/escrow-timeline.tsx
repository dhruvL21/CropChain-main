'use client';

import { Check, Clock, Truck, PackageCheck, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentStatus = 'held' | 'released';
export type OrderStatus = 'Processing' | 'In Transit' | 'Delivered';

interface EscrowTimelineProps {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
}

const steps = [
  { id: 'step1', title: 'Paid (Held)', icon: Clock },
  { id: 'step2', title: 'In Transit', icon: Truck },
  { id: 'step3', title: 'Delivered', icon: PackageCheck },
  { id: 'step4', title: 'Released', icon: Banknote },
];

export function EscrowTimeline({ orderStatus, paymentStatus }: EscrowTimelineProps) {
  // Determine current active step index (0-3) based on statuses
  let currentStepIndex = 0;
  
  if (paymentStatus === 'released') {
    currentStepIndex = 3;
  } else if (orderStatus === 'Delivered') {
    currentStepIndex = 2;
  } else if (orderStatus === 'In Transit') {
    currentStepIndex = 1;
  }

  return (
    <div className="relative py-4">
      <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-in-out" 
          style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
        />
      </div>
      
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isActive = index === currentStepIndex;
          const Icon = isCompleted && !isActive ? Check : step.icon;
          
          return (
            <div key={step.id} className="flex flex-col items-center gap-2 relative z-10 w-20">
              <div 
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500",
                  isCompleted 
                    ? "border-primary bg-primary text-primary-foreground shadow-md" 
                    : "border-muted bg-background text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "animate-pulse")} />
              </div>
              <span 
                className={cn(
                  "text-xs font-medium text-center whitespace-nowrap",
                  isCompleted ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
