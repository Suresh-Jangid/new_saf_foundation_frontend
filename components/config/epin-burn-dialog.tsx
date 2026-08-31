"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { EpinRecord } from "@/lib/config-types";
import { EpinService } from "@/lib/epin-service";
import { toast } from "sonner";
import { Ban, AlertTriangle, Loader2 } from "lucide-react";

interface EpinBurnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epin: EpinRecord | null;
  onSuccess: () => void;
}

export const EpinBurnDialog: React.FC<EpinBurnDialogProps> = ({
  open,
  onOpenChange,
  epin,
  onSuccess,
}) => {
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!epin) return null;

  const handleBurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("कृपया रद्द करने का कारण दर्ज करें / Please enter cancellation reason");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await EpinService.burnEpin({
        epinId: epin.id,
        pinNumber: epin.pinNumber,
        reason: reason.trim(),
      });

      if (response.success) {
        toast.success(response.message || "E-PIN permanently burnt / ई-पिन रद्द कर दिया गया");
        setReason("");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(response.message || "Failed to burn E-PIN from backend");
      }
    } catch {
      toast.error("E-PIN invalidation service unavailable / सेवा अनुपलब्ध है");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] border-destructive/30">
        <form onSubmit={handleBurn}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Ban className="h-5 w-5 text-rose-600" />
              </div>
              <DialogTitle className="text-xl">Burn / Invalidate E-PIN</DialogTitle>
            </div>
            <DialogDescription>
              Permanently cancel this E-PIN voucher. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Burning an E-PIN is irreversible</span>
              </div>
              <div className="text-muted-foreground space-y-0.5">
                <div>
                  <strong className="text-foreground">E-PIN:</strong>{" "}
                  <span className="font-mono">{epin.pinNumber}</span>
                </div>
                <div>
                  <strong className="text-foreground">Scheme Amount:</strong> ₹
                  {epin.schemeAmount.toLocaleString("hi-IN")}
                </div>
                <div>
                  <strong className="text-foreground">Current Status:</strong>{" "}
                  {epin.status}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="burnReason">
                Reason for Invalidation / कारण *
              </Label>
              <Input
                id="burnReason"
                placeholder="e.g. Lost voucher, duplicate printed, cancelled by admin"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel / वापस जाएं
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2"
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Burning...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4" />
                  Confirm Burn E-PIN
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
