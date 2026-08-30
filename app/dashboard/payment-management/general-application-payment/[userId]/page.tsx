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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RazorpayPayment } from "@/components/razorpay-payment";
import { toast } from "sonner";

import { formatBilingual } from '@/lib/translations'
import APIService from '@/lib/services'
import { formatDate, formatDateForAPI, parseDateFromDDMMYYYY, getCurrentUserInfo } from '@/lib/utils'
import {
  PAYMENT_MODE,
  PAYMENT_MODE_OPTIONS,
  formatPaymentModeLabel,
  getPaymentModeBadgeClass,
  isRazorpayPaymentMode,
  normalizePaymentModeInput,
} from "@/lib/form-values";
import { PaginatedTableSection } from "@/components/paginated-table-section"


export default function AddPaymentPage() {
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
  const [paymentMode, setPaymentMode] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Fetch user details and payments from API
  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const [userRes, installmentsRes] = await Promise.all([
          APIService.getGeneralApplications({ id: String(userId) }),
          APIService.getApplicationInstallments(String(userId)),
        ]);

        if (mounted) {
          const fetchedUser = Array.isArray(userRes.data) ? userRes.data[0] : null;
          setUser(fetchedUser || null);

          const apiPayments = Array.isArray(installmentsRes.data) ? installmentsRes.data : [];
          const mapped = apiPayments.map((p: any) => ({
            amount: Number(p.amount ?? 0),
            createdAt: p.date || p.created_at,
            note: p.note || '',
            paymentMode: normalizePaymentModeInput(p.payment_mode || PAYMENT_MODE.CASH),
          }));
          setPayments(mapped);
        }
      } catch (err) {
        console.error('Failed to load user/payments', err);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [userId]);

  // Add payment
  const handleAddPayment = async (razorpayData?: any) => {
    if (!amount || !dateObj || !paymentMode) return;
    try {
      setLoading(true);
      const { addedby, addedby_id } = getCurrentUserInfo();
      const payload = {
        application_id: user?.id || userId,
        amount: String(amount),
        date: formatDateForAPI(dateObj),
        note: note || "",
        payment_mode: paymentMode,
        addedby: addedby,
        addedby_id: String(addedby_id),
        ...(razorpayData && {
          razorpay_payment_id: razorpayData.payment_id,
          razorpay_order_id: razorpayData.order_id,
        })
      };
      await APIService.addApplicationInstallment(payload);
      
      // Fetch updated user details and payments
      const [updatedUserRes, updatedInstallmentsRes] = await Promise.all([
        APIService.getGeneralApplications({ id: String(userId) }),
        APIService.getApplicationInstallments(String(userId)),
      ]);

      // Update user details with fresh data
      const updatedUser = Array.isArray(updatedUserRes.data) ? updatedUserRes.data[0] : null;
      setUser(updatedUser || null);

      // Update payments with fresh data
      const apiPayments = Array.isArray(updatedInstallmentsRes.data) ? updatedInstallmentsRes.data : [];
      const mappedPayments = apiPayments.map((p: any) => ({
        amount: Number(p.amount ?? 0),
        createdAt: p.date || p.created_at,
        note: p.note || '',
        paymentMode: normalizePaymentModeInput(p.payment_mode || PAYMENT_MODE.CASH),
      }));
      setPayments(mappedPayments);

      // Clear form
      setAmount("");
      setDateObj(undefined);
      setDateValue("");
      setNote("");
      setPaymentMode("");
    } catch (err) {
      console.error("Failed to add installment", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Razorpay payment success
  const handleRazorpaySuccess = async (paymentData: any) => {
    try {
      await handleAddPayment(paymentData);
      toast.success("Payment added successfully!");
    } catch (error) {
      console.error("Failed to add payment after Razorpay success:", error);
      toast.error("Payment was successful but failed to save. Please contact support.");
    }
  };

  // Handle Razorpay payment error
  const handleRazorpayError = (error: any) => {
    console.error("Razorpay payment error:", error);
    toast.error("Payment failed. Please try again.");
  };

  // if (!user) {
  //   return <div className="p-4">Loading user details...</div>;
  // }

  // Calculate total paid and pending
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  let fee = 0;
  if (user?.category === "A") fee = 3000;
  else if (user?.category === "B") fee = 6000;
  else if (user?.category === "C") fee = 9000;
  const pending = Math.max(fee - totalPaid, 0);


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
          Add Payment Details for General Marriage Application
          <span className="block text-base font-normal text-gray-700">
            सामान्य आवेदन के लिए भुगतान विवरण जोड़ें
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
                <TableHead>Membership No.<br /><span className="text-xs text-gray-600">सदस्यता संख्या</span></TableHead>
                <TableCell>{user?.formNumber}</TableCell>
                <TableHead>Application Date<br /><span className="text-xs text-gray-600">आवेदन तिथि</span></TableHead>
                <TableCell>{formatDate(user?.applicationDate)}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Name<br /><span className="text-xs text-gray-600">नाम</span></TableHead>
                <TableCell>{user?.applicantName}</TableCell>
                <TableHead>Father's Name<br /><span className="text-xs text-gray-600">पिता का नाम</span></TableHead>
                <TableCell>{user?.fatherName}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Mother's Name<br /><span className="text-xs text-gray-600">माता का नाम</span></TableHead>
                <TableCell>{user?.motherName}</TableCell>
                <TableHead>Date of Birth<br /><span className="text-xs text-gray-600">जन्म तिथि</span></TableHead>
                <TableCell>{formatDate(user?.dateOfBirth)}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Mobile<br /><span className="text-xs text-gray-600">मोबाइल</span></TableHead>
                <TableCell>{user?.mobile}</TableCell>
                <TableHead>Address<br /><span className="text-xs text-gray-600">गांव</span></TableHead>
                <TableCell>{user?.address}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Category<br /><span className="text-xs text-gray-600">श्रेणी</span></TableHead>
                <TableCell>{user?.category}</TableCell>
                <TableHead>Fee<br /><span className="text-xs text-gray-600">शुल्क</span></TableHead>
                <TableCell>
                  {fee ? `₹${fee}` : ""}
                </TableCell>
              </TableRow>
          
              <TableRow>
                <TableHead>Total Paid<br /><span className="text-xs text-gray-600">कुल भुगतान</span></TableHead>
                <TableCell>₹{user?.totalAmount}</TableCell>
                <TableHead>Pending Amount<br /><span className="text-xs text-gray-600">बकाया राशि</span></TableHead>
                <TableCell className={user?.pendingAmount > 0 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                  ₹{user?.pendingAmount}
                </TableCell>
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
          <PaginatedTableSection
            data={payments}
            emptyMessage="No payments yet."
          >
            {(paginatedPayments) => (
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayments.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell>₹{p.amount}</TableCell>
                      <TableCell>{formatDate(p.createdAt)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentModeBadgeClass(p.paymentMode)}`}>
                          {formatPaymentModeLabel(p.paymentMode)}
                        </span>
                      </TableCell>
                      <TableCell>{p.note || "-"}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-bold">Total Paid</TableCell>
                    <TableCell colSpan={3} className="font-bold">
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
            onSubmit={e => {
              e.preventDefault();
              handleAddPayment();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="paymentMode">
                  Payment Mode <span className="text-xs text-gray-600">/ भुगतान मोड</span>
                </Label>
                <Select value={paymentMode} onValueChange={setPaymentMode} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.labelHi
                          ? `${option.label} / ${option.labelHi}`
                          : option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>
            {isRazorpayPaymentMode(paymentMode) ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-blue-900">Online Payment</h3>
                      <p className="text-sm text-blue-700">
                        Pay ₹{amount} securely using Razorpay
                      </p>
                      {(!amount || !dateObj) && (
                        <p className="text-xs text-orange-600 mt-1">
                          Please fill in amount and date before making payment
                        </p>
                      )}
                    </div>
                    <RazorpayPayment
                      amount={Number(amount)}
                      description={`General Marriage Application Payment - ${user?.applicantName || 'Applicant'}`}
                      onSuccess={handleRazorpaySuccess}
                      onError={handleRazorpayError}
                      disabled={loading || !amount || !dateObj || !paymentMode}
                      className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
                    >
                      Pay ₹{amount} Now
                    </RazorpayPayment>
                  </div>
                </div>
              </div>
            ) : (
              <Button type="submit" disabled={loading || !paymentMode}>
                {loading ? "Adding..." : "Add Payment"}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
