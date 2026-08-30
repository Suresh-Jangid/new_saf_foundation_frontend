"use client";

import { useRouter, useParams } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateForAPI, getCurrentUserInfo } from "@/lib/utils";
import { PaginatedTableSection } from "@/components/paginated-table-section";
import { toast } from "sonner";
import { pensionYojanaAPI, postUrlEncoded, createSearchParams, post } from "@/lib/api";

// Types
type Payment = {
  id?: number;
  amount: number;
  date: string;
  note?: string;
};

type PensionYojanaUser = {
  id: number;
  date: string;
  name: string;
  fatherName: string;
  gotra: string;
  age: number;
  village: string;
  tehsil: string;
  district: string;
  mobile: string;
  photo: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  monthlyPension: string;
  addedby: string;
  addedby_id: number;
  dob: string;
  formNumber: string;
  photo_url: string;
};

export default function PensionYojanaPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;

  // Refs to prevent duplicate API calls
  const userDataFetched = React.useRef(false);
  const paymentsDataFetched = React.useRef(false);

  // State for user data and loading
  const [user, setUser] = useState<PensionYojanaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for payment installments
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [dateObj, setDateObj] = useState<Date | undefined>(undefined);
  const [dateOpen, setDateOpen] = useState(false);
  const [note, setNote] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Fetch user data from API
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId || userDataFetched.current) {
        if (!userId) {
          setError("User ID is required");
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        userDataFetched.current = true;
        
        console.log("Fetching Pension Yojana data for user ID:", userId);
        
        // Use pensionYojanaAPI to fetch data
        const response = await pensionYojanaAPI.getAll({});
        
        console.log("API Response:", response);
        
        if (response.status && response.data) {
          const userData = response.data.find((item: PensionYojanaUser) => item.id.toString() === userId);
          console.log("Found user data:", userData);
          
          if (userData) {
            setUser(userData);
          } else {
            setError("User not found");
            toast.error("User not found");
          }
        } else {
          throw new Error(response.message || "Failed to fetch user data");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch user data";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  // Fetch payment installments data from API
  useEffect(() => {
    const fetchPaymentInstallments = async () => {
      if (!userId || paymentsDataFetched.current) {
        return;
      }

      try {
        paymentsDataFetched.current = true;
        
        console.log("Fetching payment installments for pension yojana ID:", userId);
        
        const reqData = new FormData();
        reqData.append("pension_yojana_id", userId);
        const response = await post('?apicall=getPensionYojanaPayments', reqData);
        
        const result = response.data;
        console.log("Payment Installments API Response:", result);
        
        if (result.status && result.data) {
          // Map API response to our Payment type
          const mappedPayments = result.data.map((installment: any) => ({
            id: installment.id,
            amount: Number(installment.amount || 0),
            date: installment.date || installment.created_at || installment.createdAt,
            note: installment.note || '',
          }));
          setPayments(mappedPayments);
        } else {
          console.warn("No payment installments data or API error:", result.message);
          setPayments([]);
        }
      } catch (err) {
        console.error("Error fetching payment installments:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch payment installments";
        toast.error(errorMessage);
        setPayments([]);
      }
    };

    fetchPaymentInstallments();
  }, [userId]);

  // Function to refresh payment data
  const refreshPaymentData = async () => {
    if (!userId) return;
    
    try {
      const reqData = new FormData();
      reqData.append("pension_yojana_id", userId);
      const response = await post('?apicall=getPensionYojanaPayments', reqData);
      
      const result = response.data;
      if (result.status && result.data) {
        const mappedPayments = result.data.map((installment: any) => ({
          id: installment.id,
          amount: Number(installment.amount || 0),
          date: installment.date || installment.created_at || installment.createdAt,
          note: installment.note || '',
        }));
        setPayments(mappedPayments);
      }
    } catch (err) {
      console.error("Error refreshing payment data:", err);
    }
  };

  // Add payment using API
  const handleAddPayment = async () => {
    if (!amount || !dateObj || !userId) return;
    
    try {
      setPaymentLoading(true);
      
      const formData = new FormData();
      formData.append('pension_yojana_id', userId);
      formData.append('amount', amount);
      formData.append('date', formatDateForAPI(dateObj));
      formData.append('note', note || "");

      const response = await post('?apicall=addPensionYojanaPayment', formData);
      
      const result = response.data;
      console.log("Add payment response:", result);
      
      if (result.status) {
        // Refresh payment data to get updated list
        await refreshPaymentData();
        
        // Reset form
        setAmount("");
        setDateObj(undefined);
        setDateValue("");
        setNote("");
        
        toast.success("Payment added successfully");
      } else {
        toast.error(result.message || "Failed to add payment");
      }
    } catch (error: any) {
      console.error("Error adding payment:", error);
      toast.error(error.message || "Failed to add payment");
    } finally {
      setPaymentLoading(false);
    }
  };

  // Calculate total paid and pending
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const monthlyPension = user ? Number(user.monthlyPension) : 0;
  const pending = Math.max(monthlyPension - totalPaid, 0);

  function isValidDate(date: Date | undefined) {
    if (!date) return false;
    return !isNaN(date.getTime());
  }

  // Show loading state
  if (loading) {
    return (
      <div className="p-4 w-full">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading user data...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !user) {
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
            Error Loading User Data
          </h1>
        </div>
        <Card className="w-full">
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              {error || "User not found"}
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
          Add Payment Details for Pension Yojana Application Payment
          <span className="block text-base font-normal text-gray-700">
            पेंशन योजना के लिए भुगतान विवरण जोड़ें
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
                <TableHead>Application Date<br /><span className="text-xs text-gray-600">आवेदन तिथि</span></TableHead>
                <TableCell>{formatDate(user.date)}</TableCell>
                <TableHead>Applicant Name<br /><span className="text-xs text-gray-600">आवेदक का नाम</span></TableHead>
                <TableCell>{user.name}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Father's Name<br /><span className="text-xs text-gray-600">पिता का नाम</span></TableHead>
                <TableCell>{user.fatherName}</TableCell>
                <TableHead>Age<br /><span className="text-xs text-gray-600">आयु</span></TableHead>
                <TableCell>{user.age} years</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Village<br /><span className="text-xs text-gray-600">गांव</span></TableHead>
                <TableCell>{user.village}</TableCell>
                <TableHead>Mobile<br /><span className="text-xs text-gray-600">मोबाइल</span></TableHead>
                <TableCell>{user.mobile}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>District<br /><span className="text-xs text-gray-600">जिला</span></TableHead>
                <TableCell>{user.district}</TableCell>
                <TableHead>Tehsil<br /><span className="text-xs text-gray-600">तहसील</span></TableHead>
                <TableCell>{user.tehsil}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Bank Name<br /><span className="text-xs text-gray-600">बैंक का नाम</span></TableHead>
                <TableCell>{user.bankName}</TableCell>
                <TableHead>Account Number<br /><span className="text-xs text-gray-600">खाता संख्या</span></TableHead>
                <TableCell>{user.accountNumber}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>IFSC Code<br /><span className="text-xs text-gray-600">IFSC कोड</span></TableHead>
                <TableCell>{user.ifscCode}</TableCell>
                <TableHead>Monthly Pension<br /><span className="text-xs text-gray-600">मासिक पेंशन</span></TableHead>
                <TableCell>₹{user.monthlyPension}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Total Paid<br /><span className="text-xs text-gray-600">कुल भुगतान</span></TableHead>
                <TableCell className="text-green-600 font-bold" colSpan={3}>
                  ₹{totalPaid}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Payment Form */}
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>
            Add New Payment <span className="text-sm font-normal text-gray-600">/ नया भुगतान जोड़ें</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="amount">Amount / राशि</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                disabled={paymentLoading}
              />
            </div>
            <div>
              <Label htmlFor="date">Date / तिथि</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    disabled={paymentLoading}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dateValue || "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateObj}
                    onSelect={(date) => {
                      setDateObj(date);
                      setDateValue(date ? formatDateForAPI(date) : "");
                      setDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="note">Note / टिप्पणी</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note"
                disabled={paymentLoading}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleAddPayment} 
                disabled={!amount || !dateObj || paymentLoading}
                className="w-full"
              >
                {paymentLoading ? "Adding..." : "Add Payment"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Installments */}
      <Card className="w-full">
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
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayments.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell>₹{p.amount}</TableCell>
                      <TableCell>{formatDate(p.date)}</TableCell>
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
    </div>
  );
}
