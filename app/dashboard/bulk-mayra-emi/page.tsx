"use client";

import { useState, useEffect } from "react";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleGuard } from "@/components/role-guard";
import { RazorpayPayment } from "@/components/razorpay-payment";
import { formatDate, getCurrentUserInfo } from "@/lib/utils";
import {
  Search,
  Filter,
  Download,
  User,
  Users,
  FileText,
  Send,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import {
  sendWhatsAppMessage,
  sendWhatsAppFile,
} from "@/lib/fireconnect-whatsapp-service";
import { post } from "@/lib/api";

interface Application {
  id: number;
  formNumber: string;
  fatherName: string;
  gotra: string;
  category: string;
  address: string;
  applicationDate: string;
  applicantName: string;
  gender: string;
  emiAmount?: number;
  mobile?: string;
}

interface Mayra {
  mayraNumber: string;
  applicantName: string;
  fatherName: string;
  date: string;
  payment_status: number;
  filter_payment_status?: number;
  id: any;
  village: any;
  tehsil?: any;
  pdf_created?: number;
}

interface ApiResponse {
  success: boolean;
  mayra_application: Application[];
  mayras: Mayra[];
}

interface MayraRecord {
  id: any;
  mayraNumber: string;
  mayraUserName: string;
  mayraUserFatherName: string;
  dateOfMayra: string;
  userId: string;
  emiAmount: any;
  emiStatus: string;
  selected?: boolean;
  filter_row_id?: any;
  pdf_created?: number;
  tehsil?: any;
}

const convertToYYYYMMDD = (date: Date | null): string => {
  if (!date) return "";
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function BulkMayraEMIPage() {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [userId, setUserId] = useState("");
  const [filteredMayraRecords, setFilteredMayraRecords] = useState<
    MayraRecord[]
  >([]);
  const [completedMayraRecords, setCompletedMayraRecords] = useState<
    MayraRecord[]
  >([]);
  const [filteredUserDetails, setFilteredUserDetails] = useState<Application[]>(
    [],
  );
  const [selectedMayraRecords, setSelectedMayraRecords] = useState<string[]>(
    [],
  );
  const [selectedCompletedMayraRecords, setSelectedCompletedMayraRecords] =
    useState<string[]>([]);
  const [showUserData, setShowUserData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [paymentMode, setPaymentMode] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "paid" | "failed"
  >("pending");
  const [paymentData, setPaymentData] = useState<any>(null);

  const pendingColumns = [
    {
      key: "selected",
      label: "चयन करें / Select",
      render: (value: boolean, record: MayraRecord) => (
        <Checkbox
          checked={selectedMayraRecords.includes(record.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedMayraRecords([...selectedMayraRecords, record.id]);
            } else {
              setSelectedMayraRecords(
                selectedMayraRecords.filter((id) => id !== record.id),
              );
            }
          }}
        />
      ),
    },
    { key: "mayraNumber", label: "मायरा संख्या / Mayra Number" },
    { key: "mayraUserName", label: "आवेदक का नाम / Applicant Name" },
    { key: "mayraUserFatherName", label: "पिता का नाम / Father Name" },
    {
      key: "dateOfMayra",
      label: "मायरा की तारीख / Date of Mayra",
      render: (value: string) =>
        value ? formatDate(value) : "N/A",
    },
    {
      key: "emiStatus",
      label: "ईएमआई स्थिति / EMI Status",
      render: (value: string) => {
        const statusColors = {
          Active: "bg-green-100 text-green-800",
          Pending: "bg-yellow-100 text-yellow-800",
          Completed: "bg-blue-100 text-blue-800",
          Defaulted: "bg-red-100 text-red-800",
        };
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[value as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}`}
          >
            {value}
          </span>
        );
      },
    },
  ];

  const completedColumns = [
    {
      key: "selected",
      label: "चयन करें / Select",
      render: (value: boolean, record: MayraRecord) => (
        <Checkbox
          checked={selectedCompletedMayraRecords.includes(record.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedCompletedMayraRecords([
                ...selectedCompletedMayraRecords,
                record.id,
              ]);
            } else {
              setSelectedCompletedMayraRecords(
                selectedCompletedMayraRecords.filter((id) => id !== record.id),
              );
            }
          }}
        />
      ),
    },
    { key: "mayraNumber", label: "मायरा संख्या / Mayra Number" },
    { key: "mayraUserName", label: "आवेदक का नाम / Applicant Name" },
    { key: "mayraUserFatherName", label: "पिता का नाम / Father Name" },
    {
      key: "dateOfMayra",
      label: "मायरा की तारीख / Date of Mayra",
      render: (value: string) =>
        value ? formatDate(value) : "N/A",
    },
    {
      key: "emiStatus",
      label: "ईएमआई स्थिति / EMI Status",
      render: (value: string) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {value}
        </span>
      ),
    },
    {
      key: "pdf_created",
      label: "पीडीएफ स्थिति / PDF Status",
      render: (value: number) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${value === 1 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
        >
          {value === 1 ? "Generated" : "Not Generated"}
        </span>
      ),
    },
  ];

  const fetchBulkData = async () => {
    if (!userId.trim()) {
      toast.error("Please enter a User ID to fetch data");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("userId", userId.trim());
      if (startDate) formData.append("fromDate", convertToYYYYMMDD(startDate));
      if (endDate) formData.append("toDate", convertToYYYYMMDD(endDate));

      const response = await post(
        "?apicall=getMayraBulkData",
        formData,
      );

      const data = response.data;

      if (data.status || data.success) {
        const transformedMayras: MayraRecord[] = (
          data.mayras ||
          data.data ||
          []
        ).map((m: any) => ({
          id: m.id,
          mayraNumber: m.mayraNumber,
          mayraUserName: m.applicantName,
          mayraUserFatherName: m.fatherName,
          dateOfMayra: m.date,
          userId: userId.trim(),
          emiAmount: m.emiAmount || 0,
          emiStatus:
            m.filter_payment_status === 1 || m.payment_status === 1
              ? "Completed"
              : "Pending",
          selected: false,
          filter_row_id: m.filter_row_id || m.id,
          pdf_created: m.pdf_created || 0,
          tehsil: m.tehsil || m.village,
        }));

        setFilteredMayraRecords(
          transformedMayras.filter((m) => m.emiStatus !== "Completed"),
        );
        setCompletedMayraRecords(
          transformedMayras.filter((m) => m.emiStatus === "Completed"),
        );
        setFilteredUserDetails(data.mayra_application || []);
        setShowUserData(true);
      } else {
        toast.error("No data found for the entered criteria");
        setShowUserData(false);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setUserId("");
    setFilteredMayraRecords([]);
    setCompletedMayraRecords([]);
    setFilteredUserDetails([]);
    setSelectedMayraRecords([]);
    setSelectedCompletedMayraRecords([]);
    setShowUserData(false);
    setPaymentMode("");
    setPaymentStatus("pending");
    setPaymentData(null);
  };

  const selectAllMayraRecords = (checked: boolean) => {
    if (checked) {
      setSelectedMayraRecords(filteredMayraRecords.map((r) => r.id));
    } else {
      setSelectedMayraRecords([]);
    }
  };

  const selectAllCompletedMayraRecords = (checked: boolean) => {
    if (checked) {
      setSelectedCompletedMayraRecords(completedMayraRecords.map((r) => r.id));
    } else {
      setSelectedCompletedMayraRecords([]);
    }
  };

  const calculateTotalAmount = () => {
    return filteredMayraRecords
      .filter((r) => selectedMayraRecords.includes(r.id))
      .reduce((sum, r) => sum + (Number(r.emiAmount) || 0), 0);
  };

  const handlePaymentSuccess = (data: any) => {
    setPaymentStatus("paid");
    setPaymentData(data);
  };

  const handlePaymentError = (error: any) => {
    setPaymentStatus("failed");
    setPaymentData(null);
    console.error("Payment error:", error);
  };

  const handleSubmit = async () => {
    if (selectedMayraRecords.length === 0) {
      toast.error("Please select at least one record to submit");
      return;
    }
    if (!paymentMode) {
      toast.error("Please select a payment mode");
      return;
    }
    if (paymentMode === "razorpay" && paymentStatus !== "paid") {
      toast.error("Please complete the Razorpay payment first");
      return;
    }

    setSubmitting(true);
    try {
      const selectedRecords = filteredMayraRecords.filter((r) =>
        selectedMayraRecords.includes(r.id),
      );
      const { addedby, addedby_id } = getCurrentUserInfo();

      const apiData = {
        mayra_id: filteredUserDetails[0]?.id,
        payment_mode: paymentMode,
        payment_data: paymentMode === "razorpay" ? paymentData : null,
        data: selectedRecords.map((r) => ({
          id: r.id,
          pay_in_mayra_payment_status: 1,
          addedby: addedby,
          addedby_id: addedby_id,
        })),
      };

      const response = await post(
        "?apicall=updateMayraStatus",
        apiData,
      );

      const result = response.data;
      if (result.status) {
        toast.success("Payment status updated successfully");
        await fetchBulkData();
        setSelectedMayraRecords([]);
        setPaymentMode("");
        setPaymentStatus("pending");
        setPaymentData(null);
      } else {
        toast.error(result.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeneratePDF = async (
    source: "pending" | "completed" = "pending",
  ) => {
    const selectedIds =
      source === "pending"
        ? selectedMayraRecords
        : selectedCompletedMayraRecords;
    if (selectedIds.length === 0) {
      toast.error("Please select records to generate PDF");
      return;
    }

    setGeneratingPDF(true);
    try {
      const list =
        source === "pending" ? filteredMayraRecords : completedMayraRecords;
      const selectedRecords = list.filter((r) => selectedIds.includes(r.id));
      const user = filteredUserDetails[0];

      const pdfData = {
        userId: userId,
        applicantName: user?.applicantName || "",
        fatherName: user?.fatherName || "",
        gotra: user?.gotra || "",
        address: user?.address || "",
        emiAmount: user?.emiAmount ?? selectedRecords[0]?.emiAmount ?? "",
        records: selectedRecords.map((r) => ({
          mayraNumber: r.mayraNumber,
          applicantName: r.mayraUserName,
          fatherName: r.mayraUserFatherName,
          date: r.dateOfMayra,
          emiAmount: r.emiAmount,
          village: r.tehsil || user?.address?.split(",")[0]?.trim() || "",
        })),
      };

      const response = await fetch("/api/generate-bulk-mayra-emi-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: pdfData }),
      });

      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bulk_mayra_emi_${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      const recordIds = selectedRecords.map((r) => r.filter_row_id || r.id);
      await post(
        "?apicall=updateMayraPdfStatus",
        { ids: recordIds },
      );

      toast.success("PDF generated successfully");

      if (user?.mobile) {
        const message = `नमस्ते ${user.applicantName},\n\nपुरबिया प्रजापति बालिका विवाह & सशक्तिकरण फाउण्डेशन मे मायरा योजना के तहत सहयोग (अनुदान)राशी देने के लिए आपका आभार \nअपनी रसीद प्राप्त करे`;
        await sendWhatsAppMessage(user.mobile, message);
        const file = new File([blob], "receipt.pdf", {
          type: "application/pdf",
        });
        await sendWhatsAppFile(user.mobile, file, "Mayra Receipt");
      }

      await fetchBulkData();
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <RoleGuard requiredModule="bulk_mayra_emi" requiredAction="view">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Receipt className="h-8 w-8 text-[#0B4A8F]" />
              बल्क मायरा ईएमआई / Bulk Mayra EMI
            </h1>
            <p className="text-muted-foreground">
              Manage and view bulk Mayra EMI records
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              फिल्टर / Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>प्रारंभ तिथि / Start Date</Label>
                <DatePicker
                  id="start-date"
                  value={startDate ? formatDate(startDate) : ""}
                  onChange={setStartDate}
                  placeholder="dd-mm-yyyy"
                />
              </div>
              <div className="space-y-2">
                <Label>समाप्ति तिथि / End Date</Label>
                <DatePicker
                  id="end-date"
                  value={endDate ? formatDate(endDate) : ""}
                  onChange={setEndDate}
                  placeholder="dd-mm-yyyy"
                />
              </div>
              <div className="space-y-2">
                <Label>उपयोगकर्ता आईडी / User ID</Label>
                <Input
                  placeholder="Enter user ID, form number, or father name"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                onClick={fetchBulkData}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                {loading ? "Fetching..." : "Fetch Data"}
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {showUserData && filteredUserDetails.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                उपयोगकर्ता विवरण / User Details ({
                  filteredUserDetails.length
                }{" "}
                users found)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredUserDetails.map((user, index) => (
                <div key={user.id} className="space-y-6">
                  {index > 0 && <div className="border-t pt-6" />}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">
                        आवेदक का नाम
                      </Label>
                      <p className="font-medium">{user.applicantName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">
                        फॉर्म संख्या
                      </Label>
                      <p className="font-medium">{user.formNumber}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">
                        पिता का नाम
                      </Label>
                      <p className="font-medium">{user.fatherName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">
                        मोबाइल
                      </Label>
                      <p className="font-medium">{user.mobile}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">
                        गोत्र
                      </Label>
                      <p className="font-medium">{user.gotra}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">
                        पता
                      </Label>
                      <p className="font-medium">{user.address}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">
                        ईएमआई राशि
                      </Label>
                      <p className="font-medium">
                        ₹{user.emiAmount?.toLocaleString("hi-IN")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {showUserData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  मायरा रिकॉर्ड्स / Mayra Records ({
                    filteredMayraRecords.length
                  }{" "}
                  records found)
                </span>
                {filteredMayraRecords.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={
                          filteredMayraRecords.length > 0 &&
                          selectedMayraRecords.length ===
                            filteredMayraRecords.length
                        }
                        onCheckedChange={selectAllMayraRecords}
                      />
                      <span className="text-sm text-muted-foreground">
                        Select All
                      </span>
                    </div>
                    <Button
                      onClick={() => handleGeneratePDF("pending")}
                      disabled={
                        generatingPDF || selectedMayraRecords.length === 0
                      }
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {generatingPDF ? "Generating..." : "Generate PDF"}
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={filteredMayraRecords}
                columns={pendingColumns}
                searchFields={[
                  "mayraNumber",
                  "mayraUserName",
                  "mayraUserFatherName",
                ]}
                showActionsColumn={false}
                showAddButton={false}
                addNewUrl=""
                addNewLabel=""
                editUrlPattern=""
                onDelete={() => {}}
                title=""
              />

              {selectedMayraRecords.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-4 border">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Select Payment Mode *
                    </Label>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                      <SelectTrigger className="w-full max-w-md">
                        <SelectValue placeholder="Select Payment Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" /> नकद / Cash
                          </div>
                        </SelectItem>
                        <SelectItem value="razorpay">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" /> राज़रपे /
                            Razorpay
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentMode === "razorpay" && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Online Payment</h3>
                        <p className="text-sm">
                          Pay ₹{calculateTotalAmount().toLocaleString("hi-IN")}{" "}
                          securely
                        </p>
                        {paymentStatus === "paid" && (
                          <p className="text-xs text-green-600 font-bold mt-1">
                            ✓ Verified
                          </p>
                        )}
                      </div>
                      <RazorpayPayment
                        amount={calculateTotalAmount()}
                        description={`Mayra EMI Payment - ${filteredUserDetails[0]?.applicantName}`}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                        disabled={submitting}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {paymentStatus === "paid"
                          ? "Paid"
                          : `Pay ₹${calculateTotalAmount().toLocaleString("hi-IN")}`}
                      </RazorpayPayment>
                    </div>
                  )}

                  <div className="flex justify-center pt-2">
                    <Button
                      onClick={handleSubmit}
                      disabled={
                        submitting ||
                        !paymentMode ||
                        (paymentMode === "razorpay" && paymentStatus !== "paid")
                      }
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {submitting
                        ? "Submitting..."
                        : `Submit Selected (${selectedMayraRecords.length})`}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {showUserData && completedMayraRecords.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  पूर्ण मायरा रिकॉर्ड्स / Completed Mayra Records (
                  {completedMayraRecords.length} records)
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={
                        completedMayraRecords.length > 0 &&
                        selectedCompletedMayraRecords.length ===
                          completedMayraRecords.length
                      }
                      onCheckedChange={selectAllCompletedMayraRecords}
                    />
                    <span className="text-sm text-muted-foreground">
                      Select All
                    </span>
                  </div>
                  <Button
                    onClick={() => handleGeneratePDF("completed")}
                    disabled={
                      generatingPDF ||
                      selectedCompletedMayraRecords.length === 0
                    }
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate PDF ({selectedCompletedMayraRecords.length})
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={completedMayraRecords}
                columns={completedColumns}
                searchFields={[
                  "mayraNumber",
                  "mayraUserName",
                  "mayraUserFatherName",
                ]}
                showActionsColumn={false}
                showAddButton={false}
                addNewUrl=""
                addNewLabel=""
                editUrlPattern=""
                onDelete={() => {}}
                title=""
              />
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGuard>
  );
}
