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
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { formatDate, formatDateForAPI, getCurrentUserInfo } from "@/lib/utils";
import { PaginatedTableSection } from "@/components/paginated-table-section";
import { toast } from "sonner";
import { post, get } from "@/lib/api";

function resolveInsuranceApplicationId(user: Record<string, unknown> | null | undefined): string {
  if (!user) return "";
  return String(
    user.insuranceApplicationId ??
      user.insurance_application_id ??
      user.insuranceApplication_id ??
      ""
  );
}

// Types
type Payment = {
  amount: number;
  createdAt: string;
  note?: string;
};

type Member = {
  name: string;
  address: string;
  payment_status: number;
  insuranceApplication_id: any;
  payments: Payment[];
};

type SurakshaBimaUser = {
  id: number;
  date: string;
  codeNumber: string | null;
  bimaNumber: string;
  applicantName: string;
  fatherName: string;
  wifeOf: string;
  gotra: string;
  address: string;
  membershipJoinDate: string;
  associatedUntil: string;
  permanentFee: string;
  installmentAmount: string;
  totalGrantAmount: string;
  totalMembersServing: number;
  rate200: string;
  deducted10Percent: string | null;
  deducted25Percent: string | null;
  totalPaidAmount: string;
  gender: string;
  payment_status: number;
  insuranceApplication_id: any;

};

export default function SurakshaBimaYojanaPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;

  // Refs to prevent duplicate API calls (more stable than state)
  const userDataFetched = React.useRef(false);
  const membersDataFetched = React.useRef(false);
  const summaryDataFetched = React.useRef(false);
  const installmentsDataFetched = React.useRef(false);

  // State for user data and loading
  const [user, setUser] = useState<SurakshaBimaUser | null>(null);
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
  const [loadingMembers, setLoadingMembers] = useState<{ [key: number]: boolean }>({});

  // State for members from API
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [search, setSearch] = useState("");
  
  // State for payment summary data
  const [paymentSummary, setPaymentSummary] = useState<any[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  // State for payment installments data
  const [paymentInstallments, setPaymentInstallments] = useState<any[]>([]);
  const [installmentsLoading, setInstallmentsLoading] = useState(false);

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
        
        console.log("Fetching Suraksha Bima data for user ID:", userId);
        
        // Use get helper to fetch data
        const response = await get('?apicall=getSurakshaBimaList');
        
        const result = response.data;
        console.log("API Response:", result);
        
        if (result.status && result.data) {
          const userData = result.data.find((item: SurakshaBimaUser) => item.id.toString() === userId);
          console.log("Found user data:", userData);
          
          if (userData) {
            setUser({
              ...userData,
              insuranceApplication_id: resolveInsuranceApplicationId(userData),
            });
          } else {
            setError("User not found");
            toast.error("User not found");
          }
        } else {
          throw new Error(result.message || "Failed to fetch user data");
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

  // Fetch members data from API
  useEffect(() => {
    const fetchMembersData = async () => {
      if (!user || membersDataFetched.current) {
        return;
      }

      try {
        setMembersLoading(true);
        membersDataFetched.current = true;
        
        console.log("Fetching members data for user ID:", userId);
        
        // Use axios POST method with form data containing the ID
        const formData = new FormData();
        formData.append('id', user?.insuranceApplication_id.toString() || "");
        
        const response = await post('?apicall=getPreviousSurakshaBimaMembers', formData);
        const result = response.data;
        console.log("Members API Response:", result);
        
        if (result.status && result.data) {
          // Transform the API data to match our Member type
          const transformedMembers = result.data.map((member: any) => ({
            name: member.applicantName,
            // address: member.address || "",
            payment_status: member.payment_status,
            insuranceApplication_id: member.id,
            // payments: [] // Initialize empty payments array
          }));

          console.log(transformedMembers, result.data);
          
          setMembers(transformedMembers);
        } else {
          console.warn("No members data or API error:", result.message);
          setMembers([]);
        }
      } catch (err) {
        console.error("Error fetching members data:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch members data";
        toast.error(errorMessage);
        setMembers([]);
      } finally {
        setMembersLoading(false);
      }
    };

    fetchMembersData();
  }, [user]);

  // Fetch payment summary data from API
  useEffect(() => {
    const fetchPaymentSummary = async () => {
      if (!user?.insuranceApplication_id || summaryDataFetched.current) {
        return;
      }

      try {
        setSummaryLoading(true);
        summaryDataFetched.current = true;
        
        console.log("Fetching payment summary for insurance application ID:", user.insuranceApplication_id);
        
        // Use axios POST method with form data containing the insuranceApplication_id
        const formData = new FormData();
        formData.append('application_insurance_id', user.insuranceApplication_id.toString());
        
        const response = await post('?apicall=getSurakshaBimaPaymentById', formData);
        const result = response.data;
        console.log("Payment Summary API Response:", result);
        
        if (result.status && result.data) {
          setPaymentSummary(result.data);
        } else {
          console.warn("No payment summary data or API error:", result.message);
          setPaymentSummary([]);
        }
      } catch (err) {
        console.error("Error fetching payment summary:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch payment summary";
        toast.error(errorMessage);
        setPaymentSummary([]);
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchPaymentSummary();
  }, [user?.insuranceApplication_id]);

  // Fetch payment installments data from API
  useEffect(() => {
    const fetchPaymentInstallments = async () => {
      if (!user?.insuranceApplication_id || installmentsDataFetched.current) {
        return;
      }

      try {
        setInstallmentsLoading(true);
        installmentsDataFetched.current = true;
        
        console.log("Fetching payment installments for insurance application ID:", user.insuranceApplication_id);
        
        // Use axios POST method with form data containing the application_insurance_id
        const formData = new FormData();
        formData.append('application_insurance_id', user.insuranceApplication_id.toString());
        
        const response = await post('?apicall=getApplicationInsuranceInstallments', formData);
        const result = response.data;
        console.log("Payment Installments API Response:", result);
        
        if (result.status && result.data) {
          // Map API response to our Payment type
          const mappedPayments = result.data.map((installment: any) => ({
            amount: Number(installment.amount || 0),
            createdAt: installment.date || installment.created_at || installment.createdAt,
            note: installment.note || '',
          }));
          setPayments(mappedPayments);
          setPaymentInstallments(result.data);
        } else {
          console.warn("No payment installments data or API error:", result.message);
          setPayments([]);
          setPaymentInstallments([]);
        }
      } catch (err) {
        console.error("Error fetching payment installments:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch payment installments";
        toast.error(errorMessage);
        setPayments([]);
        setPaymentInstallments([]);
      } finally {
        setInstallmentsLoading(false);
      }
    };

    fetchPaymentInstallments();
  }, [user?.insuranceApplication_id]);

  // Function to refresh payment data (to avoid code duplication)
  const refreshPaymentData = async () => {
    if (!user?.insuranceApplication_id) return;
    
    // Reset refs to allow fresh data fetch for payment-related data only
    summaryDataFetched.current = false;
    installmentsDataFetched.current = false;
    
    const formData = new FormData();
    formData.append('application_insurance_id', user.insuranceApplication_id.toString());
    
    try {
      // Refresh payment summary
      const summaryResponse = await post('?apicall=getSurakshaBimaPaymentById', formData);
      
      const summaryResult = summaryResponse.data;
      if (summaryResult.status && summaryResult.data) {
        // The API returns data in the format: [{"id":13,"application_insurance_id":32,"amount":200,"applicantName":"father 1"}]
        setPaymentSummary(summaryResult.data);
      }
      
      // Refresh payment installments
      const installmentsResponse = await post('?apicall=getApplicationInsuranceInstallments', formData);
      
      const installmentsResult = installmentsResponse.data;
      if (installmentsResult.status && installmentsResult.data) {
        const mappedPayments = installmentsResult.data.map((installment: any) => ({
          amount: Number(installment.amount || 0),
          createdAt: installment.date || installment.created_at || installment.createdAt,
          note: installment.note || '',
        }));
        setPayments(mappedPayments);
        setPaymentInstallments(installmentsResult.data);
      }
    } catch (summaryErr) {
      console.error("Error refreshing payment data:", summaryErr);
    }
  };

  const handleMemberPay = async (memberIndex: number, amount: number) => {
    const member = members[memberIndex];
    

    console.log("member data ", member);
    
  
    try {
      setLoadingMembers(prev => ({ ...prev, [memberIndex]: true }));
      
      // Prepare form data for API call - matching Postman request
      const formData = new FormData();
      formData.append('application_insurance_id',user?.insuranceApplication_id.toString());
      formData.append('paymentby_id', member.insuranceApplication_id);

      formData.append('amount', amount.toString());
      // Include addedby and addedby_id like general application payments
      const { addedby, addedby_id } = getCurrentUserInfo();
      formData.append('addedby', addedby);
      formData.append('addedby_id', String(addedby_id));
      
      console.log('Sending payment data', user);
      
      // Call the API using axios - matching Postman request
      const response = await post('?apicall=createSurakshaBimaPayment', formData, {
        responseType: 'text', // Get response as text like Postman
      });

      console.log("response data", response);
      
      const result = response.data;
      console.log('Payment API Response:', result);
      
      // Try to parse the response as JSON, but handle text response gracefully
      let parsedResult;
      try {
        parsedResult = JSON.parse(result);
      } catch (e) {
        // If it's not JSON, treat it as text response
        console.log('Response is not JSON, treating as text:', result);
        if (result.includes('success') || result.includes('Success')) {
          parsedResult = { status: true, message: 'Payment successful' };
        } else {
          parsedResult = { status: false, message: result };
        }
      }
      
      if (parsedResult.status) {
        // Update local state to show payment was made
        setMembers((prev) =>
          prev.map((m, index) =>
            index === memberIndex && m.payments?.length === 0
              ? {
                  ...m,
                  payments: [
                    {
                      amount,
                      createdAt: new Date().toISOString(),
                    },
                  ],
                }
              : m
          )
        );
        
        // Refresh payment summary and installments after successful payment
        if (user?.insuranceApplication_id) {
          await refreshPaymentData();
        }
        
        toast.success(`Payment of ₹${amount} recorded successfully for ${member.name}`);
      } else {
        throw new Error(parsedResult.message || 'Payment failed');
      }
    } catch (err) {
      console.error('Error creating payment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create payment';
      toast.error(errorMessage);
    } finally {
      setLoadingMembers(prev => ({ ...prev, [memberIndex]: false }));
    }
  };

  // Add payment using API
  const handleAddPayment = async () => {
    if (!amount || !dateObj || !user?.insuranceApplication_id) return;
    
    try {
      setPaymentLoading(true);
      
      const { addedby, addedby_id } = getCurrentUserInfo();
      const formData = new FormData();
      formData.append('application_insurance_id', user.insuranceApplication_id.toString());
      formData.append('amount', amount);
      formData.append('date', formatDateForAPI(dateObj));
      formData.append('note', note || "");
      formData.append('addedby', addedby);
      formData.append('addedby_id', String(addedby_id));
      
      console.log("Adding payment installment with payload:", {
        application_insurance_id: user.insuranceApplication_id,
        amount: amount,
        date: formatDateForAPI(dateObj),
        note: note || "",
      });
      
      const response = await post('?apicall=addApplicationInsuranceInstallment', formData);
      
      const result = response.data;
      console.log("Add payment response:", result);
      
      if (result.status) {
        // Add the new payment to the local state
        const newPayment = {
          amount: Number(amount),
          createdAt: formatDateForAPI(dateObj),
          note: note || "",
        };
        setPayments([...payments, newPayment]);
        
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
  const fee = user ? Number(user.permanentFee) : 0;
  const pending = Math.max(fee - totalPaid, 0);

  function isValidDate(date: Date | undefined) {
    if (!date) return false;
    return !isNaN(date.getTime());
  }

  // Helper function to filter members based on search term
  const filterMembersBySearch = (members: Member[], searchTerm: string) => {
    if (!searchTerm.trim()) return members;
    
    const term = searchTerm.toLowerCase();
    return members.filter(member => 
      member.name.toLowerCase().includes(term) ||
      (member.address && member.address.toLowerCase().includes(term))
    );
  };

  const pendingMembers = filterMembersBySearch(
    members.filter((m) => m.payment_status === 0),
    search
  );

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
          Add Payment Details for Insurance Bima Payment
          <span className="block text-base font-normal text-gray-700">
            सुरक्षा बीमा योजना के लिए भुगतान विवरण जोड़ें
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
                <TableCell>{user.bimaNumber}</TableCell>
                <TableHead>Application Date<br /><span className="text-xs text-gray-600">आवेदन तिथि</span></TableHead>
                <TableCell>{formatDate(user.date)}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Name<br /><span className="text-xs text-gray-600">नाम</span></TableHead>
                <TableCell>{user.applicantName}</TableCell>
                <TableHead>Father's Name<br /><span className="text-xs text-gray-600">पिता का नाम</span></TableHead>
                <TableCell>{user.fatherName}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Wife Of<br /><span className="text-xs text-gray-600">पति का नाम</span></TableHead>
                <TableCell>{user.wifeOf}</TableCell>
                <TableHead>Gotra<br /><span className="text-xs text-gray-600">गोत्र</span></TableHead>
                <TableCell>{user.gotra}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Address<br /><span className="text-xs text-gray-600">गांव</span></TableHead>
                <TableCell>{user.address}</TableCell>
                <TableHead>Gender<br /><span className="text-xs text-gray-600">लिंग</span></TableHead>
                <TableCell>{user.gender}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Membership Join Date<br /><span className="text-xs text-gray-600">सदस्यता जुड़ने की तिथि</span></TableHead>
                <TableCell>{formatDate(user.membershipJoinDate)}</TableCell>
                <TableHead>Associated Until<br /><span className="text-xs text-gray-600">संबद्ध तक</span></TableHead>
                <TableCell>{formatDate(user.associatedUntil)}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Permanent Fee<br /><span className="text-xs text-gray-600">स्थायी शुल्क</span></TableHead>
                <TableCell>₹{user.permanentFee}</TableCell>
                <TableHead>Installment Amount<br /><span className="text-xs text-gray-600">किस्त राशि</span></TableHead>
                <TableCell>₹{user.installmentAmount}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Total Grant Amount<br /><span className="text-xs text-gray-600">कुल अनुदान राशि</span></TableHead>
                <TableCell>₹{user.totalGrantAmount}</TableCell>
                <TableHead>Total Members Serving<br /><span className="text-xs text-gray-600">कुल सदस्य सेवा</span></TableHead>
                <TableCell>{user.totalMembersServing}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Rate 200<br /><span className="text-xs text-gray-600">दर 200</span></TableHead>
                <TableCell>₹{user.rate200}</TableCell>
                <TableHead>Total Paid Amount<br /><span className="text-xs text-gray-600">कुल भुगतान राशि</span></TableHead>
                <TableCell>₹{user.totalPaidAmount}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Payment Status<br /><span className="text-xs text-gray-600">भुगतान स्थिति</span></TableHead>
                <TableCell className={user.payment_status === 1 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                  {user.payment_status === 1 ? "Paid" : "Pending"}
                </TableCell>
                <TableHead>Pending Amount<br /><span className="text-xs text-gray-600">बकाया राशि</span></TableHead>
                <TableCell className={pending > 0 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                  ₹{pending}
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

      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>
            Payment Installments <span className="text-sm font-normal text-gray-600">/ भुगतान किस्तें</span>
            {installmentsLoading && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <PaginatedTableSection
            data={payments}
            loading={installmentsLoading}
            loadingMessage="Loading payments..."
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

      {/* Member Payment List Section */}
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>
            Pay ₹200 Members
            {membersLoading && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Input */}
          <div className="mb-4">
            <Label htmlFor="search-members">Search Members / सदस्य खोजें</Label>
            <Input
              id="search-members"
              type="text"
              placeholder="Search by name or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <PaginatedTableSection
            data={pendingMembers}
            loading={membersLoading}
            loadingMessage="Loading members..."
            emptyMessage={search ? `No members found matching "${search}"` : "No members available."}
            resetKey={search}
          >
            {(paginatedMembers) => (
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMembers.map((member) => {
                    const memberIndex = members.findIndex((m) => m === member);
                    return (
                      <TableRow key={memberIndex}>
                        <TableCell>{member.name}</TableCell>
                        <TableCell>{member.address || "-"}</TableCell>
                        <TableCell className={member.payment_status === 1 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                          {member.payment_status === 1 ? "Paid" : "Pending"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleMemberPay(memberIndex, 200)}
                            disabled={loadingMembers[memberIndex]}
                          >
                            {loadingMembers[memberIndex] ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            ) : (
                              `Pay ₹200`
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </PaginatedTableSection>
          
          {/* Search Results Summary */}
          {search && (
            <div className="mt-2 text-sm text-gray-600 px-4">
              Showing {pendingMembers.length} of {members.filter(m => m.payment_status === 0).length} available members
            </div>
          )}
          
          {/* Category Summary */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              Summary: {members.filter(m => m.payment_status === 0).length} pending, {members.filter(m => m.payment_status === 1).length} paid
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            Payment Summary <span className="text-sm font-normal text-gray-600">/ भुगतान सारांश</span>
            {summaryLoading && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}

            {/* Payment Summary Statistics */}
            {paymentSummary.length > 0 && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Total Members Paid</div>
                  <div className="text-2xl font-bold text-blue-800">{paymentSummary.length}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Total Amount Paid</div>
                  <div className="text-2xl font-bold text-green-800">
                    ₹{paymentSummary.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0)}
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">Average Amount</div>
                  <div className="text-2xl font-bold text-purple-800">
                    ₹{paymentSummary.length > 0 ? Math.round(paymentSummary.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0) / paymentSummary.length) : 0}
                  </div>
                </div>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <PaginatedTableSection
            data={paymentSummary}
            loading={summaryLoading}
            loadingMessage="Loading payment summary..."
            emptyMessage="No payment summary available."
          >
            {(paginatedSummary) => (
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Paid Amount</TableHead>
                    <TableHead>Payment ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSummary.map((payment: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{payment.paymentByName || "-"}</TableCell>
                      <TableCell className="font-bold">₹{payment.amount || 0}</TableCell>
                      <TableCell>{payment.id || "-"}</TableCell>
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
