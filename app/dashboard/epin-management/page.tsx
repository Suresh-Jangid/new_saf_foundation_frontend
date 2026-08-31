"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EpinRecord, EpinState, EpinSummaryCounts } from "@/lib/config-types";
import { EpinService } from "@/lib/epin-service";
import { EpinBadge } from "@/components/config/epin-badge";
import { EpinGenerateModal } from "@/components/config/epin-generate-modal";
import { EpinAssignModal } from "@/components/config/epin-assign-modal";
import { EpinBurnDialog } from "@/components/config/epin-burn-dialog";
import { EpinAuditModal } from "@/components/config/epin-audit-modal";
import { EpinInputVerifier } from "@/components/forms/epin-input-verifier";
import { isAdmin, isAgent, getAgentData } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  KeyRound,
  Sparkles,
  UserCheck,
  Ban,
  History,
  Search,
  RefreshCw,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

export default function EpinManagementPage() {
  const adminMode = isAdmin();
  const agentData = getAgentData();

  const [epins, setEpins] = useState<EpinRecord[]>([]);
  const [summary, setSummary] = useState<EpinSummaryCounts>({
    total: 0,
    active: 0,
    assigned: 0,
    used: 0,
    burnt: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEpinIds, setSelectedEpinIds] = useState<string[]>([]);

  // Modals
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [burnDialogOpen, setBurnDialogOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [quickVerifyOpen, setQuickVerifyOpen] = useState(false);
  const [quickVerifyPin, setQuickVerifyPin] = useState("");

  // Targeted record for actions
  const [targetEpin, setTargetEpin] = useState<EpinRecord | null>(null);

  // Fetch Inventory from Backend
  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const filterAgentId = !adminMode && agentData?.id ? String(agentData.id) : undefined;
      const response = await EpinService.getInventory({
        status: activeTab === "ALL" ? undefined : (activeTab as EpinState),
        search: searchQuery.trim() || undefined,
        agentId: filterAgentId,
      });

      if (response.success) {
        setEpins(response.data);
        setSummary(response.summary);
      } else {
        setEpins([]);
        setErrorMessage(
          response.message || "E-PIN service unavailable / रिकॉर्ड लोड नहीं हो सके"
        );
      }
    } catch {
      setEpins([]);
      setErrorMessage("Connection error to E-PIN service. Please retry.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery, adminMode, agentData?.id]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Selected E-PIN objects
  const selectedEpins = useMemo(() => {
    return epins.filter((ep) => selectedEpinIds.includes(ep.id));
  }, [epins, selectedEpinIds]);

  // Handle batch selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select ACTIVE E-PINs if admin wants to assign
      const eligible = epins.filter((ep) => ep.status === "ACTIVE").map((ep) => ep.id);
      setSelectedEpinIds(eligible.length > 0 ? eligible : epins.map((ep) => ep.id));
    } else {
      setSelectedEpinIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedEpinIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <RoleGuard requiredModule="epin_management">
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-xl text-[#ff5c00]">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                E-PIN Management / ई-पिन प्रबंधन
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-10">
              {adminMode
                ? "Central foundation inventory, batch voucher generation, field agent allocation & lifecycle auditing."
                : "View and manage E-PIN vouchers assigned to your field account."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInventory}
              disabled={isLoading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuickVerifyPin("");
                setQuickVerifyOpen(true);
              }}
              className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Verify E-PIN</span>
            </Button>

            {adminMode && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (selectedEpins.length === 0) {
                      toast.error("कृपया आवंटित करने हेतु ई-पिन चुनें / Select E-PINs to assign");
                      return;
                    }
                    setAssignModalOpen(true);
                  }}
                  disabled={selectedEpins.length === 0}
                  className="flex items-center gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Assign Selected ({selectedEpins.length})</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setGenerateModalOpen(true)}
                  className="bg-[#ff5c00] hover:bg-[#e05200] text-white flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Batch</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Metrics Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="border-l-4 border-l-primary/80 shadow-xs">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardDescription className="text-xs font-medium">Total E-PINs</CardDescription>
              <CardTitle className="text-xl sm:text-2xl font-bold">{summary.total}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 shadow-xs">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardDescription className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                ACTIVE (सक्रिय)
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {summary.active}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-xs">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardDescription className="text-xs font-medium text-blue-700 dark:text-blue-400">
                ASSIGNED (आवंटित)
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {summary.assigned}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-slate-400 shadow-xs">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardDescription className="text-xs font-medium text-slate-700 dark:text-slate-400">
                USED (प्रयुक्त)
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl font-bold text-slate-600 dark:text-slate-400">
                {summary.used}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-rose-500 shadow-xs col-span-2 sm:col-span-1">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardDescription className="text-xs font-medium text-rose-700 dark:text-rose-400">
                BURNT (रद्द)
              </CardDescription>
              <CardTitle className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
                {summary.burnt}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Backend Error / Service Unavailable State */}
        {errorMessage && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start justify-between gap-3 text-amber-800 dark:text-amber-300 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <span className="font-semibold">Backend Service Notice:</span> {errorMessage}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchInventory}
              className="border-amber-300 hover:bg-amber-100 text-xs shrink-0"
            >
              Retry / पुनः प्रयास
            </Button>
          </div>
        )}

        {/* Main Content Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Status Filter Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                <TabsList className="grid grid-cols-5 w-full md:w-auto">
                  <TabsTrigger value="ALL" className="text-xs">
                    ALL ({summary.total})
                  </TabsTrigger>
                  <TabsTrigger value="ACTIVE" className="text-xs">
                    Active ({summary.active})
                  </TabsTrigger>
                  <TabsTrigger value="ASSIGNED" className="text-xs">
                    Assigned ({summary.assigned})
                  </TabsTrigger>
                  <TabsTrigger value="USED" className="text-xs">
                    Used ({summary.used})
                  </TabsTrigger>
                  <TabsTrigger value="BURNT" className="text-xs">
                    Burnt ({summary.burnt})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search E-PIN, Agent, Batch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {adminMode && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            epins.length > 0 &&
                            selectedEpinIds.length === epins.filter((e) => e.status === "ACTIVE").length
                          }
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                    )}
                    <TableHead className="font-semibold text-xs">E-PIN Voucher</TableHead>
                    <TableHead className="font-semibold text-xs">Scheme Amount</TableHead>
                    <TableHead className="font-semibold text-xs">Pool</TableHead>
                    <TableHead className="font-semibold text-xs">Status</TableHead>
                    <TableHead className="font-semibold text-xs">Assigned Agent</TableHead>
                    <TableHead className="font-semibold text-xs">Beneficiary / Application</TableHead>
                    <TableHead className="font-semibold text-xs">Created Date</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={adminMode ? 9 : 8}
                        className="h-48 text-center text-muted-foreground text-xs"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                          <span>Loading E-PIN inventory from backend...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : epins.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={adminMode ? 9 : 8}
                        className="h-48 text-center text-muted-foreground text-xs"
                      >
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                          <KeyRound className="h-8 w-8 text-muted-foreground/50" />
                          <span className="font-semibold">No E-PIN vouchers found</span>
                          <span className="text-[11px] text-muted-foreground">
                            {adminMode
                              ? "Click 'Generate Batch' to create authenticated vouchers in central foundation inventory."
                              : "No E-PIN vouchers are currently assigned to your account."}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    epins.map((record) => {
                      const isSelected = selectedEpinIds.includes(record.id);

                      return (
                        <TableRow
                          key={record.id}
                          className={isSelected ? "bg-muted/40" : undefined}
                        >
                          {adminMode && (
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleSelect(record.id)}
                                disabled={record.status !== "ACTIVE"}
                              />
                            </TableCell>
                          )}

                          <TableCell>
                            <div className="font-mono font-semibold text-xs flex items-center gap-1.5">
                              <span>{record.pinNumber}</span>
                              {record.batchNumber && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono font-normal">
                                  {record.batchNumber}
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-xs">
                              ₹{record.schemeAmount.toLocaleString("hi-IN")}
                            </span>
                          </TableCell>

                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {record.poolId || "Default Pool"}
                            </span>
                          </TableCell>

                          <TableCell>
                            <EpinBadge status={record.status} />
                          </TableCell>

                          <TableCell>
                            {record.assignedAgentName ? (
                              <div className="text-xs">
                                <span className="font-medium text-foreground">{record.assignedAgentName}</span>
                                {record.assignedDate && (
                                  <div className="text-[10px] text-muted-foreground">
                                    {formatDate(record.assignedDate)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">Unassigned</span>
                            )}
                          </TableCell>

                          <TableCell>
                            {record.usedByApplicantName || record.applicantName ? (
                              <div className="text-xs">
                                <span className="font-medium text-foreground">
                                  {record.usedByApplicantName || record.applicantName}
                                </span>
                                {(record.applicationId || record.usedByApplicationId) && (
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    App #{record.applicationId || record.usedByApplicationId}
                                  </div>
                                )}
                                {record.usedDate && (
                                  <div className="text-[10px] text-muted-foreground">
                                    {formatDate(record.usedDate)}
                                  </div>
                                )}
                              </div>
                            ) : record.burntReason ? (
                              <span className="text-rose-600 dark:text-rose-400 text-[11px] italic">
                                Reason: {record.burntReason}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(record.createdAt)}
                          </TableCell>

                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs">
                                <DropdownMenuLabel>E-PIN Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() => {
                                    setTargetEpin(record);
                                    setAuditModalOpen(true);
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <History className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>View Audit History</span>
                                </DropdownMenuItem>

                                {adminMode && record.status === "ACTIVE" && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedEpinIds([record.id]);
                                      setAssignModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 text-blue-600"
                                  >
                                    <UserCheck className="h-3.5 w-3.5" />
                                    <span>Assign to Agent</span>
                                  </DropdownMenuItem>
                                )}

                                {adminMode && (record.status === "ACTIVE" || record.status === "ASSIGNED") && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setTargetEpin(record);
                                      setBurnDialogOpen(true);
                                    }}
                                    className="flex items-center gap-2 text-rose-600 focus:text-rose-600"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                    <span>Burn / Invalidate</span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Verifier Dialog */}
      <Dialog open={quickVerifyOpen} onOpenChange={setQuickVerifyOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <DialogTitle className="text-lg">Verify E-PIN Voucher</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Check live validation and assignment status directly with the backend.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <EpinInputVerifier
              value={quickVerifyPin}
              onChange={setQuickVerifyPin}
              agentId={!adminMode && agentData?.id ? String(agentData.id) : undefined}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modals & Dialogs */}
      <EpinGenerateModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        onSuccess={fetchInventory}
      />

      <EpinAssignModal
        open={assignModalOpen}
        onOpenChange={(open) => {
          setAssignModalOpen(open);
          if (!open) setSelectedEpinIds([]);
        }}
        selectedEpins={selectedEpins.length > 0 ? selectedEpins : targetEpin ? [targetEpin] : []}
        onSuccess={() => {
          setSelectedEpinIds([]);
          fetchInventory();
        }}
      />

      <EpinBurnDialog
        open={burnDialogOpen}
        onOpenChange={setBurnDialogOpen}
        epin={targetEpin}
        onSuccess={fetchInventory}
      />

      <EpinAuditModal
        open={auditModalOpen}
        onOpenChange={setAuditModalOpen}
        epinId={targetEpin?.id}
        pinNumber={targetEpin?.pinNumber}
      />
    </RoleGuard>
  );
}
