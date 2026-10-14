"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileEdit,
  Trash2,
  RotateCcw,
  Search,
  Filter,
  PlusCircle,
  Clock,
  Layers,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RoleGuard } from "@/components/role-guard";
import { DraftService, RegistrationDraft } from "@/lib/draft-service";
import { toast } from "sonner";

const MODULE_ROUTE_MAP: Record<string, { route: string; label: string }> = {
  "general-applications": {
    route: "/dashboard/general-applications/add",
    label: "सामान्य विवाह (General Marriage)",
  },
  "mayra-registration": {
    route: "/dashboard/mayra-registration/add",
    label: "मायरा आवेदन (Mayra Registration)",
  },
  "insurance": {
    route: "/dashboard/general-applications-insurance/add",
    label: "सुरक्षा बीमा (Insurance)",
  },
  "janni-delivery": {
    route: "/dashboard/janni-delivery/add",
    label: "जननी प्रसूति (Janni Delivery)",
  },
  "aawas": {
    route: "/dashboard/aawas/add",
    label: "आवास योजना (Aawas Yojana)",
  },
  "lado-bahin": {
    route: "/dashboard/lado-bahin/add",
    label: "लाडो बहिन योजना (Lado Bahin)",
  },
  "dhundhotsav": {
    route: "/dashboard/dhundhotsav/add",
    label: "ढूंढोत्सव (Dhundhotsav)",
  },
  "shubh-laxmi": {
    route: "/dashboard/shubh-laxmi/add",
    label: "शुभ लक्ष्मी / दीपावली (ShubhLaxmi)",
  },
  "sewing-machine": {
    route: "/dashboard/sewing-machine/add",
    label: "सिलाई मशीन वितरण (Sewing Machine)",
  },
  "disability-cycle": {
    route: "/dashboard/disability-cycle/add",
    label: "दिव्यांग साइकिल (Disability Cycle)",
  },
  "marriage-sewing-machine": {
    route: "/dashboard/marriage-congratulations/sewing-machine-distribution/add",
    label: "विवाह सिलाई मशीन (Marriage Sewing)",
  },
  "marriage-mayra": {
    route: "/dashboard/marriage-congratulations/mayra-registration/add",
    label: "विवाह मायरा (Marriage Mayra)",
  },
  "pension-yojana": {
    route: "/dashboard/pension-yojana/add",
    label: "पेंशन योजना (Pension Yojana)",
  },
  "loan-application": {
    route: "/dashboard/loan-application/add",
    label: "ऋण आवेदन (Loan Application)",
  },
  "financal-help": {
    route: "/dashboard/financal-help/add",
    label: "आर्थिक सहायता (Financial Help)",
  },
  "marriage-congratulations": {
    route: "/dashboard/marriage-congratulations/add",
    label: "विवाह बधाई पत्र (Marriage Congratulation)",
  },
  "mayra-congratulations": {
    route: "/dashboard/mayra-congratulations/add",
    label: "मायरा बधाई पत्र (Mayra Congratulation)",
  },
  "suraksha-bima-yojana": {
    route: "/dashboard/suraksha-bima-yojana/add",
    label: "सुरक्षा बीमा प्रमाणपत्र (Suraksha Bima)",
  },
};

