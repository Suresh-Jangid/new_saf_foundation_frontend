"use client";

import { useRouter, useParams } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { formatBilingual } from '@/lib/translations'
import { loanApplicationsAPI, loanApplicationInstallmentsAPI } from '@/lib/api'
import { formatDate, formatDateForAPI, parseDateFromDDMMYYYY, getCurrentUserInfo } from '@/lib/utils'
import { PaginatedTableSection } from "@/components/paginated-table-section"


export default function AddLoanPaymentPage() {
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
  const [paymentType, setPaymentType] = useState<"user" | "admin">("user");

  const adminPayments = useMemo(
    () => payments.filter((p) => p.paymentType === "admin"),
    [payments]
  );
  const userPayments = useMemo(
    () => payments.filter((p) => p.paymentType === "user"),
    [payments]
  );

  // Fetch user details and payments from API
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      if (!userId) return;
      try {
        const apps = await loanApplicationsAPI.getAll({ id: userId });
        const list = Array.isArray(apps?.data) ? apps.data : [];
        const found = list.find((r: any) => String(r?.id) === String(userId)) ?? list[0];
        if (!cancelled) setUser(found || null);

        if (found?.id) {
          const installments = await loanApplicationInstallmentsAPI.getByLoanApplicationId(found.id);
          const rows = Array.isArray(installments?.data)
            ? installments.data
            : Array.isArray(installments)
              ? installments
              : [];
          const userRepayment: any[] = Array.isArray(installments?.userRepayment)
            ? installments.userRepayment
            : rows.filter((p: any) => p.type === "USER_REPAYMENT" || p.type === "User Repayment");
          const wePaid: any[] = Array.isArray(installments?.wePaid)
            ? installments.wePaid
            : rows.filter((p: any) => p.type === "WE_PAID" || p.type === "We Paid");
          const expectedAmountFromUser = found?.totalAmount ?? found?.amount ?? 0;

          const mapped = [
            ...wePaid.map((p: any) => ({
              userId: String(found.id),
              applicationId: String(found.id),
              name: found?.applicantName || found?.name,
              fatherName: found?.fatherName,
              amount: Number(p.amount || 0),
              expectedAmount: expectedAmountFromUser,
              createdAt: p.date || p.created_at,
              type: found?.type || "loan",
              note: p.note || "",
              paymentType: "admin" as const,
            })),
            ...userRepayment.map((p: any) => ({
              userId: String(found.id),
              applicationId: String(found.id),
              name: found?.applicantName || found?.name,
              fatherName: found?.fatherName,
              amount: Number(p.amount || 0),
              expectedAmount: expectedAmountFromUser,
              createdAt: p.date || p.created_at,
              type: found?.type || "loan",
              note: p.note || "",
              paymentType: "user" as const,
            })),
          ];
          if (!cancelled) setPayments(mapped);
        } else if (!cancelled) {
          setPayments([]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [userId]);

  // Add payment
  const handleAddPayment = async () => {
    if (!amount || !dateObj || !user?.id) return;
    setLoading(true);

    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    try {
      const type = paymentType === 'admin' ? 'We Paid' : 'User Repayment';
      const { addedby, addedby_id } = getCurrentUserInfo();
      const payload = {
        loan_application_id: user.id,
        amount: Number(amount),
        date: dateStr,
        type,
        note: note || '',
        addedby: addedby,
        addedby_id: String(addedby_id)
      } as const;

      const res = await loanApplicationInstallmentsAPI.create(payload);
      if (res?.status) {
        const expectedAmount = user?.totalAmount ?? user?.amount ?? 0;
        const newPayment = {
          userId: String(user.id),
          applicationId: String(user.id),
          name: user?.applicantName || user?.name,
          fatherName: user?.fatherName,
          amount: Number(amount),
          expectedAmount: expectedAmount,
          createdAt: dateStr,
          type: user?.type || "loan",
          note,
          paymentType,
        } as any;
        setPayments([...payments, newPayment]);
        setAmount("");
        setDateObj(undefined);
        setDateValue("");
        setNote("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // if (!user) {
  //   return <div className="p-4">Loading user details...</div>;
  // }

  // Calculate total paid and pending
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  // Use expectedAmount from user or first payment, fallback to 0
  const expectedAmount = user?.totalAmount ?? user?.expectedAmount ?? user?.amount ?? (payments[0]?.expectedAmount ?? 0);
  const pending = Math.max(expectedAmount - totalPaid, 0);


  function isValidDate(date: Date | undefined) {
    if (!date) return false;
    return !isNaN(date.getTime());
  }

  return (
    <div className="p-4 w-full">
      <div className="flex items-center mb-6 gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="px-3 py-1"
        >
          ←
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          Add Payment Details for Loan
          <span className="block text-base font-normal text-gray-700">
            ऋण के लिए भुगतान विवरण जोड़ें
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
                <TableHead>Application ID<br /><span className="text-xs text-gray-600">आवेदन आईडी</span></TableHead>
                <TableCell>{user?.applicationId || user?.id}</TableCell>
                <TableHead>Date<br /><span className="text-xs text-gray-600">तिथि</span></TableHead>
                <TableCell>{formatDate(user?.date || user?.createdAt)}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Name<br /><span className="text-xs text-gray-600">नाम</span></TableHead>
                <TableCell>{user?.applicantName || user?.name}</TableCell>
                <TableHead>Father's Name<br /><span className="text-xs text-gray-600">पिता का नाम</span></TableHead>
                <TableCell>{user?.fatherName}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Mother's Name<br /><span className="text-xs text-gray-600">माता का नाम</span></TableHead>
                <TableCell>{user?.motherName}</TableCell>
                <TableHead>Address<br /><span className="text-xs text-gray-600">गांव</span></TableHead>
                <TableCell>{user?.address}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Type<br /><span className="text-xs text-gray-600">प्रकार</span></TableHead>
                <TableCell>{user?.type || "Loan"}</TableCell>
                <TableHead>Total Paid<br /><span className="text-xs text-gray-600">कुल भुगतान</span></TableHead>
                <TableCell>₹{totalPaid}</TableCell>
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
          {/* Section 1: Payments We Paid */}
          <div className="mb-8 px-0">
            <h2 className="text-lg font-semibold mb-2 px-4 pt-4">Payments We Paid</h2>
            <PaginatedTableSection
              data={adminPayments}
              emptyMessage="No payments yet."
            >
              {(paginatedAdminPayments) => (
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Paid By</TableHead>
                      <TableHead>Expected Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAdminPayments.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell>₹{p.amount}</TableCell>
                        <TableCell>{formatDate(p.createdAt)}</TableCell>
                        <TableCell>{p.note || "-"}</TableCell>
                        <TableCell>Admin</TableCell>
                        <TableCell>₹{p.expectedAmount || "-"}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-bold">Total We Paid</TableCell>
                      <TableCell colSpan={4} className="font-bold">
                        ₹{adminPayments.reduce((sum, p) => sum + Number(p.amount), 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </PaginatedTableSection>
          </div>

          {/* Section 2: User Repayments */}
          <div>
            <h2 className="text-lg font-semibold mb-2 px-4">User Repayments</h2>
            <PaginatedTableSection
              data={userPayments}
              emptyMessage="No repayments yet."
            >
              {(paginatedUserPayments) => (
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Paid By</TableHead>
                      <TableHead>Expected Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUserPayments.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell>₹{p.amount}</TableCell>
                        <TableCell>{formatDate(p.createdAt)}</TableCell>
                        <TableCell>{p.note || "-"}</TableCell>
                        <TableCell>{p.name || "-"}</TableCell>
                        <TableCell>₹{p.expectedAmount || "-"}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-bold">Total Repaid</TableCell>
                      <TableCell colSpan={4} className="font-bold">
                        ₹{userPayments.reduce((sum, p) => sum + Number(p.amount), 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </PaginatedTableSection>
          </div>
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
            onSubmit={e => {
              e.preventDefault();
              handleAddPayment();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="amount">
                  Amount <span className="text-xs text-gray-600">/ राशि</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  min={1}
                />
              </div>
              <div>
                <Label htmlFor="date">
                  Date <span className="text-xs text-gray-600">/ तिथि</span>
                </Label>
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
                      if (date) {
                        setDateObj(date);
                      } else {
                        setDateObj(undefined);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setDateOpen(true);
                      }
                    }}
                    required
                  />
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-picker"
                        variant="ghost"
                        className="absolute top-1/2 right-2 w-8 h-8 p-0 -translate-y-1/2"
                        tabIndex={-1}
                        type="button"
                      >
                        <CalendarDays className="w-4 h-4" />
                        <span className="sr-only">Select date</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto overflow-hidden p-0"
                      align="end"
                      alignOffset={-8}
                      sideOffset={10}
                    >
                      <Calendar
                        mode="single"
                        selected={dateObj}
                        captionLayout="dropdown"
                        month={dateObj}
                        onMonthChange={setDateObj}
                        onSelect={(date: any) => {
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
                <Label htmlFor="note">
                  Note <span className="text-xs text-gray-600">/ टिप्पणी</span>
                </Label>
                <Input
                  id="note"
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                                      placeholder={formatBilingual("common.optional")}
                />
              </div>
              <div>
                <Label>Payment By <span className="text-xs text-gray-600">/ भुगतान किसके द्वारा</span></Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentType"
                      value="user"
                      checked={paymentType === "user"}
                      onChange={() => setPaymentType("user")}
                    />
                    User Repayment
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentType"
                      value="admin"
                      checked={paymentType === "admin"}
                      onChange={() => setPaymentType("admin")}
                    />
                    We Paid
                  </label>
                </div>
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Payment"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
