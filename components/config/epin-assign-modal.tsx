"use client";

import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EpinRecord } from "@/lib/config-types";
import { EpinService } from "@/lib/epin-service";
import { post, API_ENDPOINTS } from "@/lib/api";
import { toast } from "sonner";
import { UserCheck, Loader2 } from "lucide-react";

interface EpinAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEpins: EpinRecord[];
  onSuccess: () => void;
}

interface AgentOption {
  id: string;
  name: string;
  employee_id?: string;
  mobile?: string;
}

export const EpinAssignModal: React.FC<EpinAssignModalProps> = ({
  open,
  onOpenChange,
  selectedEpins,
  onSuccess,
}) => {
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchAgents = async () => {
        try {
          setLoadingAgents(true);
          const response = await post(API_ENDPOINTS.GET_AGENTS, {});
          if (response?.data?.status && Array.isArray(response.data.data)) {
            setAgents(
              response.data.data.map((a: any) => ({
                id: String(a.id),
                name: a.name || a.agent_name,
                employee_id: a.employee_id || a.employeeId,
                mobile: a.mobile,
              }))
            );
          }
        } catch {
          toast.error("Failed to load agents list / एजेंट लोड नहीं हो सके");
        } finally {
          setLoadingAgents(false);
        }
      };
      fetchAgents();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) {
      toast.error("कृपया एजेंट चुनें / Please select an agent");
      return;
    }
    if (selectedEpins.length === 0) {
      toast.error("कोई ई-पिन चयनित नहीं है / No E-PIN selected");
      return;
    }

    const selectedAgent = agents.find((a) => a.id === selectedAgentId);

    setIsSubmitting(true);
    try {
      const response = await EpinService.assignToAgent({
        epinIds: selectedEpins.map((e) => e.id),
        agentId: selectedAgentId,
        agentName: selectedAgent?.name,
        remarks,
      });

      if (response.success) {
        toast.success(
          response.message || `Successfully assigned ${selectedEpins.length} E-PIN(s)`
        );
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(response.message || "Failed to assign E-PINs from backend");
      }
    } catch {
      toast.error("E-PIN assignment service unavailable / सेवा अनुपलब्ध है");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <UserCheck className="h-5 w-5 text-blue-600" />
              </div>
              <DialogTitle className="text-xl">Assign E-PIN to Field Agent</DialogTitle>
            </div>
            <DialogDescription>
              Allocate {selectedEpins.length} selected E-PIN voucher(s) to an authorized field agent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/40 rounded-lg border text-xs space-y-1">
              <div className="font-semibold text-foreground">Selected Vouchers ({selectedEpins.length}):</div>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pt-1 font-mono text-[11px]">
                {selectedEpins.map((ep) => (
                  <span
                    key={ep.id}
                    className="bg-background px-2 py-0.5 rounded border text-muted-foreground"
                  >
                    {ep.pinNumber} (₹{ep.schemeAmount})
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent">Select Field Agent / एजेंट चुनें *</Label>
              <Select
                value={selectedAgentId}
                onValueChange={setSelectedAgentId}
                disabled={loadingAgents || agents.length === 0}
              >
                <SelectTrigger id="agent">
                  <SelectValue
                    placeholder={
                      loadingAgents ? "Loading agents..." : "Select an agent"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}{" "}
                      {agent.employee_id ? `(${agent.employee_id})` : ""}{" "}
                      {agent.mobile ? `- ${agent.mobile}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignRemarks">Remarks / टिप्पणी (Optional)</Label>
              <Input
                id="assignRemarks"
                placeholder="e.g. Allocation for field camp"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
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
              Cancel / रद्द करें
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              disabled={isSubmitting || !selectedAgentId || selectedEpins.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  Confirm Assignment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
