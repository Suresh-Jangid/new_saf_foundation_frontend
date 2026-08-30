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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatDateForAPI, formatDateForInput, parseDateFromDDMMYYYY, getCurrentUserInfo } from "@/lib/utils";
import APIService from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { buildListFilters } from "@/lib/list-filters";

interface SurakshaBimaData {
  id: number;
  date: string;
  codeNumber: string;
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
}

export default function SurakshaBimaYojanaPaymentListPage() {
  const [payments, setPayments] = useState<SurakshaBimaData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState(""); // display dd-mm-yyyy
  const [dateTo, setDateTo] = useState(""); // display dd-mm-yyyy
  const [villageFilter, setVillageFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalRecords, setTotalRecords] = useState(0);
  const router = useRouter();

  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);
  const [dateFromObj, setDateFromObj] = useState<Date | undefined>(undefined);
  const [dateToObj, setDateToObj] = useState<Date | undefined>(undefined);

  // Get unique villages from address data
  const uniqueVillages = Array.from(new Set(payments.map(payment => payment.address?.split(',')[0]?.trim()).filter(Boolean))).sort();
  
  // Get unique genders
  const uniqueGenders = Array.from(new Set(payments.map(payment => payment.gender).filter(Boolean))).sort();


  // Reset to page 1 when village filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [villageFilter]);

  // Check if any filters are active
  const hasActiveFilters = searchTerm || dateFrom || dateTo || villageFilter || (genderFilter && genderFilter !== "all");
  
  function isValidDate(date: Date) {
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Load Suraksha Bima data from API (similar to general application pattern)
  const loadSurakshaBimaData = async (filters?: Record<string, any>) => {
    setLoading(true);
    try {
      const filtersWithUserInfo = {
        ...buildListFilters({ includeUserScope: true }),
        ...filters,
      };
      
      const response = await APIService.getSurakshaBimaYojanas(filtersWithUserInfo);
      if (response.status) {
        setPayments(response.data || []);
        setTotalRecords(response.data?.length || 0);
        setError(null);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to load Suraksha Bima data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to load Suraksha Bima data:", error);
      toast({
        title: "Error",
        description: "Failed to load Suraksha Bima data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount only
  useEffect(() => {
    loadSurakshaBimaData();
  }, []);

  // Apply filters function (similar to general application pattern)
  const applyFilters = async () => {
    const filters = buildListFilters({
      search: searchTerm,
      dateFrom,
      dateTo,
      genderFilter,
      villageFilter: villageFilter || undefined,
    });
    await loadSurakshaBimaData(filters);
    setCurrentPage(1);
  };

  // Clear filters function
  const clearFilters = async () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setDateFromObj(undefined);
    setDateToObj(undefined);
    setVillageFilter("");
    setGenderFilter("all");
    setCurrentPage(1);
    await loadSurakshaBimaData();
  };

  // Separate effect for page changes (no API call needed since we have all data)
  // This effect is just for updating the view when page changes

  const totalFilteredRecords = payments.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredRecords / itemsPerPage));
  const paginatedPayments = payments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="p-4 md:p-6 relative">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Insurance Bima Payment Records
          </h1>
          <p className="text-sm text-gray-600">
            Loading Insurance Bima Payment records...
          </p>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 relative">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Insurance Bima Payment Records
          </h1>
          <p className="text-sm text-gray-600">
            Error loading Insurance Bima Payment records.
          </p>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 relative">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
          Insurance Bima Payment Records
        </h1>
        <p className="text-sm text-gray-600">
          Manage and review all Insurance Bima Payment records.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        {/* Search and Clear Filters Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={applyFilters}
              variant="secondary"
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              Apply Filters
            </Button>
            {hasActiveFilters && (
              <Button
                variant="destructive"
                onClick={clearFilters}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  setCurrentPage(1);
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
                    onSelect={(date: any) => {
                      setDateFromObj(date);
                      setDateFrom(date ? formatDate(date) : "");
                      setDateFromOpen(false);
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
                  setCurrentPage(1);
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
                    onSelect={(date: any) => {
                      setDateToObj(date);
                      setDateTo(date ? formatDate(date) : "");
                      setDateToOpen(false);
                      setCurrentPage(1);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Village Filter */}
          <div className="flex flex-col">
            <Label htmlFor="villageFilter" className="pb-2">Village</Label>
            <Select
              value={villageFilter}
              onValueChange={(value) => {
                setVillageFilter(value === "all" ? "" : value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select village" />
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

          {/* Gender Filter */}
          <div className="flex flex-col">
            <Label htmlFor="genderFilter" className="pb-2">Gender</Label>
            <Select
              value={genderFilter}
              onValueChange={(value) => {
                setGenderFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                {uniqueGenders.map((gender) => (
                  <SelectItem key={gender} value={gender}>
                    {gender}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">
            All Insurance Bima Payment Records ({totalFilteredRecords} total)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {paginatedPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 px-4">
              {hasActiveFilters
                ? "No records found matching your filters."
                : "No records found."}
            </div>
          ) : (
            <>
              <div className="w-full">
                <Table className="w-full min-w-[800px] overflow-x-auto">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bima Number</TableHead>
                      <TableHead>Applicant Name</TableHead>
                      <TableHead>Father Name</TableHead>
                      <TableHead>Village</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead className="min-w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.bimaNumber}</TableCell>
                        <TableCell>{payment.applicantName}</TableCell>
                        <TableCell>{payment.fatherName}</TableCell>
                        <TableCell>{payment.address?.split(',')[0]?.trim() || 'N/A'}</TableCell>
                        <TableCell>₹{payment.totalPaidAmount}</TableCell>
                         <TableCell>{formatDate(payment.date)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            payment.payment_status === 1 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {payment.payment_status === 1 ? 'Paid' : 'Pending'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col sm:flex-row gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                router.push(`/dashboard/payment-management/suraksha-bima-yojana-payment/${payment.id}`)
                              }
                              className="w-full sm:w-auto"
                            >
                              Add Payment
                            </Button>
                          </div>
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
