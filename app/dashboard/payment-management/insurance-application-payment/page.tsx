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
import { Search, Filter, X, Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { sendWhatsAppMessage, sendWhatsAppFile } from "@/lib/fireconnect-whatsapp-service";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APIService } from "@/lib/services";
import { InsuranceApplication, ApplicationFilters } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateForAPI, parseDateFromDDMMYYYY, getCurrentUserInfo } from "@/lib/utils";
import { buildListFilters } from "@/lib/list-filters";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function InsuranceApplicationPaymentListPage() {
  const [applications, setApplications] = useState<InsuranceApplication[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [villageFilter, setVillageFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Get unique villages for filter dropdown
  const uniqueVillages = Array.from(new Set(applications.map(app => app.address).filter(Boolean))).sort();

  function isValidDate(date: Date) {
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Helper function to convert dd-mm-yyyy to yyyy-mm-dd format
  const convertToYYYYMMDD = (dateString: string): string => {
    if (!dateString) return "";
    const parsedDate = parseDateFromDDMMYYYY(dateString);
    if (!parsedDate) return "";
    
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  // Fetch insurance applications from API
  const fetchApplications = async (filters?: ApplicationFilters) => {
    try {
      setLoading(true);
      
      const filtersWithUserInfo = {
        ...buildListFilters({ includeUserScope: true }),
        ...filters,
      };
      
      const response = await APIService.getInsuranceApplications(filtersWithUserInfo);
      
      if (response.status && response.data) {
        setApplications(response.data);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to fetch applications",
          variant: "destructive",
        });
        setApplications([]);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: "Failed to fetch applications. Please try again.",
        variant: "destructive",
      });
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  // Load applications on component mount
  useEffect(() => {
    fetchApplications();
  }, []);

  // Apply filters
  const applyFilters = async () => {
    const filters = buildListFilters({
      search: searchTerm,
      dateFrom,
      dateTo,
      genderFilter,
      villageFilter,
      categoryFilter,
    });

    await fetchApplications(filters);
    setCurrentPage(1);
    setFiltersOpen(false);
  };

  // Clear filters
  const clearFilters = async () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setDateFromObj(undefined);
    setDateToObj(undefined);
    setCategoryFilter("all");
    setGenderFilter("all");
    setVillageFilter("all");
    setCurrentPage(1);
    await fetchApplications();
  };

  const computedTotalPages = Math.max(1, Math.ceil(applications.length / itemsPerPage));
  const paginatedApplications = applications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Check if any filters are active
  const hasActiveFilters = searchTerm || dateFrom || dateTo || categoryFilter !== "all" || genderFilter !== "all" || villageFilter !== "all";

  // Calculate payment status
  const getPaymentStatus = (application: InsuranceApplication) => {
    const paymentAmount = parseFloat(application.paymentAmount || "0");
    const totalAmount = parseFloat(application.totalAmount || "0");
    const pendingAmount = parseFloat(application.pendingAmount || "0");
    
    if (paymentAmount === 0) return { status: "Pending", color: "text-red-600" };
    if (pendingAmount > 0) return { status: "Partial", color: "text-yellow-600" };
    return { status: "Completed", color: "text-green-600" };
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = applications;
      
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
        "Applicant Name": application.applicantName,
        "Father Name / Husband Name": application.fatherName || application.wifeName || "N/A",
        "Gender": application.gender || "N/A",
        "Category": application.category || "N/A",
        "Village": application.address || "N/A",
        "Application Date": formatDate(application.applicationDate),
        "Total Amount": application.totalAmount || 0,
        "Paid Amount": application.paymentAmount || 0,
        "Pending Amount": application.pendingAmount || 0,
        "Payment Status": getPaymentStatus(application).status,
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Insurance Bima Application Payments");

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `insurance_application_payments_${new Date().toISOString().split("T")[0]}.xlsx`;
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
  const generatePaymentReceipt = async (application: InsuranceApplication) => {
    try {
      // First, get the complete application details
      const response = await APIService.getInsuranceApplicationById(application.id!);
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
        totalAmount: `${applicationData.totalAmount + '/-' || 0}`,
      };

      // Call the API to generate PDF
      const pdfResponse = await fetch('/api/generate-insurance-application-payment-receipt', {
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
      a.download = `insurance_payment_receipt_${applicationData.formNumber}.pdf`;
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
        const message = `नमस्ते ${applicationData.applicantName},\n\nपुरबिया प्रजापति बालिका विवाह & सशक्तिकरण फाउण्डेशन मे सुरक्षा बिमा के तहत सहयोग (अनुदान)राशी देने के लिए आपका आभार \nअपनी रसीद प्राप्त करे\n     अधिक जानकारी हेतु संपर्क करे \nपीराराम तेनगरिया जसोल \n9413032072, 8209467238`;

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
    <div className="p-3 md:p-6 relative">

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900">
            Insurance Bima Application Payment
          </h1>
          <p className="text-sm text-gray-600">
            Manage and review all insurance application payments.
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
            placeholder="Search by name or form number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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

                {/* Category Filter */}
                <div className="space-y-2">
                  <Label htmlFor="categoryFilter">Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="A">Category A</SelectItem>
                      <SelectItem value="B">Category B</SelectItem>
                      <SelectItem value="C">Category C</SelectItem>
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

                {/* Filter Actions */}
                <div className="flex gap-2 pt-4">
                  <Button onClick={applyFilters} className="flex-1">
                    Apply Filters
                  </Button>
                  <Button variant="destructive"   size="sm" onClick={clearFilters} className="flex-1">
                  <X className="h-4 w-4" />
                    Clear All
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Filters */}
          <div className="hidden sm:flex gap-3 items-end">
            {/* Date From Picker */}
            <div className="flex flex-col">
              <Label htmlFor="dateFrom" className="pb-2">From Date</Label>
              <div className="relative">
                <Input
                  type="text"
                  id="dateFrom"
                  name="dateFrom"
                  value={dateFrom}
                  placeholder="dd-mm-yyyy"
                  className="bg-background pr-10"
                  onChange={(e) => {
                    const str = e.target.value;
                    setDateFrom(str);
                    const parsed = parseDateFromDDMMYYYY(str);
                    setDateFromObj(parsed || undefined);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setDateFromOpen(true);
                    }
                  }}
                />
                <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-from-picker"
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
                      selected={dateFromObj}
                      captionLayout="dropdown"
                      month={dateFromObj}
                      onMonthChange={setDateFromObj}
                      onSelect={(date) => {
                        setDateFromObj(date);
                        setDateFrom(date ? formatDate(date) : "");
                        setCurrentPage(1);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Date To Picker */}
            <div className="flex flex-col">
              <Label htmlFor="dateTo" className="pb-2">To Date</Label>
              <div className="relative">
                <Input
                  type="text"
                  id="dateTo"
                  name="dateTo"
                  value={dateTo}
                  placeholder="dd-mm-yyyy"
                  className="bg-background pr-10"
                  onChange={(e) => {
                    const str = e.target.value;
                    setDateTo(str);
                    const parsed = parseDateFromDDMMYYYY(str);
                    setDateToObj(parsed || undefined);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setDateToOpen(true);
                    }
                  }}
                />
                <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-to-picker"
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
                      selected={dateToObj}
                      captionLayout="dropdown"
                      month={dateToObj}
                      onMonthChange={setDateToObj}
                      onSelect={(date) => {
                        setDateToObj(date);
                        setDateTo(date ? formatDate(date) : "");
                        setCurrentPage(1);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-col">
              <Label htmlFor="categoryFilter" className="pb-2">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="A">Category A</SelectItem>
                  <SelectItem value="B">Category B</SelectItem>
                  <SelectItem value="C">Category C</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gender Filter */}
            <div className="flex flex-col">
              <Label htmlFor="genderFilter" className="pb-2">Gender</Label>
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
            <div className="flex flex-col">
              <Label htmlFor="villageFilter" className="pb-2">Village</Label>
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

            {/* Filter Actions */}
            <div className="flex gap-2">
              <Button onClick={applyFilters} size="sm">
                Apply
              </Button>
              <Button variant="destructive" onClick={clearFilters} size="sm">
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
                ? "No applications found matching your search."
                : "No applications found."}
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]"  >Form Number</TableHead>
                      <TableHead className="min-w-[150px]" >Applicant Name</TableHead>
                      <TableHead className="min-w-[150px]">Father Name / Husband Name</TableHead>
                      <TableHead className="min-w-[150px]">Gender</TableHead>
                      <TableHead className="min-w-[150px]">Category</TableHead>
                      <TableHead className="min-w-[150px]">Village</TableHead>
                      <TableHead className="min-w-[150px]">Application Date</TableHead>
                      <TableHead className="min-w-[150px]">Total Amount</TableHead>
                      <TableHead className="min-w-[150px]">Paid Amount</TableHead>
                      <TableHead className="min-w-[150px]">Pending Amount</TableHead>
                      <TableHead className="min-w-[150px]">Payment Status</TableHead>
                      <TableHead className="min-w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedApplications.map((application) => {
                      const paymentStatus = getPaymentStatus(application);
                      return (
                        <TableRow key={application.id}>
                          <TableCell className="font-medium">{application.formNumber}</TableCell>
                          <TableCell>{application.applicantName}</TableCell>
                          <TableCell>
                            {application.fatherName}
                            {application.wifeName && (
                              <div className="text-sm ">
                                 {application.wifeName}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="capitalize">{application.gender}</TableCell>
                          <TableCell>{application.category}</TableCell>
                          <TableCell>{application.address}</TableCell>
                          <TableCell>{formatDate(application.applicationDate)}</TableCell>
                          <TableCell className="font-medium">₹{application.totalAmount || "0"}</TableCell>
                          <TableCell className="text-green-600 font-medium">₹{application.paymentAmount || "0"}</TableCell>
                          <TableCell className="text-red-600 font-medium">₹{application.pendingAmount || "0"}</TableCell>
                          <TableCell className={paymentStatus.color}>
                            {paymentStatus.status}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row gap-1">
                              {parseFloat(application.pendingAmount || "0") === 0 ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => generatePaymentReceipt(application)}
                                  className="w-full sm:w-auto flex items-center gap-1"
                                >
                                  <Download className="w-4 h-4" />
                                  Generate Receipt
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    router.push(`/dashboard/payment-management/insurance-application-payment/${application.id}`)
                                  }
                                  className="w-full sm:w-auto"
                                >
                                  Add Payment
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={computedTotalPages}
                  onPageChange={setCurrentPage}
                />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
