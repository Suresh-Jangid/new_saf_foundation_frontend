"use client";

import React, { useEffect, useState } from "react";
import { GENDER_OPTIONS } from "@/lib/form-values"
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PermissionGate } from "@/components/permission-gate";
import APIService, { GeneralApplication, ApplicationFilters } from "@/lib/services";
import { formatDate, formatDateForAPI, parseDateFromDDMMYYYY, getCurrentUserInfo } from "@/lib/utils";
import { buildListFilters } from "@/lib/list-filters";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { sendWhatsAppMessage, sendWhatsAppFile } from "@/lib/fireconnect-whatsapp-service";

export default function GeneralApplicationPaymentListPage() {
  const [applications, setApplications] = useState<GeneralApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const router = useRouter();
  const { toast } = useToast();

  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);
  const [dateFromObj, setDateFromObj] = useState<Date | undefined>(undefined);
  const [dateToObj, setDateToObj] = useState<Date | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [villageFilter, setVillageFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Get unique villages for filter dropdown
  const uniqueVillages = Array.from(new Set(applications.map(app => app.address).filter(Boolean))).sort();

  function isValidDate(date: Date) {
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Load applications from API
  const loadApplications = async (filters?: ApplicationFilters) => {
    setLoading(true);
    try {
      const filtersWithUserInfo = {
        ...buildListFilters({ includeUserScope: true }),
        ...filters,
      };
      
      const response = await APIService.getGeneralApplications(filtersWithUserInfo);
      if (response.status) {
        setApplications(response.data || []);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to load applications",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to load applications:", error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load applications on component mount
  useEffect(() => {
    loadApplications();
  }, []);

  // Apply filters
 // ... existing code ...

  // Apply filters
  const applyFilters = async () => {
    const filters = buildListFilters({
      search: searchTerm,
      dateFrom,
      dateTo,
      genderFilter,
      villageFilter,
      typeFilter,
    });

    await loadApplications(filters);
    setCurrentPage(1);
    setFiltersOpen(false);
  };

   // Helper function to convert dd-mm-yyyy to yyyymmdd format
   const convertToYYYYMMDD = (dateString: string): string => {
    if (!dateString) return "";
    const parsedDate = parseDateFromDDMMYYYY(dateString);
    if (!parsedDate) return "";
    
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };


  // Clear filters
  const clearFilters = async () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setDateFromObj(undefined);
    setDateToObj(undefined);
    setTypeFilter("all");
    setGenderFilter("all");
    setVillageFilter("all");
    setCurrentPage(1);
    await loadApplications();
  };

  // Server-side filtered results
  const totalPages = Math.max(1, Math.ceil(applications.length / itemsPerPage));
  const paginatedApplications = applications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Check if any filters are active
  const hasActiveFilters = searchTerm || dateFrom || dateTo || typeFilter !== "all" || genderFilter !== "all" || villageFilter !== "all";

  // Calculate payment status
  const getPaymentStatus = (application: GeneralApplication) => {
    const paymentAmount = parseFloat(String(application.paymentAmount || "0"));
    const totalAmount = parseFloat(String(application.totalAmount || "0"));
    const pendingAmount = parseFloat(String(application.pendingAmount || "0"));
    
    if (paymentAmount === 0) return { status: "Pending", color: "text-red-600" };
    if (pendingAmount > 0) return { status: "Partial", color: "text-yellow-600" };
    return { status: "Completed", color: "text-green-600" };
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = applications.length > 0 ? applications : [];
      
      if (dataToExport.length === 0) {
        toast({
          title: "Error",
          description: "No data to export",
          variant: "destructive",
        });
        return;
      }

      // Prepare data for Excel export
      const excelData = dataToExport.map((application) => ({
        "Form Number": application.formNumber,
        "Name": application.applicantName,
        "Father Name": application.fatherName,
        "Gender": application.gender || "N/A",
        "Category": application.category || "N/A",
        "Village": application.address || "N/A",
        "Total Amount": application.totalAmount || 0,
        "Paid Amount": application.paymentAmount || 0,
        "Pending Amount": application.pendingAmount || 0,
        "Payment Status": getPaymentStatus(application).status,
        "Payment Mode": application.paymentMode || "N/A",
        "Payment Date": application.paymentDate || "N/A",
        "Application Date": application.applicationDate,
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "General Marriage Application Payments");

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `general_application_payments_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Excel file exported successfully",
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Error",
        description: "Failed to export Excel file",
        variant: "destructive",
      });
    }
  };

  // Generate payment receipt
  const generatePaymentReceipt = async (application: GeneralApplication) => {
    try {
      // First, get the complete application details
      const response = await APIService.getGeneralApplicationById(application.id!);
      if (!response.status || !response.data) {
        toast({
          title: "Error",
          description: "Failed to fetch application details",
          variant: "destructive",
        });
        return;
      }

      const applicationData = Array.isArray(response.data) ? response.data[0] : response.data;
      
      // Prepare receipt data
      const receiptData = {
        receiptNumber: application.sr_no,
        receiptDate: formatDate(new Date()),
        applicantName: applicationData.applicantName,
        fatherName: applicationData.fatherName,
        gotra : applicationData.gotra,
        formNumber: applicationData.formNumber,
        applicationDate: applicationData.applicationDate,
        address: applicationData.address,
        mobile: applicationData.mobile,
        totalAmount: `${applicationData.totalAmount + '/-'|| 0}`,
       
      };

      // Call the API to generate PDF
      const pdfResponse = await fetch('/api/generate-general-application-payment-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: receiptData }),
      });

      if (!pdfResponse.ok) {
        throw new Error('Failed to generate payment receipt');
      }

      // Download the PDF
      const blob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment_receipt_${applicationData.formNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Payment receipt generated and downloaded successfully",
      });

      // --- WhatsApp Integration ---
      try {
        const message = `नमस्ते ${applicationData.applicantName},\n\nपुरबिया प्रजापति बालिका विवाह & सशक्तिकरण फाउण्डेशन मे विवाह योजना के तहत सहयोग राशी देने के लिए आपका आभार \nअपनी रसीद प्राप्त करे\n     अधिक जानकारी हेतु संपर्क करे \nपीराराम तेनगरिया जसोल \n9413032072, 8209467238`;

        // Send Text
        await sendWhatsAppMessage(applicationData.mobile, message);
        toast({
          title: "Success",
          description: "WhatsApp message sent successfully",
        });

        // Send File
        const file = new File([blob], `Payment_Receipt_${applicationData.formNumber}.pdf`, { type: "application/pdf" });
        await sendWhatsAppFile(applicationData.mobile, file, `Payment Receipt - ${applicationData.formNumber}`);
        toast({
          title: "Success",
          description: "Receipt sent to WhatsApp successfully",
        });

      } catch (error) {
        console.error("WhatsApp error:", error);
        toast({
          title: "Warning",
          description: "Failed to send WhatsApp message/file",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("Failed to generate payment receipt:", error);
      toast({
        title: "Error",
        description: "Failed to generate payment receipt",
        variant: "destructive",
      });
    }
  };

  return (
    <PermissionGate module="general_application_payment" action="view" fallback={
      <div className="p-4 md:p-6">
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view general application payments.</p>
        </div>
      </div>
    }>
      <div className="p-3 md:p-6 relative">

        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-gray-900">
              General Marriage Application Records
            </h1>
            <p className="text-sm text-gray-600">
              Manage and review all general marriage application payment.
            </p>
          </div>
          <Button
            onClick={handleExportExcel}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 w-full sm:w-auto"
            disabled={applications.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              className="pl-10"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            {/* Mobile Filter Button */}
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="sm:hidden w-full">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {/* Date From Picker */}
                  <div className="space-y-2">
                    <Label htmlFor="dateFrom">From Date</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        id="dateFrom"
                        name="dateFrom"
                        value={dateFrom}
                        placeholder="dd-mm-yyyy"
                        className="bg-background pr-10"
                        onChange={(e) => {
                          const value = e.target.value;
                          setDateFrom(value);
                          const parsed = parseDateFromDDMMYYYY(value) || undefined;
                          if (parsed) setDateFromObj(parsed);
                        }}
                      />
                      <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            className="absolute top-1/2 right-2 w-8 h-8 p-0 -translate-y-1/2"
                            type="button"
                          >
                            <CalendarDays className="w-4 h-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={dateFromObj}
                            captionLayout="dropdown"
                            month={dateFromObj}
                            onMonthChange={setDateFromObj}
                            onSelect={(date: any) => {
                              setDateFromObj(date);
                              setDateFrom(formatDate(date));
                              setDateFromOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Date To Picker */}
                  <div className="space-y-2">
                    <Label htmlFor="dateTo">To Date</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        id="dateTo"
                        name="dateTo"
                        value={dateTo}
                        placeholder="dd-mm-yyyy"
                        className="bg-background pr-10"
                        onChange={(e) => {
                          const value = e.target.value;
                          setDateTo(value);
                          const parsed = parseDateFromDDMMYYYY(value) || undefined;
                          if (parsed) setDateToObj(parsed);
                        }}
                      />
                      <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            className="absolute top-1/2 right-2 w-8 h-8 p-0 -translate-y-1/2"
                            type="button"
                          >
                            <CalendarDays className="w-4 h-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={dateToObj}
                            captionLayout="dropdown"
                            month={dateToObj}
                            onMonthChange={setDateToObj}
                            onSelect={(date: any) => {
                              setDateToObj(date);
                              setDateTo(formatDate(date));
                              setDateToOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Type Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="typeFilter">Category</Label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Category</SelectItem>
                        <SelectItem value="A">A category</SelectItem>
                        <SelectItem value="B">B category</SelectItem>
                        <SelectItem value="C">C category</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Gender Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="genderFilter">Gender</Label>
                    <Select value={genderFilter} onValueChange={setGenderFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Genders" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Genders</SelectItem>
                        {GENDER_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Village Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="villageFilter">Village</Label>
                    <Select value={villageFilter} onValueChange={setVillageFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Villages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Villages</SelectItem>
                        {uniqueVillages.map((village) => (
                          <SelectItem key={village} value={village}>
                            {village}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button onClick={applyFilters} variant="secondary" className="flex-1">
                      Apply Filters
                    </Button>
                    <Button onClick={clearFilters} variant="destructive" className="flex-1">
                    <X className="h-4 w-4" />
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop Filters */}
            <div className="hidden sm:flex flex-wrap gap-3 items-end">
              {/* Date From Picker */}
              <div className="space-y-2">
                <Label htmlFor="dateFrom" className="text-sm">From Date</Label>
                <div className="relative">
                  <Input
                    type="text"
                    id="dateFrom"
                    name="dateFrom"
                    value={dateFrom}
                    placeholder="dd-mm-yyyy"
                    className="bg-background pr-10 w-32"
                    onChange={(e) => {
                      const value = e.target.value;
                      setDateFrom(value);
                      const parsed = parseDateFromDDMMYYYY(value) || undefined;
                      if (parsed) setDateFromObj(parsed);
                    }}
                  />
                  <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className="absolute top-1/2 right-2 w-8 h-8 p-0 -translate-y-1/2"
                        type="button"
                      >
                        <CalendarDays className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={dateFromObj}
                        captionLayout="dropdown"
                        month={dateFromObj}
                        onMonthChange={setDateFromObj}
                        onSelect={(date: any) => {
                          setDateFromObj(date);
                          setDateFrom(formatDate(date));
                          setDateFromOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Date To Picker */}
              <div className="space-y-2">
                <Label htmlFor="dateTo" className="text-sm">To Date</Label>
                <div className="relative">
                  <Input
                    type="text"
                    id="dateTo"
                    name="dateTo"
                    value={dateTo}
                    placeholder="dd-mm-yyyy"
                    className="bg-background pr-10 w-32"
                    onChange={(e) => {
                      const value = e.target.value;
                      setDateTo(value);
                      const parsed = parseDateFromDDMMYYYY(value) || undefined;
                      if (parsed) setDateToObj(parsed);
                    }}
                  />
                  <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className="absolute top-1/2 right-2 w-8 h-8 p-0 -translate-y-1/2"
                        type="button"
                      >
                        <CalendarDays className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={dateToObj}
                        captionLayout="dropdown"
                        month={dateToObj}
                        onMonthChange={setDateToObj}
                        onSelect={(date: any) => {
                          setDateToObj(date);
                          setDateTo(formatDate(date));
                          setDateToOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="typeFilter" className="text-sm">Category</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Category</SelectItem>
                    <SelectItem value="A">A category</SelectItem>
                    <SelectItem value="B">B category</SelectItem>
                    <SelectItem value="C">C category</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Gender Filter */}
              <div className="space-y-2">
                <Label htmlFor="genderFilter" className="text-sm">Gender</Label>
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All Genders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    {GENDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Village Filter */}
              <div className="space-y-2">
                <Label htmlFor="villageFilter" className="text-sm">Village</Label>
                <Select value={villageFilter} onValueChange={setVillageFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All Villages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Villages</SelectItem>
                    {uniqueVillages.map((village) => (
                      <SelectItem key={village} value={village}>
                        {village}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={applyFilters} variant="secondary" size="sm">
                  Apply Filters
                </Button>
                <Button onClick={clearFilters} variant="destructive" size="sm">
                <X className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">
              All Records ({applications.length} total)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-8 text-gray-500 px-4">
                Loading applications...
              </div>
            ) : paginatedApplications.length === 0 ? (
              <div className="text-center py-8 text-gray-500 px-4">
                {hasActiveFilters
                  ? "No records found matching your search."
                  : `No applications found.`}
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block md:hidden space-y-3 p-4">
                  {paginatedApplications.map((application: GeneralApplication) => (
                    <Card key={application.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-sm">{application.applicantName}</h3>
                            <p className="text-xs text-gray-600">Form: {application.formNumber}</p>
                          </div>
                          <div className="flex gap-2 flex-col sm:flex-row">
                            {application.pendingAmount === 0 ? (
                              <PermissionGate module="general_application_payment" action="view">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => generatePaymentReceipt(application)}
                                  className="flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  Receipt
                                </Button>
                              </PermissionGate>
                            ) : (
                              <PermissionGate module="general_application_payment" action="create">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    router.push(`/dashboard/payment-management/general-application-payment/${application.id}`)
                                  }
                                >
                                  Add Payment
                                </Button>
                              </PermissionGate>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Father:</span>
                            <p className="font-medium">{application.fatherName}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Gender:</span>
                            <p className="font-medium capitalize">{application.gender || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Category:</span>
                            <p className="font-medium capitalize">{application.category || "registration"}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Village:</span>
                            <p className="font-medium">{application.address || "N/A"}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs border-t pt-2">
                          <div>
                            <span className="text-gray-500">Total:</span>
                            <p className="font-medium">₹{application.totalAmount || 0}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Paid:</span>
                            <p className="text-green-600 font-medium">₹{application.paymentAmount || 0}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Pending:</span>
                            <p className="text-red-600 font-medium">₹{application.pendingAmount || 0}</p>
                          </div>
                        </div>
                        <div className="text-xs border-t pt-2">
                          <span className="text-gray-500">Payment Status:</span>
                          <p className={`font-medium ${getPaymentStatus(application).color}`}>
                            {getPaymentStatus(application).status}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2">
                          <div>
                            <span className="text-gray-500">Payment Mode:</span>
                            <p className="font-medium">{application.paymentMode || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Payment Date:</span>
                            <p className="font-medium">{application.paymentDate || "N/A"}</p>
                          </div>
                        </div>
                        <div className="text-xs border-t pt-2">
                          <span className="text-gray-500">Application Date:</span>
                          <p className="font-medium">{application.applicationDate}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    <Table className="w-full min-w-[800px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">Form Number</TableHead>
                          <TableHead className="min-w-[150px]">Name</TableHead>
                          <TableHead className="min-w-[150px]">Father Name</TableHead>
                          <TableHead className="min-w-[150px]">Gender</TableHead>
                          <TableHead className="min-w-[150px]">Category</TableHead>
                          <TableHead className="min-w-[150px]">Village</TableHead>
                          <TableHead className="min-w-[150px]">Total Fee</TableHead>
                          <TableHead className="min-w-[150px]">Paid Amount</TableHead>
                          <TableHead className="min-w-[150px]">Pending Amount</TableHead>
                          <TableHead className="min-w-[150px]">Payment Status</TableHead>
                          <TableHead className="min-w-[150px]">Payment Mode</TableHead>
                          <TableHead className="min-w-[150px]">Payment Date</TableHead>
                          <TableHead className="min-w-[150px]">Application Date</TableHead>
                          <TableHead className="min-w-[200px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedApplications.map((application: GeneralApplication) => {
                          const paymentStatus = getPaymentStatus(application);
                          return (
                          <TableRow key={application.id}>
                            <TableCell>{application.formNumber}</TableCell>
                            <TableCell>{application.applicantName}</TableCell>
                            <TableCell>{application.fatherName}</TableCell>
                            <TableCell className="capitalize">{application.gender || "N/A"}</TableCell>
                            <TableCell className="capitalize">{application.category || "registration"}</TableCell>
                            <TableCell>{application.address || "N/A"}</TableCell>
                            <TableCell className="font-medium">₹{application.totalAmount || 0}</TableCell>
                            <TableCell className="text-green-600 font-medium">₹{application.paymentAmount || 0}</TableCell>
                            <TableCell className="text-red-600 font-medium">₹{application.pendingAmount || 0}</TableCell>
                            <TableCell className={paymentStatus.color}>
                              {paymentStatus.status}
                            </TableCell>
                            <TableCell>{application.paymentMode || "N/A"}</TableCell>
                            <TableCell>{application.paymentDate || "N/A"}</TableCell>
                            <TableCell>{application.applicationDate}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {application.pendingAmount === 0 ? (
                                  <PermissionGate module="general_application_payment" action="view">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => generatePaymentReceipt(application)}
                                      className="flex items-center gap-1"
                                    >
                                      <Download className="w-4 h-4" />
                                      Generate Receipt
                                    </Button>
                                  </PermissionGate>
                                ) : (
                                  <PermissionGate module="general_application_payment" action="create">
                                    <Button
                                      size="sm"
                                      className="py-2"
                                      variant="outline"
                                      onClick={() =>
                                        router.push(`/dashboard/payment-management/general-application-payment/${application.id}`)
                                      }
                                    >
                                      Add Payment
                                    </Button>
                                  </PermissionGate>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
