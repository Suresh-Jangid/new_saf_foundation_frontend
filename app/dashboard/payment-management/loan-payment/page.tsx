"use client";

import React, { useEffect, useState } from "react";
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
import { Search, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APIService } from "@/lib/services";
import { ApplicationFilters } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import {
  formatDate,
  formatDateForAPI,
  parseDateFromDDMMYYYY,
} from "@/lib/utils";
import { buildListFilters } from "@/lib/list-filters";

// Interface for loan application data from API
interface LoanApplicationData {
  id: string;
  date: string;
  applicantName: string;
  fatherName: string;
  motherName: string;
  address: string;
  reason: string;
  aadhaar?: string;
  incomeCertificate?: string;
  moolNiwas?: string;
  photo?: string;
}

export default function LoanPaymentListPage() {
  const [applications, setApplications] = useState<LoanApplicationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState(""); // display dd-mm-yyyy
  const [dateTo, setDateTo] = useState(""); // display dd-mm-yyyy
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const router = useRouter();
  const { toast } = useToast();

  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);
  const [dateFromObj, setDateFromObj] = useState<Date | undefined>(undefined);
  const [dateToObj, setDateToObj] = useState<Date | undefined>(undefined);
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [villageFilter, setVillageFilter] = useState<string>("all");

  // Extract village from address (assuming village is the last part before district/state)
  const extractVillageFromAddress = (address: string): string => {
    if (!address) return "";
    // Split by common separators and take the first meaningful part
    const parts = address
      .split(/[,\-]/)
      .map((part) => part.trim())
      .filter(Boolean);
    return parts[0] || "";
  };

  // Fetch loan applications from API
  const fetchApplications = async (filters?: ApplicationFilters) => {
    try {
      setLoading(true);
      const response = await APIService.getLoanApplications({
        ...buildListFilters({ includeUserScope: true }),
        ...filters,
      });

      if (response.status && response.data) {
        setApplications(response.data);
        // Calculate total pages based on API response
        const totalItems = response.data.length;
        setTotalPages(Math.max(1, Math.ceil(totalItems / itemsPerPage)));
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to fetch loan applications",
          variant: "destructive",
        });
        setApplications([]);
      }
    } catch (error) {
      console.error("Error fetching loan applications:", error);
      toast({
        title: "Error",
        description: "Failed to fetch loan applications. Please try again.",
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

  const applyFilters = async () => {
    const filters = buildListFilters({
      search: searchTerm,
      dateFrom,
      dateTo,
      villageFilter,
      reasonFilter,
    });
    setCurrentPage(1);
    await fetchApplications(filters);
  };

  const paginatedApplications = applications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFromObj(date);
    setDateFrom(date ? formatDate(date) : "");
    setCurrentPage(1);
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateToObj(date);
    setDateTo(date ? formatDate(date) : "");
    setCurrentPage(1);
  };

  const handleReasonChange = (value: string) => {
    setReasonFilter(value);
    setCurrentPage(1);
  };

  const handleVillageChange = (value: string) => {
    setVillageFilter(value);
    setCurrentPage(1);
  };

  // Clear all filters
  const handleClearFilters = async () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setDateFromObj(undefined);
    setDateToObj(undefined);
    setReasonFilter("all");
    setVillageFilter("all");
    setCurrentPage(1);
    await fetchApplications();
  };

  // Get unique reasons and villages for filters
  const uniqueReasons = Array.from(
    new Set(applications.map((app) => app.reason))
  ).filter(Boolean);
  const uniqueVillages = Array.from(
    new Set(applications.map((app) => extractVillageFromAddress(app.address)))
  )
    .filter(Boolean)
    .sort();

  return (
    <div className="p-2 sm:p-4 md:p-6 relative">
      <div className="mb-3 md:mb-4 lg:mb-6">
        <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
          Loan Application Payment Distribution
        </h1>
        <p className="text-xs md:text-sm text-gray-600">
          Manage and review all loan application records.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3 md:space-y-4 mb-6">
        <div className="flex justify-between">
          {/* Search Bar */}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Clear Filters Button */}
          <div className="flex gap-2">
            <Button onClick={applyFilters} size="sm" className="text-xs md:text-sm">
              Apply Filters
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs md:text-sm"
              disabled={
                !searchTerm &&
                !dateFrom &&
                !dateTo &&
                reasonFilter === "all" &&
                villageFilter === "all"
              }
            >
              <X className="h-4 w-4" />
              Clear All Filters
            </Button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {/* Date From Picker */}
          <div className="flex flex-col space-y-2">
            <Label htmlFor="dateFrom" className="text-xs md:text-sm">
              From Date
            </Label>
            <div className="relative">
              <Input
                type="text"
                id="dateFrom"
                name="dateFrom"
                value={dateFrom}
                placeholder="dd-mm-yyyy"
                className="bg-background pr-10 text-xs md:text-sm"
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
                    className="absolute top-1/2 right-2 w-6 h-6 p-0 -translate-y-1/2"
                    tabIndex={-1}
                    type="button"
                  >
                    <CalendarDays className="w-3 h-3" />
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
          <div className="flex flex-col space-y-2">
            <Label htmlFor="dateTo" className="text-xs md:text-sm">
              To Date
            </Label>
            <div className="relative">
              <Input
                type="text"
                id="dateTo"
                name="dateTo"
                value={dateTo}
                placeholder="dd-mm-yyyy"
                className="bg-background pr-10 text-xs md:text-sm"
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
                    className="absolute top-1/2 right-2 w-6 h-6 p-0 -translate-y-1/2"
                    tabIndex={-1}
                    type="button"
                  >
                    <CalendarDays className="w-3 h-3" />
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

          {/* Reason Filter */}
          <div className="flex flex-col space-y-2">
            <Label htmlFor="reasonFilter" className="text-xs md:text-sm">
              Reason
            </Label>
            <Select value={reasonFilter} onValueChange={handleReasonChange}>
              <SelectTrigger className="text-xs md:text-sm">
                <SelectValue placeholder="All Reasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reasons</SelectItem>
                {uniqueReasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Village Filter */}
          <div className="flex flex-col space-y-2">
            <Label htmlFor="villageFilter" className="text-xs md:text-sm">
              Village
            </Label>
            <Select value={villageFilter} onValueChange={handleVillageChange}>
              <SelectTrigger className="text-xs md:text-sm">
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
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm md:text-base lg:text-lg">
            All Loan Records ({applications.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-gray-500 px-4">
              Loading loan applications...
            </div>
          ) : paginatedApplications.length === 0 ? (
            <div className="text-center py-8 text-gray-500 px-4">
              {searchTerm ||
              dateFrom ||
              dateTo ||
              reasonFilter !== "all" ||
              villageFilter !== "all"
                ? "No loan applications found matching your search."
                : "No loan applications found."}
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[700px] lg:min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs md:text-sm">
                        Application ID
                      </TableHead>
                      <TableHead className="text-xs md:text-sm">
                        Applicant Name
                      </TableHead>
                      <TableHead className="text-xs md:text-sm hidden sm:table-cell">
                        Father Name
                      </TableHead>
                      <TableHead className="text-xs md:text-sm hidden lg:table-cell">
                        Mother Name
                      </TableHead>
                      <TableHead className="text-xs md:text-sm">
                        Reason
                      </TableHead>
                      <TableHead className="text-xs md:text-sm">
                        Application Date
                      </TableHead>
                      <TableHead className="text-xs md:text-sm">
                        Paid Amount
                      </TableHead>
                      <TableHead className="text-xs md:text-sm hidden md:table-cell">
                        Village
                      </TableHead>
                      <TableHead className="text-xs md:text-sm hidden lg:table-cell">
                        Address
                      </TableHead>
                      <TableHead className="text-xs md:text-sm min-w-[100px] sm:min-w-[120px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedApplications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium text-xs md:text-sm">
                          {application.id}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm">
                          {application.applicantName}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm hidden sm:table-cell">
                          {application.fatherName}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm hidden lg:table-cell">
                          {application.motherName}
                        </TableCell>
                        <TableCell className="capitalize text-xs md:text-sm">
                          {application.reason}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm">
                          {formatDate(application.date)}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm font-semibold">
                          ₹{(application as any).totalPaidAmount || (application as any).paidAmount || (application as any).paid_amount || 0}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm hidden md:table-cell">
                          {extractVillageFromAddress(application.address)}
                        </TableCell>
                        <TableCell
                          className="text-xs md:text-sm hidden lg:table-cell max-w-[150px] lg:max-w-[200px] truncate"
                          title={application.address}
                        >
                          {application.address}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              router.push(
                                `/dashboard/payment-management/loan-payment/${application.id}`
                              )
                            }
                            className="w-full text-xs md:text-sm"
                          >
                            Add Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
  );
}
