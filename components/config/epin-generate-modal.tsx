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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchemeTypes, usePools } from "@/hooks/use-app-config";
import { EpinService } from "@/lib/epin-service";
import { toast } from "sonner";
import { KeyRound, Loader2, Sparkles, CheckCircle2, Copy } from "lucide-react";

interface EpinGenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EpinGenerateModal: React.FC<EpinGenerateModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { schemeTypes } = useSchemeTypes();
  const { pools } = usePools();

  const [count, setCount] = useState<string>("10");
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>(
    schemeTypes[0]?.id || "st-300"
  );
  const [selectedPoolId, setSelectedPoolId] = useState<string>("ALL");
  const [remarks, setRemarks] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    batchNumber?: string;
    count: number;
    pins: string[];
  } | null>(null);

  const selectedScheme = schemeTypes.find(
    (s) => s.id === selectedSchemeId || String(s.amount) === selectedSchemeId
  ) || schemeTypes[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const countNum = parseInt(count, 10);
    if (isNaN(countNum) || countNum < 1 || countNum > 500) {
      toast.error("कृपया 1 से 500 के बीच संख्या दर्ज करें / Enter count between 1 and 500");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await EpinService.generateBatch({
        count: countNum,
        schemeAmount: selectedScheme?.amount || 300,
        schemeTypeId: selectedScheme?.id,
        poolId: selectedPoolId === "ALL" ? undefined : selectedPoolId,
        remarks,
      });

      if (response.success) {
        toast.success(
          response.message || `Successfully generated ${countNum} E-PIN vouchers`
        );
        onSuccess();
        if (response.pins && response.pins.length > 0) {
          setGeneratedResult({
            batchNumber: response.batchNumber,
            count: response.generatedCount || countNum,
            pins: response.pins,
          });
        } else {
          onOpenChange(false);
        }
      } else {
        toast.error(response.message || "Failed to generate E-PINs from backend");
      }
    } catch {
      toast.error("E-PIN service unavailable / सेवा अनुपलब्ध है");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setGeneratedResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        {generatedResult ? (
          <div className="space-y-4 py-2">
            <DialogHeader>
              <div className="flex items-center gap-2 text-emerald-600">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <DialogTitle className="text-xl">E-PIN Batch Generated</DialogTitle>
              </div>
              <DialogDescription>
                Backend created {generatedResult.count} new vouchers in central inventory.
                {generatedResult.batchNumber && (
                  <span className="block font-mono text-foreground font-semibold mt-1">
                    Batch: {generatedResult.batchNumber}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Generated PIN Codes:</Label>
              <div className="max-h-48 overflow-y-auto bg-muted/40 p-3 rounded-lg border font-mono text-xs space-y-1">
                {generatedResult.pins.map((pin, i) => (
                  <div key={i} className="flex justify-between items-center py-0.5">
                    <span>{pin}</span>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(generatedResult.pins.join("\n"));
                  toast.success("PINs copied to clipboard");
                }}
                className="flex items-center gap-1 text-xs"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy All PINs
              </Button>
              <Button
                onClick={handleClose}
                className="bg-[#0B4A8F] hover:bg-[#072E5C] text-white text-xs"
              >
                Done / पूरा हुआ
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <div className="flex items-center gap-2 text-primary">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <KeyRound className="h-5 w-5 text-[#0B4A8F]" />
                </div>
                <DialogTitle className="text-xl">Generate E-PIN Batch</DialogTitle>
              </div>
              <DialogDescription>
                Create authenticated new E-PIN vouchers in central foundation inventory.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="count">Number of E-PINs / संख्या *</Label>
                <Select value={count} onValueChange={setCount}>
                  <SelectTrigger id="count">
                    <SelectValue placeholder="Select quantity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Vouchers</SelectItem>
                    <SelectItem value="10">10 Vouchers</SelectItem>
                    <SelectItem value="25">25 Vouchers</SelectItem>
                    <SelectItem value="50">50 Vouchers</SelectItem>
                    <SelectItem value="100">100 Vouchers</SelectItem>
                    <SelectItem value="250">250 Vouchers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheme">Scheme Multiplier / योजना राशि *</Label>
                <Select
                  value={selectedSchemeId}
                  onValueChange={setSelectedSchemeId}
                >
                  <SelectTrigger id="scheme">
                    <SelectValue placeholder="Select Scheme" />
                  </SelectTrigger>
                  <SelectContent>
                    {schemeTypes.map((scheme) => (
                      <SelectItem key={scheme.id} value={scheme.id}>
                        {scheme.name} (₹{scheme.amount.toLocaleString("hi-IN")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pool">Target Pool / संबंधित पूल</Label>
                <Select value={selectedPoolId} onValueChange={setSelectedPoolId}>
                  <SelectTrigger id="pool">
                    <SelectValue placeholder="All Pools" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Pools / सभी पूल</SelectItem>
                    {pools.map((pool) => (
                      <SelectItem key={pool.id} value={pool.id}>
                        {pool.name} ({pool.nameHi})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks / टिप्पणी (Optional)</Label>
                <Input
                  id="remarks"
                  placeholder="e.g. Batch for Jodhpur zone field distribution"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel / रद्द करें
              </Button>
              <Button
                type="submit"
                className="bg-[#0B4A8F] hover:bg-[#072E5C] text-white flex items-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Batch
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
