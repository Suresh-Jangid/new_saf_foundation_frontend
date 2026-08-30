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
  Shield,
  User,
  Users,
  FileText,
  Send,
  CreditCard,
  Banknote,
  Smartphone,
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
  phone?: string;
}

interface BimaYojana {
  id: number;
  bimaNumber: string;
  applicantName: string;
  fatherName: string;
  date: string;
  payment_status?: number;
  insuranceApplication_id: number;
  gender: string;
  emiAmount: string | number;
  filter_payment_status?: number;
  filter_row_id?: any;
  pdf_created?: number;
  tehsil?: string;
}

interface ApiResponse {
  success: boolean;
  applications: Application[];
  bimaEmis?: BimaYojana[];
  bimaYojana?: BimaYojana[];
  bimaYojanas?: BimaYojana[];
}

interface SurakshaBimaRecord {
  id: string;
  surakshaBimaNumber: string;
  surakshaBimaUserName: string;
  surakshaBimaUserFatherName: string;
  dateOfSurakshaBima: string;
  userId: string;
  emiAmount: any;
  emiStatus: string;
  selected?: boolean;
  filter_payment_status?: number;
  filter_row_id?: any;
  pdf_created?: number;
  village?: string;
  tehsil?: string;
}

const convertToYYYYMMDD = (date: Date | null): string => {
  if (!date) return "";

  if (isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function BulkSurakshaBimaEMIPage() {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [userId, setUserId] = useState("");
  const [filteredSurakshaBimaRecords, setFilteredSurakshaBimaRecords] =
    useState<SurakshaBimaRecord[]>([]);
  const [filteredUserDetails, setFilteredUserDetails] = useState<Application[]>(
    [],
  );
  const [selectedSurakshaBimaRecords, setSelectedSurakshaBimaRecords] =
    useState<string[]>([]);
  const [
    selectedCompletedSurakshaBimaRecords,
    setSelectedCompletedSurakshaBimaRecords,
  ] = useState<string[]>([]);
  const [showUserData, setShowUserData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [completedSurakshaBimaRecords, setCompletedSurakshaBimaRecords] =
    useState<SurakshaBimaRecord[]>([]);
  const [paymentMode, setPaymentMode] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "paid" | "failed"
  >("pending");
  const [paymentData, setPaymentData] = useState<any>(null);

  const surakshaBimaColumns = [
    {
      key: "selected",
      label: "चयन करें / Select",
      render: (value: boolean, record: SurakshaBimaRecord) => (
        <Checkbox
          checked={selectedSurakshaBimaRecords.includes(record.id)}
          disabled={record.filter_payment_status === 1}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedSurakshaBimaRecords([
                ...selectedSurakshaBimaRecords,
                record.id,
              ]);
            } else {
              setSelectedSurakshaBimaRecords(
                selectedSurakshaBimaRecords.filter((id) => id !== record.id),
              );
            }
          }}
        />
      ),
    },
    {
      key: "surakshaBimaNumber",
      label: "सुरक्षा बीमा संख्या / Suraksha Bima Number",
    },
    {
      key: "surakshaBimaUserName",
      label: "सुरक्षा बीमा उपयोगकर्ता नाम / Suraksha Bima User Name",
    },
    {
      key: "surakshaBimaUserFatherName",
      label:
        "सुरक्षा बीमा उपयोगकर्ता पिता का नाम / Suraksha Bima User Father Name",
    },
    {
      key: "dateOfSurakshaBima",
      label: "सुरक्षा बीमा की तारीख / Date of Suraksha Bima",
      render: (value: string) => formatDate(value),
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
      render: (value: boolean, record: SurakshaBimaRecord) => (
        <Checkbox
          checked={selectedCompletedSurakshaBimaRecords.includes(record.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedCompletedSurakshaBimaRecords([
                ...selectedCompletedSurakshaBimaRecords,
                record.id,
              ]);
            } else {
              setSelectedCompletedSurakshaBimaRecords(
                selectedCompletedSurakshaBimaRecords.filter(
                  (id) => id !== record.id,
                ),
              );
            }
          }}
        />
      ),
    },
    {
      key: "surakshaBimaNumber",
      label: "सुरक्षा बीमा संख्या / Suraksha Bima Number",
    },
    {
      key: "surakshaBimaUserName",
      label: "सुरक्षा बीमा उपयोगकर्ता नाम / Suraksha Bima User Name",
    },
    {
      key: "surakshaBimaUserFatherName",
      label:
        "सुरक्षा बीमा उपयोगकर्ता पिता का नाम / Suraksha Bima User Father Name",
    },
    {
      key: "dateOfSurakshaBima",
      label: "सुरक्षा बीमा की तारीख / Date of Suraksha Bima",
      render: (value: string) => formatDate(value),
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
    {
      key: "pdf_created",
      label: "पीडीएफ निर्माण स्थिति / PDF Generation Status",
      render: (value: number, record: SurakshaBimaRecord) => {
        const pdfStatus =
          record.pdf_created === 1 ? "Generated" : "Not Generated";
        const statusColors = {
          Generated: "bg-green-100 text-green-800",
          "Not Generated": "bg-gray-100 text-gray-800",
        };
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[pdfStatus as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}`}
          >
            {pdfStatus}
          </span>
        );
      },
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

      // Only append dates if they have values
      if (startDate) {
        const formattedStartDate = convertToYYYYMMDD(startDate);
        console.log("Start Date:", startDate, "Formatted:", formattedStartDate);
        formData.append("fromDate", formattedStartDate);
      }

      if (endDate) {
        const formattedEndDate = convertToYYYYMMDD(endDate);
        console.log("End Date:", endDate, "Formatted:", formattedEndDate);
        formData.append("toDate", formattedEndDate);
      }

      const response = await post(
        "?apicall=getInsuranceBulkData",
        formData,
      );

      const data: ApiResponse = response.data;

      if (data.success) {
        // Transform API data to match our existing structure (handle bimaEmis, bimaYojanas, and bimaYojana)
        const bimas =
          data.bimaEmis ?? data.bimaYojanas ?? data.bimaYojana ?? [];
        const transformedBimaYojana: SurakshaBimaRecord[] = bimas.map(
          (bima, index) => ({
            id: `bima-${bima.id}`,
            surakshaBimaNumber: bima.bimaNumber,
            surakshaBimaUserName: bima.applicantName,
            surakshaBimaUserFatherName: bima.fatherName,
            dateOfSurakshaBima: bima.date,
            userId: String(bima.insuranceApplication_id),
            emiAmount: parseFloat(String(bima.emiAmount)) || 0,
            emiStatus:
              bima.filter_payment_status === 1 ? "Completed" : "Pending",
            selected: false,
            filter_payment_status: bima.filter_payment_status,
            filter_row_id: bima.filter_row_id ?? bima.id,
            pdf_created: bima.pdf_created ?? 0,
            tehsil: bima.tehsil,
          }),
        );

        const pending = transformedBimaYojana.filter(
          (r: any) => r.filter_payment_status === 0,
        );
        const completed = transformedBimaYojana.filter(
          (r: any) => r.filter_payment_status === 1,
        );

        setFilteredSurakshaBimaRecords(pending);
        setCompletedSurakshaBimaRecords(completed);
        setFilteredUserDetails(data.applications);
        setSelectedCompletedSurakshaBimaRecords([]);
        setShowUserData(true);

        toast.success(
          `Found ${data.applications.length} application(s) and ${bimas.length} Suraksha Bima record(s)`,
        );
      } else {
        toast.error("No data found for the entered criteria");
        setFilteredSurakshaBimaRecords([]);
        setCompletedSurakshaBimaRecords([]);
        setFilteredUserDetails([]);
        setShowUserData(false);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error fetching data. Please try again.");
      setFilteredSurakshaBimaRecords([]);
      setFilteredUserDetails([]);
      setShowUserData(false);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setUserId("");
    setFilteredSurakshaBimaRecords([]);
    setCompletedSurakshaBimaRecords([]);
    setFilteredUserDetails([]);
    setSelectedSurakshaBimaRecords([]);
    setSelectedCompletedSurakshaBimaRecords([]);
    setShowUserData(false);
    setPaymentMode("");
    setPaymentStatus("pending");
    setPaymentData(null);
    toast.success("Filters cleared");
  };

  const selectAllSurakshaBimaRecords = (checked: boolean) => {
    if (checked) {
      // Only select records that are not completed (not disabled) - filter_payment_status !== 1
      const selectableRecords = filteredSurakshaBimaRecords.filter(
        (record) => record.filter_payment_status !== 1,
      );
      setSelectedSurakshaBimaRecords(
        selectableRecords.map((record) => record.id),
      );
    } else {
      setSelectedSurakshaBimaRecords([]);
    }
  };

  const selectAllCompletedSurakshaBimaRecords = (checked: boolean) => {
    if (checked) {
      setSelectedCompletedSurakshaBimaRecords(
        completedSurakshaBimaRecords.map((record) => record.id),
      );
    } else {
      setSelectedCompletedSurakshaBimaRecords([]);
    }
  };

  // Get Suraksha Bima records for a specific user
  const getSurakshaBimaRecordsForUser = (userId: string) => {
    return [
      ...filteredSurakshaBimaRecords,
      ...completedSurakshaBimaRecords,
    ].filter((record) => record.userId === userId);
  };

  // Calculate total payment amount for selected records
  const calculateTotalAmount = () => {
    const selectedRecords = filteredSurakshaBimaRecords.filter((record) =>
      selectedSurakshaBimaRecords.includes(record.id),
    );
    return selectedRecords.reduce(
      (total, record) => total + (record.emiAmount || 0),
      0,
    );
  };

  // Payment success handler
  const handlePaymentSuccess = (paymentData: any) => {
    setPaymentStatus("paid");
    setPaymentData(paymentData);
    toast.success("Payment completed successfully!");
  };

  // Payment error handler
  const handlePaymentError = (error: any) => {
    setPaymentStatus("failed");
    setPaymentData(null);
    console.error("Payment error:", error);
  };

  const handleSubmit = async () => {
    if (selectedSurakshaBimaRecords.length === 0) {
      toast.error("Please select at least one Suraksha Bima record to submit");
      return;
    }

    if (!filteredUserDetails.length) {
      toast.error("User details not found. Please fetch data first.");
      return;
    }

    if (!paymentMode) {
      toast.error("Please select a payment mode to complete the application");
      return;
    }

    // For Razorpay, check if payment is completed
    if (paymentMode === "razorpay" && paymentStatus !== "paid") {
      toast.error("Please complete the Razorpay payment before submitting");
      return;
    }

    // Prevent duplicate calls
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const selectedRecords = filteredSurakshaBimaRecords.filter((record) =>
        selectedSurakshaBimaRecords.includes(record.id),
      );

      // Get the application ID from user details (assuming all records belong to same application)
      const applicationId = filteredUserDetails[0].id;

      // Get current user info for addedby fields
      const { addedby, addedby_id } = getCurrentUserInfo();

      // Prepare data according to API requirements
      const apiData = {
        insurance_id: applicationId,
        addedby: addedby,
        addedby_id: addedby_id,
        payment_mode: paymentMode,
        payment_data: paymentMode === "razorpay" ? paymentData : null,
        data: selectedRecords.map((record) => ({
          id: record.filter_row_id,
          pay_in_insurance_payment_status: 1, // Setting to 1 as we're updating to paid status
        })),
      };

      console.log("Submitting payment status update:", apiData);

      // Call the updateInsurancePaymentStatus API
      const response = await post(
        "?apicall=updateBimaPaymentStatus",
        apiData,
      );

      const result = response.data;

      if (result.status) {
        const { bima_updated, bima_failed, details } = result;

        // Show single success toast
        toast.success(`Payment status updated successfully`);

        // Update local state for successfully updated records: move from pending to completed
        const updatedBimaNumbers = details
          .filter((detail: any) => detail.status === "updated")
          .map((detail: any) => detail.bimaNumber);

        const movedRecords = filteredSurakshaBimaRecords
          .filter((r) => updatedBimaNumbers.includes(r.surakshaBimaNumber))
          .map((r) => ({
            ...r,
            emiStatus: "Completed",
            filter_payment_status: 1,
          }));

        setFilteredSurakshaBimaRecords((prev) =>
          prev.filter(
            (r) => !updatedBimaNumbers.includes(r.surakshaBimaNumber),
          ),
        );
        if (movedRecords.length > 0) {
          setCompletedSurakshaBimaRecords((prev) => [...prev, ...movedRecords]);
        }

        // Clear selection and payment mode after successful submission
        setSelectedSurakshaBimaRecords([]);
        setPaymentMode("");
        setPaymentStatus("pending");
        setPaymentData(null);

        // Refresh latest data from API (getInsuranceBulkData)
        await fetchBulkData();

        // Show error for failed records only (if any)
        if (bima_failed > 0) {
          const failedRecords = details.filter(
            (detail: any) => detail.status !== "updated",
          );
          if (failedRecords.length > 0) {
            toast.error(
              `Failed to update: ${failedRecords.map((r: any) => r.bimaNumber).join(", ")}`,
            );
          }
        }
      } else {
        throw new Error(result.message || "API returned unsuccessful response");
      }
    } catch (error: any) {
      console.error("Error updating payment status:", error);
      toast.error(
        `Failed to update payment status: ${error.message || "Please try again."}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeneratePDF = async (
    source: "pending" | "completed" = "pending",
  ) => {
    const selectedIds =
      source === "pending"
        ? selectedSurakshaBimaRecords
        : selectedCompletedSurakshaBimaRecords;
    if (selectedIds.length === 0) {
      toast.error(
        "Please select at least one Suraksha Bima record to generate PDF",
      );
      return;
    }

    setGeneratingPDF(true);
    try {
      const list =
        source === "pending"
          ? filteredSurakshaBimaRecords
          : completedSurakshaBimaRecords;
      const selectedRecords = list.filter((record) =>
        selectedIds.includes(record.id),
      );

      // Determine gender from user details (assuming all records are for the same user)
      const userGender =
        filteredUserDetails.length > 0
          ? filteredUserDetails[0].gender
          : "Female";

      // Prepare data for PDF generation
      const pdfData = {
        userId: userId,
        startDate: startDate ? convertToYYYYMMDD(startDate) : "",
        endDate: endDate ? convertToYYYYMMDD(endDate) : "",
        totalRecords: selectedRecords.length,
        // User details
        applicantName: filteredUserDetails[0]?.applicantName || "",
        fatherName: filteredUserDetails[0]?.fatherName || "",
        gotra: filteredUserDetails[0]?.gotra || "",
        address: filteredUserDetails[0]?.address || "",
        category: filteredUserDetails[0]?.category || "",
        gender: filteredUserDetails[0]?.gender || "",
        emiAmount: filteredUserDetails[0]?.emiAmount || 0,

        bimaYojana: selectedRecords.map((record) => ({
          bimaNumber: record.surakshaBimaNumber,
          applicantName: record.surakshaBimaUserName,
          fatherName: record.surakshaBimaUserFatherName,
          date: record.dateOfSurakshaBima,
          payment_status: record.emiStatus === "Completed" ? 1 : 0,
          insuranceApplication_id: filteredUserDetails[0]?.id,
          gender: filteredUserDetails[0]?.gender?.toLowerCase(),
          emiAmount: record.emiAmount || 0,
          village: record.tehsil || "",
        })),
      };

      console.log(
        "Generating PDF with data:",
        JSON.stringify(pdfData, null, 2),
      );
      console.log("Using gender template:", userGender);
      console.log("Selected Suraksha Bima records:", selectedRecords);

      // Call updateInsurancePdfStatus API before generating PDF
      const idsToUpdate = selectedRecords
        .map((record) => record.filter_row_id)
        .filter((id) => id !== undefined && id !== null);

      if (idsToUpdate.length > 0) {
        try {
          const updateResponse = await post(
            "?apicall=updateInsurancePdfStatus",
            { ids: idsToUpdate },
          );

          const updateResult = updateResponse.data;
          console.log("PDF status update response:", updateResult);
        } catch (error) {
          console.error("Error updating PDF status:", error);
          // Continue with PDF generation even if status update fails
          toast.warning(
            "PDF status update failed, but continuing with PDF generation",
          );
        }
      }

      const response = await fetch("/api/generate-bulk-suraksha-bima-emi-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: pdfData,
          gender: userGender,
        }),
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = "Failed to generate PDF";
        try {
          // Clone the response to read it as JSON without consuming the original
          const clonedResponse = response.clone();
          const errorData = await clonedResponse.json();
          errorMessage = errorData.details || errorData.error || errorMessage;
          console.error("PDF generation error:", errorData);
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Generate appropriate filename based on gender
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
      let filename = "bulk_suraksha_bima_emi.pdf";

      if (userGender === "Female" || userGender === "महिला") {
        filename = `female_bulk_suraksha_bima_emi_${timestamp}.pdf`;
      } else if (userGender === "Male" || userGender === "पुरुष") {
        filename = `male_bulk_suraksha_bima_emi_${timestamp}.pdf`;
      } else {
        filename = `bulk_suraksha_bima_emi_${timestamp}.pdf`;
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("PDF generated successfully");

      // Get user mobile from filteredUserDetails
      const userMobile =
        filteredUserDetails[0]?.mobile || filteredUserDetails[0]?.phone;

      // Re-fetch data after successful PDF generation to update PDF status
      await fetchBulkData();

      // --- WhatsApp Integration ---
      if (userMobile) {
        try {
          const applicantName =
            filteredUserDetails[0]?.applicantName || "Applicant";
          const message = `नमस्ते ${applicantName},\n\nपुरबिया प्रजापति बालिका विवाह & सशक्तिकरण फाउण्डेशन मे सुरक्षा बिमा के तहत सहयोग (अनुदान)राशी देने के लिए आपका आभार \nअपनी रसीद प्राप्त करे\n     अधिक जानकारी हेतु संपर्क करे \nपीराराम तेनगरिया जसोल \n9413032072, 8209467238`;

          // Send Text
          await sendWhatsAppMessage(userMobile, message);
          toast.success("WhatsApp message sent successfully");

          // Send File
          const file = new File([blob], filename, { type: "application/pdf" });
          await sendWhatsAppFile(
            userMobile,
            file,
            `Bulk Suraksha Bima EMI Receipt`,
          );
          toast.success("Receipt sent to WhatsApp successfully");
        } catch (waError) {
          console.error("WhatsApp integration error:", waError);
          toast.error("Failed to send WhatsApp message/file");
        }
      } else {
        console.warn("User mobile number not found, skipping WhatsApp send.");
        toast.warning("Mobile number not found, skipped WhatsApp send.");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate PDF. Please try again.";
      toast.error(errorMessage);
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <RoleGuard requiredModule="bulk_suraksha_bima_emi" requiredAction="view">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">
              बल्क सुरक्षा बीमा ईएमआई / Bulk Suraksha Bima EMI
            </h1>
            <p className="text-muted-foreground">
              Manage and view bulk Suraksha Bima EMI records
            </p>
          </div>
        </div>

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              फिल्टर / Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <Label>प्रारंभ तिथि / Start Date</Label>
                <DatePicker
                  id="startDate"
                  value={startDate ? formatDate(startDate) : ""}
                  onChange={(date) => setStartDate(date)}
                  placeholder="dd-mm-yyyy"
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>समाप्ति तिथि / End Date</Label>
                <DatePicker
                  id="endDate"
                  value={endDate ? formatDate(endDate) : ""}
                  onChange={(date) => setEndDate(date)}
                  placeholder="dd-mm-yyyy"
                />
              </div>

              {/* User ID */}
              <div className="space-y-2">
                <Label>उपयोगकर्ता आईडी / User ID</Label>
                <Input
                  placeholder="Enter user ID, form number, or father name"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-6">
              <Button
                onClick={fetchBulkData}
                className="flex items-center gap-2"
                disabled={loading}
              >
                <Search className="h-4 w-4" />
                {loading ? "Fetching..." : "Fetch Data"}
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                फिल्टर साफ़ करें / Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Details Card - Only show after applying filters */}
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
              {filteredUserDetails.map((user, index) => {
                const userSurakshaBimaRecords = getSurakshaBimaRecordsForUser(
                  user.id.toString(),
                );
                return (
                  <div key={user.id} className="space-y-6">
                    {index > 0 && <div className="border-t pt-6" />}

                    {/* User Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          आवेदक का नाम / Applicant Name
                        </Label>
                        <p className="text-sm font-medium">
                          {user.applicantName}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          फॉर्म संख्या / Form Number
                        </Label>
                        <p className="text-sm font-medium">{user.formNumber}</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          पिता का नाम / Father Name
                        </Label>
                        <p className="text-sm font-medium">{user.fatherName}</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          गोत्र / Gotra
                        </Label>
                        <p className="text-sm font-medium">{user.gotra}</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          पता / Address
                        </Label>
                        <p className="text-sm font-medium">{user.address}</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          उपयोगकर्ता श्रेणी / User Category
                        </Label>
                        <p className="text-sm font-medium">{user.category}</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          लिंग / Gender
                        </Label>
                        <p className="text-sm font-medium">{user.gender}</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          ईएमआई राशि / EMI Amount
                        </Label>
                        <p className="text-sm font-medium">
                          ₹{user.emiAmount?.toLocaleString("hi-IN") || "0"}
                        </p>
                      </div>
                    </div>

                    {/* User's Suraksha Bima Records Summary */}
                    {userSurakshaBimaRecords.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          इस उपयोगकर्ता के सुरक्षा बीमा रिकॉर्ड्स / Suraksha
                          Bima Records for this User (
                          {userSurakshaBimaRecords.length} records)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              कुल ईएमआई राशि / Total EMI Amount:
                            </span>
                            <p className="font-medium">
                              ₹
                              {userSurakshaBimaRecords
                                .reduce(
                                  (sum, record) => sum + record.emiAmount,
                                  0,
                                )
                                .toLocaleString("hi-IN")}
                            </p>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              सक्रिय ईएमआई / Active EMIs:
                            </span>
                            <p className="font-medium">
                              {
                                userSurakshaBimaRecords.filter(
                                  (r) => r.emiStatus === "Active",
                                ).length
                              }
                            </p>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              लंबित ईएमआई / Pending EMIs:
                            </span>
                            <p className="font-medium">
                              {
                                userSurakshaBimaRecords.filter(
                                  (r: any) => r.filter_payment_status === 0,
                                ).length
                              }
                            </p>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              पूर्ण ईएमआई / Completed EMIs:
                            </span>
                            <p className="font-medium">
                              {
                                userSurakshaBimaRecords.filter(
                                  (r: any) => r.filter_payment_status === 1,
                                ).length
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Completed Suraksha Bima Records Card */}
        {showUserData && completedSurakshaBimaRecords.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  पूर्ण सुरक्षा बीमा रिकॉर्ड्स / Completed Suraksha Bima Records
                  ({completedSurakshaBimaRecords.length} records)
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={
                        completedSurakshaBimaRecords.length > 0 &&
                        selectedCompletedSurakshaBimaRecords.length ===
                          completedSurakshaBimaRecords.length
                      }
                      onCheckedChange={selectAllCompletedSurakshaBimaRecords}
                    />
                    <span className="text-sm text-muted-foreground">
                      सभी चयन करें / Select All
                    </span>
                  </div>
                  <Button
                    onClick={() => handleGeneratePDF("completed")}
                    disabled={
                      generatingPDF ||
                      selectedCompletedSurakshaBimaRecords.length === 0
                    }
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <FileText className="h-4 w-4" />
                    {generatingPDF
                      ? "Generating PDF..."
                      : `Generate PDF (${selectedCompletedSurakshaBimaRecords.length})`}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={completedSurakshaBimaRecords}
                columns={completedColumns}
                title=""
                addNewUrl=""
                addNewLabel=""
                onDelete={() => {}}
                editUrlPattern=""
                searchFields={[
                  "surakshaBimaNumber",
                  "surakshaBimaUserName",
                  "surakshaBimaUserFatherName",
                ]}
                showAddButton={false}
                showEditButton={false}
                showDeleteButton={false}
                showActionsColumn={false}
              />
            </CardContent>
          </Card>
        )}

        {/* Suraksha Bima Records Card - Only show after applying filters */}
        {showUserData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  सुरक्षा बीमा रिकॉर्ड्स / Suraksha Bima Records (
                  {filteredSurakshaBimaRecords.length} records found)
                </span>
                {filteredSurakshaBimaRecords.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={(() => {
                          const selectableRecords =
                            filteredSurakshaBimaRecords.filter(
                              (record) => record.filter_payment_status !== 1,
                            );
                          return (
                            selectableRecords.length > 0 &&
                            selectedSurakshaBimaRecords.length ===
                              selectableRecords.length
                          );
                        })()}
                        onCheckedChange={selectAllSurakshaBimaRecords}
                      />
                      <span className="text-sm text-muted-foreground">
                        सभी चयन करें / Select All
                      </span>
                    </div>
                    <Button
                      onClick={() => handleGeneratePDF("pending")}
                      disabled={
                        generatingPDF ||
                        selectedSurakshaBimaRecords.length === 0
                      }
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <FileText className="h-4 w-4" />
                      {generatingPDF ? "Generating PDF..." : "Generate PDF"}
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSurakshaBimaRecords.length > 0 ? (
                <>
                  <DataTable
                    data={filteredSurakshaBimaRecords}
                    columns={surakshaBimaColumns}
                    title=""
                    addNewUrl=""
                    addNewLabel=""
                    onDelete={() => {}}
                    editUrlPattern=""
                    searchFields={[
                      "surakshaBimaNumber",
                      "surakshaBimaUserName",
                      "surakshaBimaUserFatherName",
                    ]}
                    showAddButton={false}
                    showEditButton={false}
                    showDeleteButton={false}
                    showActionsColumn={false}
                  />

                  {/* Action Buttons for Selected Records */}
                  {selectedSurakshaBimaRecords.length > 0 && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      {/* Payment Mode Selection */}
                      <div className="mb-4">
                        <Label className="text-sm font-medium mb-2 block">
                          भुगतान मोड चुनें / Select Payment Mode *
                        </Label>
                        <Select
                          value={paymentMode}
                          onValueChange={setPaymentMode}
                        >
                          <SelectTrigger className="w-full max-w-md">
                            <SelectValue placeholder="भुगतान मोड चुनें / Select payment mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">
                              <div className="flex items-center gap-2">
                                <Banknote className="h-4 w-4" />
                                <span>नकद / Cash</span>
                              </div>
                            </SelectItem>
                            {/* <SelectItem value="bank_transfer">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              <span>बैंक ट्रांसफर / Bank Transfer</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="upi">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4" />
                              <span>यूपीआई / UPI</span>
                            </div>
                          </SelectItem> */}
                            <SelectItem value="razorpay">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                <span>राज़रपे / Razorpay</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Razorpay Payment Section */}
                      {paymentMode === "razorpay" && (
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                              <h3 className="font-medium text-blue-900">
                                Online Payment
                              </h3>
                              <p className="text-sm text-blue-700">
                                Pay ₹
                                {calculateTotalAmount().toLocaleString("hi-IN")}{" "}
                                securely using Razorpay
                              </p>
                              {paymentStatus === "paid" && (
                                <p className="text-xs text-green-600 mt-1 font-medium">
                                  ✓ Payment completed successfully
                                </p>
                              )}
                              {paymentStatus === "failed" && (
                                <p className="text-xs text-red-600 mt-1">
                                  Payment failed. Please try again.
                                </p>
                              )}
                            </div>
                            <RazorpayPayment
                              amount={calculateTotalAmount()}
                              description={`Bulk Suraksha Bima EMI Payment - ${filteredUserDetails[0]?.applicantName || "Applicant"}`}
                              onSuccess={handlePaymentSuccess}
                              onError={handlePaymentError}
                              disabled={
                                submitting ||
                                !filteredUserDetails[0]?.applicantName ||
                                calculateTotalAmount() <= 0
                              }
                              className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
                            >
                              {paymentStatus === "paid"
                                ? "Payment Completed"
                                : `Pay ₹${calculateTotalAmount().toLocaleString("hi-IN")} Now`}
                            </RazorpayPayment>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                          onClick={handleSubmit}
                          disabled={
                            submitting ||
                            !paymentMode ||
                            (paymentMode === "razorpay" &&
                              paymentStatus !== "paid")
                          }
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <Send className="h-4 w-4" />
                          {submitting
                            ? "Submitting..."
                            : `Submit Selected (${selectedSurakshaBimaRecords.length})`}
                        </Button>
                      </div>

                      <div className="mt-3 text-center text-sm text-muted-foreground">
                        <p>
                          Selected {selectedSurakshaBimaRecords.length}{" "}
                          record(s) for processing
                        </p>
                        <p className="text-xs">
                          PDF will be generated using{" "}
                          {filteredUserDetails.length > 0
                            ? filteredUserDetails[0].gender
                            : "default"}{" "}
                          template
                        </p>
                        {paymentMode && (
                          <p className="text-xs text-green-600 font-medium">
                            Payment Mode:{" "}
                            {paymentMode === "cash"
                              ? "Cash"
                              : paymentMode === "bank_transfer"
                                ? "Bank Transfer"
                                : paymentMode === "upi"
                                  ? "UPI"
                                  : "Razorpay"}
                            {paymentMode === "razorpay" &&
                              paymentStatus === "paid" && (
                                <span className="ml-2">✓ Payment Verified</span>
                              )}
                          </p>
                        )}
                        {paymentMode === "razorpay" && (
                          <p className="text-xs text-blue-600 font-medium">
                            Total Amount: ₹
                            {calculateTotalAmount().toLocaleString("hi-IN")}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p>
                    No Suraksha Bima records found for the entered criteria.
                  </p>
                  <p>Please check your search criteria and try again.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* No Data Message */}
        {showUserData &&
          filteredUserDetails.length === 0 &&
          filteredSurakshaBimaRecords.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  <p>No data found for the entered criteria.</p>
                  <p>Please check your search criteria and try again.</p>
                </div>
              </CardContent>
            </Card>
          )}
      </div>
    </RoleGuard>
  );
}
