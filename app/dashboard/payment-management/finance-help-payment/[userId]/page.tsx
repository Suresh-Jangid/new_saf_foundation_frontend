"use client";

import { useRouter, useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { formatBilingual } from "@/lib/translations";
import { formatDate, parseDateFromDDMMYYYY, getCurrentUserInfo } from "@/lib/utils";
import { PaginatedTableSection } from "@/components/paginated-table-section";
import { APIService } from "@/lib/services";
import { toast } from "sonner";

export default function AddFinanceHelpPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;

  const [user, setUser] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [dateObj, setDateObj] = useState<Date | undefined>(undefined);
  const [dateOpen, setDateOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const apps = await APIService.getFinancialHelps({ id: userId });
        const list = Array.isArray(apps?.data) ? apps.data : [];
        const idAsNumber = Number(userId);
        const found = list.find((r: any) => String(r?.id) === userId || r?.id === idAsNumber);
        if (!cancelled) setUser(found || null);

        if (found?.id) {
          const installments = await APIService.getFinancialHelpInstallments(found.id);
          const items = Array.isArray(installments?.data)
            ? installments.data
            : Array.isArray(installments)
            ? installments
            : [];
          const expectedAmount = Number(found?.donatedAmount || 0);
          const mapped = items.map((p: any) => ({
            userId: String(found.id),
            applicationId: found.formNumber || String(found.id),
            name: found.name,
            fatherName: found.fatherName,
            amount: Number(p.amount || 0),
            expectedAmount,
            createdAt: p.date || p.created_at,
            note: p.note || "",
          }));
          if (!cancelled) setPayments(mapped);
        } else if (!cancelled) {
          setPayments([]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleAddPayment = async () => {
    if (!amount || !dateObj || !user?.id) return;
    setLoading(true);

    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    try {
      const { addedby, addedby_id } = getCurrentUserInfo();
      const res = await APIService.addFinancialHelpInstallment({
        financial_help_id: user.id,
        amount: Number(amount),
        date: dateStr,
        note: note || "",
        ...(addedby ? { addedby } : {}),
        ...(addedby_id ? { addedby_id: String(addedby_id) } : {}),
      } as any);

      if (res?.status !== false && !res?.error) {
        const expectedAmount = Number(user?.donatedAmount || 0);
        const newPayment = {
          userId: String(user.id),
          applicationId: user.formNumber || String(user.id),
          name: user.name,
          fatherName: user.fatherName,
          amount: Number(amount),
          expectedAmount,
          createdAt: dateStr,
          note,
        };
        setPayments([...payments, newPayment]);
        setAmount("");
        setDateObj(undefined);
        setDateValue("");
        setNote("");
        toast.success("Payment added successfully");
      } else {
        toast.error(res?.message || "Failed to add payment");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to add payment");
    } finally {
      setLoading(false);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const expectedAmount = Number(user?.donatedAmount || payments[0]?.expectedAmount || 0);
  const pending = Math.max(expectedAmount - totalPaid, 0);

  return (
    <div className="p-4 w-full">
      <div className="flex items-center mb-6 gap-4">
        <Button variant="outline" onClick={() => router.back()} className="px-3 py-1">
          ←
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          Add Payment Details for Finance Help
          <span className="block text-base font-normal text-gray-700">
            वित्त सहायता के लिए भुगतान विवरण जोड़ें
          </span>
        </h1>
      </div>

      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>
            User Details <span className="text-sm font-normal text-gray-600">/ उपयोगकर्ता विवरण</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="w-full">
            <TableBody>
              <TableRow>
                <TableHead>Form Number</TableHead>
                <TableCell>{user?.formNumber || user?.id}</TableCell>
                <TableHead>Date</TableHead>
                <TableCell>{formatDate(user?.date)}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableCell>{user?.name}</TableCell>
                <TableHead>Father&apos;s Name</TableHead>
                <TableCell>{user?.fatherName}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Village</TableHead>
                <TableCell>{user?.village}</TableCell>
                <TableHead>Donated Amount</TableHead>
                <TableCell>₹{expectedAmount}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Total Paid</TableHead>
                <TableCell>₹{totalPaid}</TableCell>
                <TableHead>Pending</TableHead>
                <TableCell>₹{pending}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>
            Payment Installments <span className="text-sm font-normal text-gray-600">/ भुगतान किस्तें</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <PaginatedTableSection data={payments} emptyMessage="No payments yet.">
            {(paginatedPayments) => (
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayments.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell>₹{p.amount}</TableCell>
                      <TableCell>{formatDate(p.createdAt)}</TableCell>
                      <TableCell>{p.note || "-"}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-bold">Total Paid</TableCell>
                    <TableCell colSpan={2} className="font-bold">
                      ₹{totalPaid}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </PaginatedTableSection>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            Add New Payment <span className="text-sm font-normal text-gray-600">/ नया भुगतान जोड़ें</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddPayment();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min={1}
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="date"
                    value={dateValue}
                    placeholder="01 June, 2024"
                    className="bg-background pr-10"
                    onChange={(e) => {
                      const str = e.target.value;
                      setDateValue(str);
                      const date = parseDateFromDDMMYYYY(str);
                      setDateObj(date || undefined);
                    }}
                    required
                  />
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className="absolute top-1/2 right-2 w-8 h-8 p-0 -translate-y-1/2"
                        type="button"
                      >
                        <CalendarDays className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={dateObj}
                        onSelect={(date) => {
                          if (!date) return;
                          setDateObj(date);
                          setDateValue(formatDate(date));
                          setDateOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label htmlFor="note">Note</Label>
                <Input
                  id="note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={formatBilingual("common.optional")}
                />
              </div>
            </div>
            <Button type="submit" disabled={loading || !user?.id}>
              {loading ? "Adding..." : "Add Payment"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
