"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { API_ENDPOINTS, mayraApplicationAPI, post } from "@/lib/api";
import { formatDate, getCurrentUserInfo } from "@/lib/utils";
import { Plus, Trash2, Loader2, IndianRupee, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PaginatedTableSection } from "@/components/paginated-table-section";

interface Installment {
  id: string;
  mayra_id: string;
  amount: string;
  date: string;
  note: string;
  created_at: string;
  addedby: string;
  addedby_id: string;
}

interface MayraApplication {
  id: string;
  formNumber: string;
  applicantName: string;
  fatherName: string;
  gotra: string;
  address: string;
  gender: string;
  totalAmount: string | number;
  paymentAmount: string | number;
  pendingAmount: string | number;
  applicationDate: string;
}

export default function MayraGeneralApplicationPaymentPage() {
  const { userId } = useParams();
  const router = useRouter();
  const mayraId = String(userId);

  const [application, setApplication] = useState<MayraApplication | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    amount: "",
    date: formatDate(new Date()),
    note: "",
  });

  const [dateObj, setDateObj] = useState<Date | undefined>(new Date());
  const [dateOpen, setDateOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [appRes, instRes] = await Promise.all([
        mayraApplicationAPI.getAll({ id: mayraId }),
        post(API_ENDPOINTS.GET_MAYRA_INSTALLMENTS, { mayra_id: mayraId }),
      ]);

      if (appRes.status && appRes.data) {
        const record = Array.isArray(appRes.data) ? appRes.data[0] : appRes.data;
        setApplication(record || null);
      }

      if (instRes.data.status && instRes.data.data) {
        setInstallments(
          Array.isArray(instRes.data.data) ? instRes.data.data : [instRes.data.data]
        );
      } else {
        setInstallments([]);
      }
    } catch (error) {
      console.error("Error fetching mayra payment data:", error);
      toast.error("Failed to load payment details");
    } finally {
      setLoading(false);
    }
  }, [mayraId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setAdding(true);
    try {
      const { addedby, addedby_id } = getCurrentUserInfo();
      const response = await post(API_ENDPOINTS.CREATE_MAYRA_INSTALLMENT, {
        mayra_id: mayraId,
        amount: formData.amount,
        date: formData.date,
        note: formData.note,
        addedby,
        addedby_id,
      });
      if (response.data.status) {
        toast.success("Installment added successfully");
        setIsDialogOpen(false);
        setFormData({ amount: "", date: formatDate(new Date()), note: "" });
        setDateObj(new Date());
        fetchData();
      } else {
        toast.error(response.data.message || "Failed to add installment");
      }
    } catch (error) {
      console.error("Error adding installment:", error);
      toast.error("An error occurred");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (installmentId: string) => {
    if (!confirm("Delete this installment?")) return;
    try {
      const response = await post(API_ENDPOINTS.DELETE_MAYRA_INSTALLMENT, {
        mayra_id: mayraId,
        id: installmentId,
      });
      if (response.data.status) {
        toast.success("Installment deleted");
        fetchData();
      } else {
        toast.error(response.data.message || "Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting installment:", error);
      toast.error("Failed to delete");
    }
  };

  const totalPaid = installments.reduce((sum, inst) => sum + Number(inst.amount || 0), 0);

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/payment-management")}
            className="mb-2"
          >
            ← Back
          </Button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Mayra General Application Payment
          </h1>
          {application && (
            <p className="text-sm text-gray-600 mt-1">
              {application.formNumber} — {application.applicantName}
            </p>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Add Installment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Installment Details</DialogTitle>
              <DialogDescription>Enter installment payment details.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Date *</Label>
                  <div className="relative">
                    <Input value={formData.date} readOnly placeholder="dd-mm-yyyy" />
                    <Popover open={dateOpen} onOpenChange={setDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" className="absolute right-0 top-0 h-full px-2" type="button">
                          <CalendarDays className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateObj}
                          onSelect={(d) => {
                            setDateObj(d);
                            setFormData((p) => ({ ...p, date: formatDate(d as Date) }));
                            setDateOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Note</Label>
                <Input
                  value={formData.note}
                  onChange={(e) => setFormData((p) => ({ ...p, note: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={adding}>
                  {adding ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {application && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Application Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Applicant</p>
              <p className="font-medium">{application.applicantName}</p>
            </div>
            <div>
              <p className="text-gray-500">Father Name</p>
              <p className="font-medium">{application.fatherName}</p>
            </div>
            <div>
              <p className="text-gray-500">Total Fee</p>
              <p className="font-medium">₹{application.totalAmount || 0}</p>
            </div>
            <div>
              <p className="text-gray-500">Pending</p>
              <p className="font-medium text-red-600">₹{application.pendingAmount || 0}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="border-orange-100 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-full">
                <IndianRupee className="text-orange-600 w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Paid (Installments)</p>
                <h3 className="text-2xl font-bold text-orange-700">₹{totalPaid.toLocaleString()}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <IndianRupee className="text-blue-600 w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Installments</p>
                <h3 className="text-2xl font-bold text-blue-700">{installments.length}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <PaginatedTableSection
            data={installments}
            loading={loading}
            loadingMessage="Loading installments..."
            emptyMessage="No installments found."
          >
            {(paginatedInstallments) => (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInstallments.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell>{formatDate(inst.date)}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        ₹{Number(inst.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>{inst.note || "-"}</TableCell>
                      <TableCell>{inst.addedby || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(inst.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </PaginatedTableSection>
        </CardContent>
      </Card>
    </div>
  );
}
