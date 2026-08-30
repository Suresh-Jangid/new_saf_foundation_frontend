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
import { toast } from "sonner";

import { formatBilingual } from '@/lib/translations'
import APIService from '@/lib/services'
import { formatDate, formatDateForAPI, getCurrentUserInfo } from '@/lib/utils'
import { PaginatedTableSection } from "@/components/paginated-table-section"
import { PaginatedMembersTable } from "@/components/paginated-members-table"

type Payment = {
  amount: number;
  createdAt: string;
  note?: string;
};

type Member = {
  id: string;
  name: string;
  formNumber?: string;
  payment_status?: number;
  category?: string;
  payments: Payment[];
};

// Type based on the API response structure
type MarriageCongratulationsData = {
  id: number;
  application_id : string ;
  date: string;
  codeNumber: string;
  marriageNumber: string;
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
  rate100: number;
  rate200: number;
  rate300: number;
  deductionPercent: string;
  deductedAmount: string;
  totalPaidAmount: string;
  gender: string;
  payment_status: number;
};

// Type for installment data from API
type InstallmentData = {
  id: number;
  application_id: number;
  amount: string;
  date: string;
  note: string;
  created_at: string;
};

// Type for API response members
type APIMember = {
  id: number;
  formNumber: string;
  applicantName: string;
  payment_status: number;
  category: string;
};

export default function AddMarriageCongratulationsPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  // State for user data
  const [user, setUser] = useState<MarriageCongratulationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for payment installments from API
  const [payments, setPayments] = useState<Payment[]>([]);
  const [installmentsLoading, setInstallmentsLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [dateObj, setDateObj] = useState<Date | undefined>(undefined);
  const [dateOpen, setDateOpen] = useState(false);
  const [note, setNote] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  // State for members data from API
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const membersDataFetched = useRef(false);

  // State for search functionality in each section
  const [search100, setSearch100] = useState("");
  const [search200, setSearch200] = useState("");
  const [search300, setSearch300] = useState("");

  // State for payment summary from API
  const [paymentSummary, setPaymentSummary] = useState<any[]>([]);
  const [paymentSummaryLoading, setPaymentSummaryLoading] = useState(false);

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all marriage congratulations data
        const response = await APIService.getMarriageCongratulations();
        
        if (response.status && response.data) {
          // Find the specific user by ID
          const userData = response.data.find((item: MarriageCongratulationsData) => 
            item.id.toString() === userId
          );
          
          if (userData) {
            setUser(userData);
          } else {
            setError("User not found");
            toast.error("User not found");
          }
        } else {
          setError(response.message || "Failed to fetch user data");
          toast.error(response.message || "Failed to fetch user data");
        }
      } catch (error: any) {
        console.error("Error fetching user data:", error);
        setError(error.message || "Failed to fetch user data");
        toast.error(error.message || "Failed to fetch user data");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  // Fetch payment installments from API
  useEffect(() => {
    const fetchPaymentInstallments = async () => {
      if (!user?.id) return;

      try {
        setInstallmentsLoading(true);
        const response = await APIService.getMarriageCongratulationsInstallments(String(user.id));

        if (response.status && response.data) {
          const mappedPayments = response.data.map((installment: InstallmentData) => ({
            amount: Number(installment.amount),
            createdAt: installment.date || installment.created_at,
            note: installment.note || "",
          }));
          setPayments(mappedPayments);
        } else {
          setPayments([]);
        }
      } catch (error: any) {
        console.error("Error fetching payment installments:", error);
        const errorMessage = error.message || "Failed to fetch payment installments";
        toast.error(errorMessage);
        setPayments([]);
      } finally {
        setInstallmentsLoading(false);
      }
    };

    fetchPaymentInstallments();
  }, [user?.id]);

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
        
        const response = await APIService.getPreviousApplicationsMembers(String(user.id));
        
        console.log("Members API Response:", response);
        
        if (response.status && response.categories) {
          // Transform the API data to match our Member type
          const transformedMembers: Member[] = [];
          
          // Process each category (C, D, E, etc.)
          Object.keys(response.categories).forEach(category => {
            const categoryData = response.categories[category];
            if (categoryData.members && Array.isArray(categoryData.members)) {
              categoryData.members.forEach((member: APIMember) => {
                transformedMembers.push({
                  id: String(member.id),
                  name: member.applicantName,
                  formNumber: member.formNumber,
                  payment_status: member.payment_status,
                  category: member.category,
                  payments: [] // Initialize empty payments array
                });
              });
            }
          });
          
          setMembers(transformedMembers);
        } else {
          console.warn("No members data or API error:", response.message);
          setMembers([]);
        }
      } catch (error: any) {
        console.error("Error fetching members data:", error);
        const errorMessage = error.message || "Failed to fetch members data";
        toast.error(errorMessage);
        setMembers([]);
      } finally {
        setMembersLoading(false);
      }
    };

    fetchMembersData();
  }, [user]);

  // Fetch payment summary from API
  useEffect(() => {
    const fetchPaymentSummary = async () => {
      if (!user?.id) return;

      try {
        setPaymentSummaryLoading(true);
        
        console.log("Fetching payment summary for application ID:", user.id);
        
        const response = await APIService.getMarriageCongratulationsPayment(String(user.id));
        
        console.log("Payment Summary API Response:", response);
        
        if (response.status && response.data) {
          setPaymentSummary(response.data);
        } else {
          console.warn("No payment summary data or API error:", response.message);
          setPaymentSummary([]);
        }
      } catch (error: any) {
        console.error("Error fetching payment summary:", error);
        const errorMessage = error.message || "Failed to fetch payment summary";
        toast.error(errorMessage);
        setPaymentSummary([]);
      } finally {
        setPaymentSummaryLoading(false);
      }
    };

    fetchPaymentSummary();
  }, [user?.id]);

  const handleMemberPay = async (memberId: string | number, amount: number, category: string) => {
    const normalizedMemberId = String(memberId);
    if (!user?.id) {
      toast.error("User data not available");
      return;
    }

    try {
      console.log("Creating payment for member:", memberId, "amount:", amount, "category:", category);
      
      const { addedby, addedby_id } = getCurrentUserInfo();
      
      const response = await APIService.createMarriageCongratulationsPayment({
        marriage_congratulations_id: String(user.id),
        application_id: normalizedMemberId,
        amount: amount,
        category: category,
        addedby: addedby,
        addedby_id: String(addedby_id)
      });
      
      console.log("Payment creation response:", response);
      
      if (response.status) {  
        // Update local member state to show payment
        setMembers((prev) =>
          prev.map((m) =>
            m.id === normalizedMemberId && m.payments.length === 0
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
        
        // Refresh payment summary
        const summaryResponse = await APIService.getMarriageCongratulationsPayment(String(user.id));
        
        if (summaryResponse.status && summaryResponse.data) {
          setPaymentSummary(summaryResponse.data);
        }
        
        // Refresh members data
        const membersResponse = await APIService.getPreviousApplicationsMembers(String(user.id));
        
        if (membersResponse.status && membersResponse.categories) {
          // Transform the API data to match our Member type
          const transformedMembers: Member[] = [];
          
          // Process each category (C, D, E, etc.)
          Object.keys(membersResponse.categories).forEach(category => {
            const categoryData = membersResponse.categories[category];
            if (categoryData.members && Array.isArray(categoryData.members)) {
              categoryData.members.forEach((member: APIMember) => {
                transformedMembers.push({
                  id: String(member.id),
                  name: member.applicantName,
                  formNumber: member.formNumber,
                  payment_status: member.payment_status,
                  category: member.category,
                  payments: [] // Initialize empty payments array
                });
              });
            }
          });
          
          setMembers(transformedMembers);
        }
        
        toast.success(`Payment of ₹${amount} created successfully`);
      } else {
        toast.error(response.message || "Failed to create payment");
      }
    } catch (error: any) {
      console.error("Error creating payment:", error);
      toast.error(error.message || "Failed to create payment");
    }
  };

  // Add payment using API
  const handleAddPayment = async () => {
    if (!amount || !dateObj || !user?.id) return;
    
    try {
      setPaymentLoading(true);
      
      const response = await APIService.addMarriageCongratulationsInstallment({
        marriage_congratulations_id: String(user.id),
        amount: String(amount),
        date: formatDateForAPI(dateObj),
        note: note || "",
      });

      if (response.status) {
        const installmentsResponse = await APIService.getMarriageCongratulationsInstallments(String(user.id));
        if (installmentsResponse.status && installmentsResponse.data) {
          const mappedPayments = installmentsResponse.data.map((installment: InstallmentData) => ({
            amount: Number(installment.amount),
            createdAt: installment.date || installment.created_at,
            note: installment.note || "",
          }));
          setPayments(mappedPayments);
        }
        
        // Reset form
        setAmount("");
        setDateObj(undefined);
        setDateValue("");
        setNote("");
        
        toast.success("Payment added successfully");
      } else {
        toast.error(response.message || "Failed to add payment");
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
      (member.formNumber && member.formNumber.toLowerCase().includes(term)) ||
      (member.category && member.category.toLowerCase().includes(term))
    );
  };

  // Helper function to get members by category
  const getMembersByCategory = (category: string) => {
    return members.filter(member => member.category === category);
  };

  // Category to amount mapping from this marriage batch rates
  const categoryAmountMapping = user
    ? {
        A: Number(user.rate100) || 0,
        B: Number(user.rate200) || 0,
        C: Number(user.rate300) || 0,
      }
    : { A: 0, B: 0, C: 0 };

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
          Add Payment Details for General Marriage Congratulations Payment
          <span className="block text-base font-normal text-gray-700">
            विवाह बधाई के लिए भुगतान विवरण जोड़ें
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
                <TableHead>Marriage Number<br /><span className="text-xs text-gray-600">विवाह संख्या</span></TableHead>
                <TableCell>{user.marriageNumber}</TableCell>
                <TableHead>Date<br /><span className="text-xs text-gray-600">तिथि</span></TableHead>
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
                <TableHead>Membership Join Date<br /><span className="text-xs text-gray-600">सदस्यता तिथि</span></TableHead>
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

      {/* Member Payment List Sections by Category */}
      {Object.entries(categoryAmountMapping).map(([category, categoryAmount]) => {
        const amount = Number(categoryAmount);
        if (amount <= 0) return null;
        const searchState = category === "A" ? search100 : category === "B" ? search200 : search300;
        const setSearchState = category === "A" ? setSearch100 : category === "B" ? setSearch200 : setSearch300;
        const categoryMembers = getMembersByCategory(category);
        const filteredMembers = filterMembersBySearch(categoryMembers.filter(m => m.payment_status === 0), searchState);
        
        return (
          <Card className="w-full mb-6" key={category}>
            <CardHeader>
              <CardTitle>
                Pay ₹{amount} Members - Category {category}
                {membersLoading && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search Input */}
              <div className="mb-4">
                <Label htmlFor={`search-${category}`}>Search Members / सदस्य खोजें</Label>
                <Input
                  id={`search-${category}`}
                  type="text"
                  placeholder={`Search by name, form number, or category...`}
                  value={searchState}
                  onChange={(e) => setSearchState(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <PaginatedMembersTable
                members={filteredMembers}
                amount={amount}
                category={category}
                loading={membersLoading}
                searchTerm={searchState}
                onPay={handleMemberPay}
              />
              
              {/* Search Results Summary */}
              {searchState && (
                <div className="mt-2 text-sm text-gray-600">
                  Showing {filteredMembers.length} of {categoryMembers.filter(m => m.payment_status === 0).length} available Category {category} members
                </div>
              )}
              
              {/* Category Summary */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  Category {category} Summary: {categoryMembers.filter(m => m.payment_status === 0).length} pending, {categoryMembers.filter(m => m.payment_status === 1).length} paid
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Summary Table */}
      <Card className="w-full">
        
        <CardHeader>
          <CardTitle>
            Payment Summary <span className="text-sm font-normal text-gray-600">/ भुगतान सारांश</span>
            {paymentSummaryLoading && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}

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
                  ₹{paymentSummary.reduce((sum: number, payment: any) => sum + Number(payment.amount || payment.paid_amount || 0), 0)}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">Average Amount</div>
                <div className="text-2xl font-bold text-purple-800">
                  ₹{paymentSummary.length > 0 ? Math.round(paymentSummary.reduce((sum: number, payment: any) => sum + Number(payment.amount || payment.paid_amount || 0), 0) / paymentSummary.length) : 0}
                </div>
              </div>
            </div>
          )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <PaginatedTableSection
            data={paymentSummary}
            loading={paymentSummaryLoading}
            loadingMessage="Loading payment summary..."
            emptyMessage="No payment summary available."
          >
            {(paginatedSummary) => (
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Form Number</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Paid Amount</TableHead>
                    <TableHead>Payment Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSummary.map((payment: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{payment.member_name || payment.applicantName || "-"}</TableCell>
                      <TableCell>{payment.form_number || payment.formNumber || "-"}</TableCell>
                      <TableCell>{payment.category || "-"}</TableCell>
                      <TableCell className="font-bold">₹{payment.amount || payment.paid_amount || "0"}</TableCell>
                      <TableCell>{payment.payment_date || payment.date ? formatDate(payment.payment_date || payment.date) : "-"}</TableCell>
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