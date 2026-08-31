"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AmountDisplay } from "@/components/config/amount-display";
import { cn } from "@/lib/utils";
import { CreditCard, Banknote, CheckCircle2, Clock, XCircle, FileText, Download } from "lucide-react";

interface PaymentSummaryCardProps {
  title: string;
  totalAmount: number | string;
  paidAmount?: number | string;
  pendingAmount?: number | string;
  deductionAmount?: number | string;
  deductionPercent?: number | string;
  className?: string;
}

export const PaymentSummaryCard: React.FC<PaymentSummaryCardProps> = ({
  title,
  totalAmount,
  paidAmount,
  pendingAmount,
  deductionAmount,
  deductionPercent,
  className,
}) => {
  return (
    <Card className={cn("overflow-hidden border shadow-sm", className)}>
      <CardHeader className="bg-muted/40 py-3 px-4 border-b">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
          <span>{title}</span>
          <span className="text-xs text-muted-foreground font-normal">Payment Summary / भुगतान विवरण</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <span className="text-xs text-muted-foreground block">Total Amount (कुल राशि)</span>
          <AmountDisplay amount={totalAmount} size="lg" className="text-foreground" />
        </div>
        {paidAmount !== undefined && (
          <div>
            <span className="text-xs text-muted-foreground block">Paid Amount (जमा राशि)</span>
            <AmountDisplay amount={paidAmount} size="lg" className="text-emerald-600 dark:text-emerald-400" />
          </div>
        )}
        {pendingAmount !== undefined && (
          <div>
            <span className="text-xs text-muted-foreground block">Pending (बकाया राशि)</span>
            <AmountDisplay amount={pendingAmount} size="lg" className="text-amber-600 dark:text-amber-400" />
          </div>
        )}
        {deductionAmount !== undefined && (
          <div>
            <span className="text-xs text-muted-foreground block">
              Deduction ({deductionPercent || 0}% कटौती)
            </span>
            <AmountDisplay amount={deductionAmount} size="lg" className="text-rose-600 dark:text-rose-400" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface PaymentStatusChipProps {
  status: "paid" | "pending" | "failed" | "partial" | number | string;
  className?: string;
}

export const PaymentStatusChip: React.FC<PaymentStatusChipProps> = ({ status, className }) => {
  const norm = String(status || "").toLowerCase();

  if (norm === "paid" || norm === "1" || norm === "success") {
    return (
      <Badge variant="outline" className={cn("bg-emerald-50 text-emerald-700 border-emerald-200 gap-1", className)}>
        <CheckCircle2 className="h-3 w-3" />
        <span>Paid / भुगतान पूर्ण</span>
      </Badge>
    );
  }

  if (norm === "partial") {
    return (
      <Badge variant="outline" className={cn("bg-blue-50 text-blue-700 border-blue-200 gap-1", className)}>
        <Clock className="h-3 w-3" />
        <span>Partial / आंशिक</span>
      </Badge>
    );
  }

  if (norm === "failed" || norm === "error") {
    return (
      <Badge variant="outline" className={cn("bg-rose-50 text-rose-700 border-rose-200 gap-1", className)}>
        <XCircle className="h-3 w-3" />
        <span>Failed / विफल</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn("bg-amber-50 text-amber-700 border-amber-200 gap-1", className)}>
      <Clock className="h-3 w-3" />
      <span>Pending / लंबित</span>
    </Badge>
  );
};

interface PaymentBreakdownProps {
  items: Array<{
    label: string;
    labelHi?: string;
    amount: number | string;
    isDeduction?: boolean;
    isTotal?: boolean;
  }>;
  className?: string;
}

export const PaymentBreakdown: React.FC<PaymentBreakdownProps> = ({ items, className }) => {
  return (
    <div className={cn("rounded-lg border bg-card text-card-foreground p-4 space-y-2 text-sm", className)}>
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            "flex justify-between items-center py-1",
            item.isTotal && "border-t border-border pt-2 font-bold text-base",
            item.isDeduction && "text-rose-600 dark:text-rose-400"
          )}
        >
          <div>
            <span>{item.label}</span>
            {item.labelHi && <span className="text-xs text-muted-foreground ml-1">({item.labelHi})</span>}
          </div>
          <AmountDisplay
            amount={item.amount}
            prefix={item.isDeduction ? "- " : undefined}
            size={item.isTotal ? "lg" : "md"}
          />
        </div>
      ))}
    </div>
  );
};

interface PaymentActionButtonsProps {
  onCashPay?: () => void;
  onOnlinePay?: () => void;
  onDownloadReceipt?: () => void;
  isLoading?: boolean;
  canPay?: boolean;
  className?: string;
}

export const PaymentActionButtons: React.FC<PaymentActionButtonsProps> = ({
  onCashPay,
  onOnlinePay,
  onDownloadReceipt,
  isLoading = false,
  canPay = true,
  className,
}) => {
  return (
    <div className={cn("flex flex-wrap gap-2 items-center", className)}>
      {onCashPay && (
        <Button
          variant="outline"
          onClick={onCashPay}
          disabled={!canPay || isLoading}
          className="flex items-center gap-1.5"
        >
          <Banknote className="h-4 w-4 text-emerald-600" />
          <span>Cash Payment / नकद</span>
        </Button>
      )}
      {onOnlinePay && (
        <Button
          variant="default"
          onClick={onOnlinePay}
          disabled={!canPay || isLoading}
          className="bg-[#F57C00] hover:bg-[#E65100] text-white flex items-center gap-1.5 shadow-sm"
        >
          <CreditCard className="h-4 w-4" />
          <span>Razorpay / ऑनलाइन</span>
        </Button>
      )}
      {onDownloadReceipt && (
        <Button
          variant="secondary"
          onClick={onDownloadReceipt}
          disabled={isLoading}
          className="flex items-center gap-1.5"
        >
          <Download className="h-4 w-4" />
          <span>Receipt / रसीद</span>
        </Button>
      )}
    </div>
  );
};
