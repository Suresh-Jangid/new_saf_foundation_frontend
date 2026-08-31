"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { AmountDisplay } from "@/components/config/amount-display";
import { PaymentStatusChip } from "@/components/payment/reusable-payment-components";
import { Search, Filter, Download, CreditCard, Banknote, RefreshCw } from "lucide-react";
import { formatDateForInput } from "@/lib/utils";

export interface BulkEmiFilterState {
  startDate: Date | null;
  endDate: Date | null;
  userId: string;
}

export interface BulkEmiEngineProps {
  title: string;
  subtitle?: string;
  schemeCode: string;
  selectedCount: number;
  totalBatchAmount: number;
  isLoading: boolean;
  isSubmitting: boolean;
  onFilterSubmit: (filters: BulkEmiFilterState) => void;
  onBatchSubmit: (paymentMode: string) => void;
  onExportExcel?: () => void;
  children: React.ReactNode;
}

export const BulkEmiEngine: React.FC<BulkEmiEngineProps> = ({
  title,
  subtitle,
  schemeCode,
  selectedCount,
  totalBatchAmount,
  isLoading,
  isSubmitting,
  onFilterSubmit,
  onBatchSubmit,
  onExportExcel,
  children,
}) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [userId, setUserId] = useState("");
  const [paymentMode, setPaymentMode] = useState<string>("Cash");

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterSubmit({ startDate, endDate, userId });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        {onExportExcel && (
          <Button variant="outline" onClick={onExportExcel} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span>Export to Excel / एक्सेल निर्यात</span>
          </Button>
        )}
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <span>Search & Filter Records / रिकॉर्ड खोजें एवं फ़िल्टर करें</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFilter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <Label className="text-xs mb-1 block">Start Date (प्रारंभ तिथि)</Label>
              <DatePicker
                id="bulk_start_date"
                value={startDate ? formatDateForInput(startDate) : ""}
                onChange={setStartDate}
                placeholder="Select start date"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">End Date (समाप्ति तिथि)</Label>
              <DatePicker
                id="bulk_end_date"
                value={endDate ? formatDateForInput(endDate) : ""}
                onChange={setEndDate}
                placeholder="Select end date"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">User ID / Form No (उपयोगकर्ता आईडी)</Label>
              <Input
                type="text"
                placeholder="Enter User / Form No"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0B4A8F] hover:bg-[#072E5C] text-white flex items-center justify-center gap-2"
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span>Fetch Records</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Batch Summary Bar */}
      {selectedCount > 0 && (
        <Card className="bg-primary/5 border-primary/20 shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-xs text-muted-foreground block">Selected Records (चयनित रिकॉर्ड)</span>
                <span className="text-lg font-bold text-foreground">{selectedCount}</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <span className="text-xs text-muted-foreground block">Total Batch Amount (कुल राशि)</span>
                <AmountDisplay amount={totalBatchAmount} size="xl" className="text-primary font-bold" />
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onBatchSubmit("Cash")}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none flex items-center gap-2"
              >
                <Banknote className="h-4 w-4 text-emerald-600" />
                <span>Pay via Cash</span>
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={() => onBatchSubmit("Online")}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none bg-[#F57C00] hover:bg-[#E65100] text-white flex items-center gap-2 shadow-sm"
              >
                <CreditCard className="h-4 w-4" />
                <span>Pay Online (Razorpay)</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Table Slot */}
      <div className="bg-card rounded-lg border shadow-sm">{children}</div>
    </div>
  );
};