export default function DraftsManagementPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<RegistrationDraft[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [draftToDelete, setDraftToDelete] = useState<RegistrationDraft | null>(null);

  const loadDrafts = () => {
    const list = DraftService.getAllDrafts();
    setDrafts(list);
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const filteredDrafts = useMemo(() => {
    return drafts.filter((d) => {
      const matchModule = selectedModule === "ALL" || d.moduleKey === selectedModule;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        d.applicantName.toLowerCase().includes(q) ||
        (d.mobile && d.mobile.includes(q)) ||
        d.moduleTitle.toLowerCase().includes(q);
      return matchModule && matchQuery;
    });
  }, [drafts, selectedModule, searchQuery]);

  const uniqueModules = useMemo(() => {
    const set = new Set<string>();
    drafts.forEach((d) => set.add(d.moduleKey));
    return Array.from(set);
  }, [drafts]);

  const handleResume = (draft: RegistrationDraft) => {
    const target = MODULE_ROUTE_MAP[draft.moduleKey];
    const basePath = target ? target.route : `/dashboard/${draft.moduleKey}/add`;
    router.push(`${basePath}?draftId=${encodeURIComponent(draft.id)}`);
  };

  const confirmDelete = () => {
    if (!draftToDelete) return;
    DraftService.deleteDraft(draftToDelete.id);
    toast.success("ड्राफ्ट सफलतापूर्वक हटा दिया गया / Draft Deleted");
    setDraftToDelete(null);
    loadDrafts();
  };

  return (
    <RoleGuard requiredModule="applicant_registration">
      <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileEdit className="h-7 w-7 text-[#0B4A8F]" />
              ड्राफ्ट पंजीकरण प्रबंधन / Draft Registrations
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              अधूरे या सहेजे गए आवेदनों की सूची। यहाँ से आप ड्राफ्ट जारी रख सकते हैं या हटा सकते हैं।
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDrafts}
              className="text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              रिफ्रेश / Refresh
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">कुल सहेजे गए ड्राफ्ट / Total Drafts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{drafts.length}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#0B4A8F]">
                <FileText className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">सक्रिय योजनाएं / Active Modules</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{uniqueModules.length}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                <Layers className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">नवीनतम ड्राफ्ट / Latest Saved</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {drafts.length > 0
                    ? new Date(drafts[0].updatedAt).toLocaleTimeString("hi-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "कोई नहीं / None"}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter Bar */}
        <Card className="border shadow-xs">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="आवेदक का नाम या मोबाइल खोजें..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="h-9 w-full sm:w-64 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="ALL">सभी योजनाएं / All Modules ({drafts.length})</option>
                  {uniqueModules.map((modKey) => {
                    const info = MODULE_ROUTE_MAP[modKey];
                    const count = drafts.filter((d) => d.moduleKey === modKey).length;
                    return (
                      <option key={modKey} value={modKey}>
                        {info ? info.label : modKey} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Drafts List Table */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>सहेजे गए ड्राफ्ट सूची ({filteredDrafts.length})</span>
            </CardTitle>
            <CardDescription className="text-xs">
              यहाँ सहेजे गए ड्राफ्ट केवल आपके वर्तमान लॉगिन खाते में सुरक्षित हैं और अंतिम सबमिट होने तक कोई ई-पिन या भुगतान नहीं काटते।
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredDrafts.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <FileEdit className="h-10 w-10 text-muted-foreground mx-auto stroke-1" />
                <div className="space-y-1">
                  <p className="text-base font-medium text-gray-800 dark:text-gray-200">
                    कोई ड्राफ्ट नहीं मिला / No Drafts Found
                  </p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    {searchQuery || selectedModule !== "ALL"
                      ? "आपके खोज मापदंड से मेल खाता कोई ड्राफ्ट नहीं मिला। फ़िल्टर बदलें।"
                      : "जब आप किसी भी पंजीकरण फॉर्म में 'ड्राफ्ट सहेजें' बटन पर क्लिक करते हैं, तो वह अधूरा फॉर्म यहाँ दिखाई देगा।"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b text-xs text-muted-foreground uppercase font-medium">
                    <tr>
                      <th className="py-3 px-4">योजना / Module</th>
                      <th className="py-3 px-4">आवेदक विवरण / Applicant</th>
                      <th className="py-3 px-4">अंतिम सहेजा गया / Last Saved</th>
                      <th className="py-3 px-4">स्थिति / Status</th>
                      <th className="py-3 px-4 text-right">कार्य / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredDrafts.map((draft) => {
                      const modInfo = MODULE_ROUTE_MAP[draft.moduleKey];
                      const formattedTime = new Date(draft.updatedAt).toLocaleDateString("hi-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr key={draft.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-gray-900 dark:text-gray-100 block">
                              {modInfo ? modInfo.label : draft.moduleTitle}
                            </span>
                            <span className="text-[11px] font-mono text-muted-foreground">ID: {draft.id.slice(0, 18)}...</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                              {draft.applicantName || "अनाम आवेदक"}
                            </span>
                            {draft.mobile && (
                              <span className="text-xs text-muted-foreground font-mono">📱 {draft.mobile}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-muted-foreground">
                            {formattedTime}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800 text-[11px]">
                              ड्राफ्ट / DRAFT
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                            <Button
                              size="sm"
                              onClick={() => handleResume(draft)}
                              className="bg-[#0B4A8F] hover:bg-[#0D5EB3] text-white text-xs h-8 shadow-xs"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              जारी रखें / Resume
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDraftToDelete(draft)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-900 dark:hover:bg-red-950 text-xs h-8"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              हटाएं
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog open={Boolean(draftToDelete)} onOpenChange={(open) => !open && setDraftToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                ड्राफ्ट हटाने की पुष्टि करें / Confirm Discard Draft
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 pt-2">
                <p>
                  क्या आप सुनिश्चित हैं कि आप <strong>{draftToDelete?.applicantName || "इस"}</strong> के ड्राफ्ट को हटाना चाहते हैं?
                </p>
                <p className="text-xs text-muted-foreground">
                  यह कार्रवाई वापस नहीं ली जा सकती। दर्ज किया गया डेटा स्थायी रूप से हटा दिया जाएगा।
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDraftToDelete(null)}>रद्द करें / Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                हाँ, ड्राफ्ट हटाएं / Yes, Discard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleGuard>
  );
}
