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
import { CalendarDays, Trash2 } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

import { formatBilingual } from '@/lib/translations'
import APIService from '@/lib/services'
import { formatDate, formatDateForAPI, getCurrentUserInfo } from '@/lib/utils'
import { PaginatedTableSection } from "@/components/paginated-table-section"
import ConfigService from "@/lib/config-service"

type Payment = {
  amount: number;
  createdAt: string;
  note?: string;
};

type Member = {
  id: number;
  name: string;
  formNumber?: string;
  payment_status?: number;
  category?: string;
  payments: Payment[];
};

// Type based on the API response structure
type MayraCongratulationsData = {
  id: number;
  mayra_id : string ;
  date: string;
  codeNumber: string;
  mayraNumber: string;
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
  mayra_id: number;
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

export default function AddMayraCongratulationsPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  // State for user data
  const [user, setUser] = useState<MayraCongratulationsData | null>(null);
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

        // Fetch all mayra congratulations data
        const response = await APIService.getMayraCongratulations();

        if (response.status && response.data) {
          // Find the specific user by ID
          const userData = response.data.find((item: MayraCongratulationsData) =>
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
        console.log("Fetching payment installments for mayra ID:", user.mayra_id);

        const response = await APIService.getMayraInstallments(user.mayra_id);

        console.log("Mayra Installments API Response:", response);

        if (response.status && response.data) {
          // Map API response to our Payment type
          const mappedPayments = response.data.map((installment: InstallmentData) => ({
            amount: Number(installment.amount),
            createdAt: installment.date || installment.created_at,
            note: installment.note || '',
          }));
          setPayments(mappedPayments);
        } else {
          console.warn("No mayra installments data or API error:", response.message);
          setPayments([]);
        }
      } catch (error: any) {
        console.error("Error fetching mayra installments:", error);
        const errorMessage = error.message || "Failed to fetch mayra installments";
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

        const response = await APIService.getMayraPreviousMembers(user.mayra_id || '');

        if (response.status && response.categories) {
          const transformedMembers: Member[] = [];

          Object.keys(response.categories).forEach(category => {
            const categoryData = response.categories[category];
            if (categoryData.members && Array.isArray(categoryData.members)) {
              categoryData.members.forEach((member: APIMember) => {
                transformedMembers.push({
                  id: member.id,
                  name: member.applicantName,
                  formNumber: member.formNumber,
                  payment_status: member.payment_status,
                  category: member.category,
                  payments: []
                });
              });
            }
          });

          setMembers(transformedMembers);
        } else {
          setMembers([]);
        }
      } catch (error: any) {
        console.error("Error fetching members data:", error);
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

        const response = await APIService.getMayraCongratulationsPayment(user.mayra_id);

        if (response.status && response.data) {
          setPaymentSummary(response.data);
        } else {
          setPaymentSummary([]);
        }
      } catch (error: any) {
        console.error("Error fetching payment summary:", error);
        setPaymentSummary([]);
      } finally {
        setPaymentSummaryLoading(false);
      }
    };

    fetchPaymentSummary();
  }, [user?.id]);

  const handleMemberPay = async (memberId: number, amount: number, category: string) => {
    if (!user?.id) {
      toast.error("User data not available");
      return;
    }

    try {
      const { addedby, addedby_id } = getCurrentUserInfo();

      const response = await APIService.createMayraCongratulationsPayment({
        mayra_congratulations_id : String(user.id),
        mayra_id: user.mayra_id,
        application_id: String(memberId),
        amount: amount,
        category: category,
        addedby: addedby,
        addedby_id: String(addedby_id)
      });

      if (response.status) {
        // Update local member state
        setMembers((prev) =>
          prev.map((m) =>
            (String(m.id) === String(memberId)) && m.payment_status === 0
              ? {
                  ...m,
                  payment_status: 1,
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
        const summaryResponse = await APIService.getMayraCongratulationsPayment(user.mayra_id);
        if (summaryResponse.status && summaryResponse.data) {
          setPaymentSummary(summaryResponse.data);
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

  const handleDeletePayment = async (paymentId: number) => {
    try {
      const response = await APIService.deleteMayraCongratulationsPayment(paymentId);
      if (response.status) {
        toast.success("Payment deleted successfully");
        // Refresh payment summary
        const summaryResponse = await APIService.getMayraCongratulationsPayment(user!.mayra_id);
        if (summaryResponse.status && summaryResponse.data) {
          setPaymentSummary(summaryResponse.data);
        }

        // Refresh members data to reset payment status
        const membersResponse = await APIService.getMayraPreviousMembers(user!.mayra_id || '');
        if (membersResponse.status && membersResponse.categories) {
          const transformedMembers: Member[] = [];
          Object.keys(membersResponse.categories).forEach(category => {
            const categoryData = membersResponse.categories[category];
            if (categoryData.members && Array.isArray(categoryData.members)) {
              categoryData.members.forEach((member: APIMember) => {
                transformedMembers.push({
                  id: member.id,
                  name: member.applicantName,
                  formNumber: member.formNumber,
                  payment_status: member.payment_status,
                  category: member.category,
                  payments: []
                });
              });
            }
          });
          setMembers(transformedMembers);
        }
      } else {
        toast.error(response.message || "Failed to delete payment");
      }
    } catch (error: any) {
      console.error("Error deleting payment:", error);
      toast.error("Failed to delete payment");
    }
  };

  const handleAddPayment = async () => {
    if (!amount || !dateObj || !user?.id) return;

    try {
      setPaymentLoading(true);
      const { addedby, addedby_id } = getCurrentUserInfo();
      const payload = {
        mayra_id: user.mayra_id,
        amount: String(amount),
        date: formatDateForAPI(dateObj),
        note: note || "",
        addedby: addedby,
        addedby_id: String(addedby_id)
      };

      const response = await APIService.addMayraInstallment(payload);

      if (response.status) {
        const newPayment = {
          amount: Number(amount),
          createdAt: formatDateForAPI(dateObj),
          note: note || "",
        };
        setPayments([...payments, newPayment]);
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

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const fee = user ? Number(user.permanentFee) : 0;
  const pending = Math.max(fee - totalPaid, 0);

  const filterMembersBySearch = (members: Member[], searchTerm: string) => {
    if (!searchTerm.trim()) return members;
    const term = searchTerm.toLowerCase();
    return members.filter(member =>
      member.name.toLowerCase().includes(term) ||
      (member.formNumber && member.formNumber.toLowerCase().includes(term))
    );
  };

  const getMembersByCategory = (category: string) => {
    return members.filter(member => member.category === category);
  };

  // Dynamically resolve category amount mapping from active age slabs / configured scheme types
  const categoryAmountMapping = React.useMemo(() => {
    const slabs = ConfigService.getAgeSlabsSync();
    const mapping: Record<string, number> = {};
    slabs.forEach((slab) => {
      mapping[slab.code] = slab.fee;
    });
    // Ensure existing member categories have mapping
    members.forEach((m) => {
      if (m.category && !(m.category in mapping)) {
        mapping[m.category] = m.category === "B" ? 200 : m.category === "C" ? 300 : 0;
      }
    });
    return mapping;
  }, [members]);

  if (loading) {
    return (
      <div className="p-4 w-full">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading user data...</div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-4 w-full">
        <div className="flex items-center mb-6 gap-4">
          <Button variant="outline" onClick={() => router.back()} className="px-3 py-1">←</Button>
          <h1 className="text-2xl font-bold text-gray-900">Error Loading User Data</h1>
        </div>
        <Card className="w-full">
          <CardContent className="p-6">
            <div className="text-center text-red-600">{error || "User not found"}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 w-full">
      <div className="flex items-center mb-6 gap-4">
        <Button variant="outline" onClick={() => router.back()} className="px-3 py-1">←</Button>
        <h1 className="text-2xl font-bold text-gray-900">
          Add Payment Details for Mayra Congratulations Payment
          <span className="block text-base font-normal text-gray-700">मायरा बधाई के लिए भुगतान विवरण जोड़ें</span>
        </h1>
      </div>

      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>User Details <span className="text-sm font-normal text-gray-600">/ उपयोगकर्ता विवरण</span></CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="w-full">
            <TableBody>
              <TableRow>
                <TableHead>Mayra Number<br /><span className="text-xs text-gray-600">मायरा संख्या</span></TableHead>
                <TableCell>{user.mayraNumber}</TableCell>
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
                <TableHead>Address<br /><span className="text-xs text-gray-600">गांव</span></TableHead>
                <TableCell>{user.address}</TableCell>
                <TableHead>Gender<br /><span className="text-xs text-gray-600">लिंग</span></TableHead>
                <TableCell className="capitalize">{user.gender}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Permanent Fee<br /><span className="text-xs text-gray-600">स्थायी शुल्क</span></TableHead>
                <TableCell>₹{user.permanentFee}</TableCell>
                <TableHead>Installment Amount<br /><span className="text-xs text-gray-600">किस्त राशि</span></TableHead>
                <TableCell>₹{user.installmentAmount}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Total Paid Amount<br /><span className="text-xs text-gray-600">कुल भुगतान राशि</span></TableHead>
                <TableCell>₹{user.totalPaidAmount}</TableCell>
                <TableHead>Pending Amount<br /><span className="text-xs text-gray-600">बकाया राशि</span></TableHead>
                <TableCell className={pending > 0 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>₹{pending}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Payment Form */}
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Add New Payment <span className="text-sm font-normal text-gray-600">/ नया भुगतान जोड़ें</span></CardTitle>
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
                  <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={paymentLoading}>
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
              <Button onClick={handleAddPayment} disabled={!amount || !dateObj || paymentLoading} className="w-full">
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
                    <TableCell colSpan={2} className="font-bold">₹{totalPaid}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </PaginatedTableSection>
        </CardContent>
      </Card>

      {/* Member Payment List Sections by Category */}
      {Object.entries(categoryAmountMapping).map(([category, amount]) => {
        const searchState = amount === 200 ? search200 : search300;
        const setSearchState = amount === 200 ? setSearch200 : setSearch300;
        const categoryMembers = getMembersByCategory(category);
        const filteredMembers = filterMembersBySearch(categoryMembers.filter(m => m.payment_status === 0), searchState);

        return (
          <Card className="w-full mb-6" key={category}>
            <CardHeader>
              <CardTitle>Pay ₹{amount} Members - Category {category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor={`search-${category}`}>Search Members / सदस्य खोजें</Label>
                <Input
                  id={`search-${category}`}
                  type="text"
                  placeholder={`Search by name or form number...`}
                  value={searchState}
                  onChange={(e) => setSearchState(e.target.value)}
                  className="mt-1"
                />
              </div>
              <PaginatedTableSection
                data={filteredMembers}
                loading={membersLoading}
                emptyMessage="No pending members."
                resetKey={`${category}-${searchState}`}
              >
                {(paginatedMembers) => (
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member Name</TableHead>
                        <TableHead>Form Number</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>{member.name}</TableCell>
                          <TableCell>{member.formNumber || "-"}</TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => handleMemberPay(member.id, amount, category)}>Pay ₹{amount}</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </PaginatedTableSection>
            </CardContent>
          </Card>
        );
      })}

      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            Payment Summary <span className="text-sm font-normal text-gray-600">/ भुगतान सारांश</span>
            {paymentSummaryLoading && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}
          </CardTitle>

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
                  ₹{paymentSummary.reduce((sum, ps) => sum + Number(ps.amount || 0), 0)}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">Average Amount</div>
                <div className="text-2xl font-bold text-purple-800">
                  ₹{paymentSummary.length > 0 ? Math.round(paymentSummary.reduce((sum, ps) => sum + Number(ps.amount || 0), 0) / paymentSummary.length) : 0}
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <PaginatedTableSection
            data={paymentSummary}
            loading={paymentSummaryLoading}
            loadingMessage="Loading summary..."
            emptyMessage="No summary data."
          >
            {(paginatedSummary) => (
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant Name</TableHead>
                    <TableHead>Form Number</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSummary.map((ps) => (
                    <TableRow key={ps.id}>
                      <TableCell>{ps.applicantName}</TableCell>
                      <TableCell>{ps.formNumber}</TableCell>
                      <TableCell>₹{ps.amount}</TableCell>
                      <TableCell>{ps.category}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleDeletePayment(ps.id)} className="text-red-600">
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
