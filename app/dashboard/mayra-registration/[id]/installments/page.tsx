"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { API_ENDPOINTS, post } from "@/lib/api";
import { formatDate, parseDateFromDDMMYYYY } from "@/lib/utils";
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
import { getCurrentUserInfo } from "@/lib/utils";
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

export default function MayraInstallmentsPage() {
  const { id } = useParams();
  const router = useRouter();
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

  const fetchInstallments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await post(API_ENDPOINTS.GET_MAYRA_INSTALLMENTS, { mayra_id: id });
      if (response.data.status && response.data.data) {
        setInstallments(Array.isArray(response.data.data) ? response.data.data : [response.data.data]);
      } else {
        setInstallments([]);
      }
    } catch (error) {
      console.error("Error fetching installments:", error);
      toast.error("Failed to load installments");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInstallments();
  }, [fetchInstallments]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error("कृपया वैध राशि दर्ज करें");
      return;
    }
    setAdding(true);
    try {
      const { addedby, addedby_id } = getCurrentUserInfo();
      const response = await post(API_ENDPOINTS.CREATE_MAYRA_INSTALLMENT, {
        mayra_id: id,
        amount: formData.amount,
        date: formData.date,
        note: formData.note,
        addedby,
        addedby_id,
      });
      if (response.data.status) {
        toast.success("किस्त सफलतापूर्वक जोड़ी गई");
        setIsDialogOpen(false);
        fetchInstallments();
        setFormData({ amount: "", date: formatDate(new Date()), note: "" });
        setDateObj(new Date());
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
    if (!confirm("क्या आप इस किस्त को हटाना चाहते हैं?")) return;
    try {
      const response = await post(API_ENDPOINTS.DELETE_MAYRA_INSTALLMENT, { mayra_id: id, id: installmentId });
      if (response.data.status) {
        toast.success("किस्त हटाई गई");
        fetchInstallments();
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
    <div className="min-h-screen bg-white">
      <div className="w-full">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Button variant="link" onClick={() => router.back()} className="p-0 h-auto">
                ← वापस जाएं / Go Back
              </Button>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-2">
                किस्त प्रबंधन (Installment Management)
              </h1>
              <p className="text-sm text-gray-600 mt-1">Mayra Application ID: {id}</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> नई किस्त जोड़ें
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>किस्त विवरण (Installment Details)</DialogTitle>
                  <DialogDescription>किस्त भुगतान का विवरण दर्ज करें।</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>किस्त राशि (Amount) *</Label>
                      <Input
                        type="number"
                        required
                        placeholder="राशि दर्ज करें"
                        value={formData.amount}
                        onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>भुगतान तिथि (Date) *</Label>
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
                              onSelect={d => {
                                setDateObj(d);
                                setFormData(p => ({ ...p, date: formatDate(d as any) }));
                                setDateOpen(false);
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>टिप्पणी (Note)</Label>
                    <Input
                      placeholder="नोट (वैकल्पिक)"
                      value={formData.note}
                      onChange={e => setFormData(p => ({ ...p, note: e.target.value }))}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      रद्द करें
                    </Button>
                    <Button type="submit" disabled={adding}>
                      {adding ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                      {adding ? "Saving..." : "सहेजें / Save"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="px-6 py-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-orange-100 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <IndianRupee className="text-orange-600 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">कुल भुगतान किया गया</p>
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
                    <p className="text-sm text-gray-500">कुल किस्तें</p>
                    <h3 className="text-2xl font-bold text-blue-700">{installments.length}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>भुगतान इतिहास (Payment History)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <PaginatedTableSection
                data={installments}
                loading={loading}
                loadingMessage="Loading installments..."
                emptyMessage="कोई किस्त नहीं मिली।"
              >
                {(paginatedInstallments) => (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>तिथि (Date)</TableHead>
                        <TableHead>राशि (Amount)</TableHead>
                        <TableHead>टिप्पणी (Note)</TableHead>
                        <TableHead>जोड़ा गया</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedInstallments.map(inst => (
                        <TableRow key={inst.id}>
                          <TableCell>{formatDate(inst.date as any)}</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            ₹{Number(inst.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{inst.note || "-"}</TableCell>
                          <TableCell className="text-sm text-gray-500">{inst.addedby || "-"}</TableCell>
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
      </div>
    </div>
  );
}
