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
import { Search, Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APIService } from "@/lib/services";
import { ApplicationFilters } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateForAPI, parseDateFromDDMMYYYY, getCurrentUserInfo } from "@/lib/utils";
import { buildListFilters } from "@/lib/list-filters";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// Interface for marriage congratulations data from API
interface MarriageCongratulationsData {
  id: string;
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
}

export default function MarriageCongratulationsPaymentListPage() {
  const [applications, setApplications] = useState<MarriageCongratulationsData[]>([]);
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
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [villageFilter, setVillageFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);


  
  function isValidDate(date: Date) {
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Fetch marriage congratulations from API
  const fetchApplications = async (filters?: ApplicationFilters) => {
    try {
      setLoading(true);
      
      const filtersWithUserInfo = {
        ...buildListFilters({ includeUserScope: true }),
        ...filters,
      };
      
      const response = await APIService.getMarriageCongratulations(filtersWithUserInfo);
      
      if (response.status && response.data) {
        setApplications(response.data);
        // Calculate total pages based on API response
        const totalItems = response.data.length;
        setTotalPages(Math.max(1, Math.ceil(totalItems / itemsPerPage)));
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to fetch marriage congratulations",
          variant: "destructive",
        });
        setApplications([]);
      }
    } catch (error) {
      console.error("Error fetching marriage congratulations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch marriage congratulations. Please try again.",
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
      genderFilter,
      villageFilter,
    });
    setCurrentPage(1);
    await fetchApplications(filters);
  };

  const paginatedApplications = applications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle search and filter changes
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

  const handleGenderChange = (value: string) => {
    setGenderFilter(value);
    setCurrentPage(1);
  };

  const handleVillageChange = (value: string) => {
    setVillageFilter(value);
    setCurrentPage(1);
  };

  const clearAllFilters = async () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setDateFromObj(undefined);
    setDateToObj(undefined);
    setGenderFilter("all");
    setVillageFilter("all");
    setCurrentPage(1);
    await fetchApplications();
  };

  // Get unique genders for filter
  const uniqueGenders = Array.from(new Set(applications.map(app => app.gender))).filter(Boolean);

  // Get unique villages from addresses
  const uniqueVillages = Array.from(new Set(
    applications
      .map(app => {
        const address = app.address || "";
        return address.split(/[,\s]/)[0]?.trim() || "";
      })
      .filter(Boolean)
  )).sort();

  // Check if any filters are active
  const hasActiveFilters = searchTerm || dateFrom || dateTo || genderFilter !== "all" || villageFilter !== "all";

  return (
    <div className="p-3 md:p-6 relative">
      <div className="mb-4 md:mb-6">
        <h1 className="text-lg md:text-2xl font-bold text-gray-900">
          General Marriage Congratulations Payment Distribution
        </h1>
        <p className="text-xs md:text-sm text-gray-600">
          Manage and review all marriage congratulations application records.
        </p>
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by name, marriage number, or code..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-between">
          {/* Mobile Filter Button */}
          <div className="md:hidden">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <span className="ml-1 h-2 w-2 bg-blue-500 rounded-full"></span>
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
                        value={dateFrom}
                        placeholder="dd-mm-yyyy"
                        className="bg-background pr-10"
                        onChange={(e) => {
                          const str = e.target.value;
                          setDateFrom(str);
                          const parsed = parseDateFromDDMMYYYY(str);
                          setDateFromObj(parsed || undefined);
                        }}
                      />
                      <Popover>
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
                            onSelect={handleDateFromChange}
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
                        value={dateTo}
                        placeholder="dd-mm-yyyy"
                        className="bg-background pr-10"
                        onChange={(e) => {
                          const str = e.target.value;
                          setDateTo(str);
                          const parsed = parseDateFromDDMMYYYY(str);
                          setDateToObj(parsed || undefined);
                        }}
                      />
                      <Popover>
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
                            onSelect={handleDateToChange}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Gender Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="genderFilter">Gender</Label>
                    <Select value={genderFilter} onValueChange={handleGenderChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Genders" />
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

                  {/* Village Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="villageFilter">Village</Label>
                    <Select value={villageFilter} onValueChange={handleVillageChange}>
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

                  <Button onClick={applyFilters} className="w-full">
                    Apply Filters
                  </Button>

                  {/* Clear Filters Button */}
                  <Button
                    variant="outline"
                    onClick={clearAllFilters}
                    className="w-full"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Filters */}
          <div className="hidden md:flex items-center gap-3">
            {/* Date From Picker */}
            <div className="flex flex-col">
              <Label htmlFor="dateFrom" className="pb-2 text-xs">From Date</Label>
              <div className="relative">
                <Input
                  type="text"
                  id="dateFrom"
                  value={dateFrom}
                  placeholder="dd-mm-yyyy"
                  className="bg-background pr-10 w-32"
                  onChange={(e) => {
                    const str = e.target.value;
                    setDateFrom(str);
                    const parsed = parseDateFromDDMMYYYY(str);
                    setDateFromObj(parsed || undefined);
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
                      onSelect={handleDateFromChange}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Date To Picker */}
            <div className="flex flex-col">
              <Label htmlFor="dateTo" className="pb-2 text-xs">To Date</Label>
              <div className="relative">
                <Input
                  type="text"
                  id="dateTo"
                  value={dateTo}
                  placeholder="dd-mm-yyyy"
                  className="bg-background pr-10 w-32"
                  onChange={(e) => {
                    const str = e.target.value;
                    setDateTo(str);
                    const parsed = parseDateFromDDMMYYYY(str);
                    setDateToObj(parsed || undefined);
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
                      onSelect={handleDateToChange}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Gender Filter */}
            <div className="flex flex-col">
              <Label htmlFor="genderFilter" className="pb-2 text-xs">Gender</Label>
              <Select value={genderFilter} onValueChange={handleGenderChange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Genders" />
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

            {/* Village Filter */}
            <div className="flex flex-col">
              <Label htmlFor="villageFilter" className="pb-2 text-xs">Village</Label>
              <Select value={villageFilter} onValueChange={handleVillageChange}>
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

            <div className="flex flex-col">
              <Label className="pb-2 text-xs">&nbsp;</Label>
              <Button onClick={applyFilters} size="sm" className="whitespace-nowrap">
                Apply
              </Button>
            </div>

            {/* Clear Filters Button */}
            <div className="flex flex-col">
              <Label className="pb-2 text-xs">&nbsp;</Label>
              <Button
                variant="destructive"
                onClick={clearAllFilters}
                size="sm"
                className="whitespace-nowrap"
              >
                  <X className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>

          {/* Active Filters Indicator */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
              Filters Active
            </div>
          )}
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm md:text-lg">
            All General Marriage Congratulations Payment Records ({applications.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-gray-500 px-4">
              Loading marriage congratulations applications...
            </div>
          ) : paginatedApplications.length === 0 ? (
            <div className="text-center py-8 text-gray-500 px-4">
              {hasActiveFilters
                ? "No marriage congratulations applications found matching your search."
                : "No marriage congratulations applications found."}
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 p-4">
                {paginatedApplications.map((application) => (
                  <div key={application.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm">{application.applicantName}</h3>
                        <p className="text-xs text-gray-600">Marriage: {application.marriageNumber}</p>
                        <p className="text-xs text-gray-600">Code: {application.codeNumber}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        application.payment_status === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {application.payment_status === 1 ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Father:</span>
                        <p className="font-medium">{application.fatherName}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Paid Amount:</span>
                        <p className="font-medium">₹{application.totalPaidAmount || "0"}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Gender:</span>
                        <p className="font-medium capitalize">{application.gender}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Gotra:</span>
                        <p className="font-medium">{application.gotra}</p>
                      </div>
                    </div>
                    
                    <div className="text-xs">
                      <span className="text-gray-500">Address:</span>
                      <p className="font-medium truncate">{application.address}</p>
                    </div>
                    
                    <div className="text-xs">
                      <span className="text-gray-500">Date:</span>
                      <p className="font-medium">{formatDate(application.date)}</p>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(`/dashboard/payment-management/marriage-congratulations-payment/${application.id}`)
                      }
                      className="w-full"
                    >
                      Add Payment
                    </Button>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <div className="w-full overflow-x-auto">
                  <Table className="w-full min-w-[900px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Marriage Number</TableHead>
                        <TableHead className="text-xs">Applicant Name</TableHead>
                        <TableHead className="text-xs">Father Name</TableHead>
                        <TableHead className="text-xs">Gender</TableHead>
                        <TableHead className="text-xs">Gotra</TableHead>
                        <TableHead className="text-xs">Address</TableHead>
                        <TableHead className="text-xs">Application Date</TableHead>
                        <TableHead className="text-xs">Paid Amount</TableHead>
                        <TableHead className="text-xs">Payment Status</TableHead>
                        <TableHead className="text-xs min-w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedApplications.map((application) => (
                        <TableRow key={application.id}>
                          <TableCell className="font-medium text-sm">{application.marriageNumber}</TableCell>
                          <TableCell className="text-sm">{application.applicantName}</TableCell>
                          <TableCell className="text-sm">{application.fatherName}</TableCell>
                          <TableCell className="text-sm capitalize">{application.gender}</TableCell>
                          <TableCell className="text-sm">{application.gotra}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate" title={application.address}>
                            {application.address}
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(application.date)}</TableCell>
                          <TableCell className="text-sm">₹{application.totalPaidAmount || "0"}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              application.payment_status === 1 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {application.payment_status === 1 ? 'Paid' : 'Unpaid'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                router.push(`/dashboard/payment-management/marriage-congratulations-payment/${application.id}`)
                              }
                            >
                              Add Payment
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
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
  );
}
