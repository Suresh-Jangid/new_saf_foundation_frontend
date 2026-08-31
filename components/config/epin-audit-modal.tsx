"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EpinAuditItem } from "@/lib/config-types";
import { EpinService } from "@/lib/epin-service";
import { EpinBadge } from "@/components/config/epin-badge";
import { formatDate } from "@/lib/utils";
import { History, Loader2, RefreshCw } from "lucide-react";

interface EpinAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epinId?: string;
  pinNumber?: string;
}

export const EpinAuditModal: React.FC<EpinAuditModalProps> = ({
  open,
  onOpenChange,
  epinId,
  pinNumber,
}) => {
  const [auditItems, setAuditItems] = useState<EpinAuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAudit = async () => {
    setIsLoading(true);
    try {
      const response = await EpinService.getAuditHistory(epinId);
      if (response.success) {
        setAuditItems(response.data);
      } else {
        setAuditItems([]);
      }
    } catch {
      setAuditItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAudit();
    }
  }, [open, epinId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-[#0B4A8F]">
              <History className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                E-PIN Audit History {pinNumber ? `— ${pinNumber}` : ""}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Authoritative chronological record of state transitions and lifecycle actions.
              </DialogDescription>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchAudit}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs">Loading audit trail...</span>
            </div>
          ) : auditItems.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg text-xs text-muted-foreground">
              No audit logs recorded for this E-PIN / कोई ऑडिट रिकॉर्ड उपलब्ध नहीं है
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
              {auditItems.map((item) => (
                <div key={item.id} className="relative space-y-1 text-xs">
                  <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                  <div className="flex items-center justify-between font-medium">
                    <span className="font-semibold text-foreground">
                      {item.action}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    {item.previousState && (
                      <>
                        <EpinBadge status={item.previousState} showIcon={false} className="py-0 text-[10px]" />
                        <span className="text-muted-foreground">→</span>
                      </>
                    )}
                    <EpinBadge status={item.newState} showIcon={false} className="py-0 text-[10px]" />
                  </div>
                  {item.actorName && (
                    <div className="text-muted-foreground text-[11px]">
                      By: <span className="text-foreground font-medium">{item.actorName}</span>{" "}
                      {item.actorRole ? `(${item.actorRole})` : ""}
                    </div>
                  )}
                  {item.remarks && (
                    <div className="p-2 bg-muted/30 rounded border text-[11px] text-muted-foreground mt-1">
                      {item.remarks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
