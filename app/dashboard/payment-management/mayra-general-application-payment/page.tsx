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
import { Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mayraApplicationAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateForAPI, parseDateFromDDMMYYYY, getCurrentUserInfo } from "@/lib/utils";
import { buildListFilters } from "@/lib/list-filters";

interface MayraApplicationData {
  id: string;
  formNumber: string;
  applicationDate: string;
  applicantName: string;
  fatherName: string;
  gotra: string;
  address: string;
  gender: string;
  totalAmount: string | number;
  paymentAmount: string | number;
  pendingAmount: string | number;
  paymentMode?: string;
  paymentDate?: string;
}

export default function MayraGeneralApplicationPaymentListPage() {
  const [applications, setApplications] = useState<MayraApplicationData[]>([]);
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
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [villageFilter, setVillageFilter] = useState<string>("all");

  const uniqueVillages = Array.from(
    new Set(applications.map((app) => app.address).filter(Boolean))
  ).sort();

  const fetchApplications = async (filters?: Record<string, string>) => {
    try {
      setLoading(true);
      const response = await mayraApplicationAPI.getAll({
        ...buildListFilters({ includeUserScope: true }),
        ...filters,
      });

      if (response.status) {
        setApplications(response.data || []);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to fetch mayra applications",
          variant: "destructive",
        });
        setApplications([]);
      }
    } catch (error) {
      console.error("Error fetching mayra applications:", error);
      toast({
        title: "Error",
        description: "Failed to fetch mayra applications. Please try again.",
        variant: "destructive",
      });
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

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
    await fetchApplications(filters);
    setCurrentPage(1);
  };

  const clearFilters = async () => {
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

  const totalPages = Math.max(1, Math.ceil(applications.length / itemsPerPage));
  const paginatedApplications = applications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const hasActiveFilters =
    searchTerm || dateFrom || dateTo || genderFilter !== "all" || villageFilter !== "all";

  const getPaymentStatus = (application: MayraApplicationData) => {
    const paymentAmount = parseFloat(String(application.paymentAmount || "0"));
    const pendingAmount = parseFloat(String(application.pendingAmount || "0"));
    if (paymentAmount === 0) return { status: "Pending", color: "text-red-600" };
    if (pendingAmount > 0) return { status: "Partial", color: "text-yellow-600" };
    return { status: "Completed", color: "text-green-600" };
  };

  return (
    <div className="p-3 md:p-6 relative">
      <div className="mb-4 md:mb-6">
        <h1 className="text-lg md:text-2xl font-bold text-gray-900">
          Mayra General Application Payment
        </h1>
        <p className="text-xs md:text-sm text-gray-600">
          Manage installment payments for mayra registration applications.
        </p>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, form number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={applyFilters} variant="secondary" size="sm">
            Search
          </Button>
          {hasActiveFilters && (
            <Button onClick={clearFilters} variant="outline" size="sm">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-sm">From Date</Label>
            <div className="relative">
              <Input value={dateFrom} readOnly placeholder="dd-mm-yyyy" className="w-36" />
              <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="absolute right-0 top-0 h-full px-2" type="button">
                    <CalendarDays className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFromObj}
                    onSelect={(d) => {
                      setDateFromObj(d);
                      setDateFrom(d ? formatDate(d) : "");
                      setDateFromOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm">To Date</Label>
            <div className="relative">
              <Input value={dateTo} readOnly placeholder="dd-mm-yyyy" className="w-36" />
              <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="absolute right-0 top-0 h-full px-2" type="button">
                    <CalendarDays className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateToObj}
                    onSelect={(d) => {
                      setDateToObj(d);
                      setDateTo(d ? formatDate(d) : "");
                      setDateToOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm">Gender</Label>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {GENDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-sm">Village</Label>
            <Select value={villageFilter} onValueChange={setVillageFilter}>
              <SelectTrigger className="w-40">
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

          <Button onClick={applyFilters} variant="secondary" size="sm">
            Apply Filters
          </Button>
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
            <div className="text-center py-8 text-gray-500 px-4">Loading applications...</div>
          ) : paginatedApplications.length === 0 ? (
            <div className="text-center py-8 text-gray-500 px-4">
              {hasActiveFilters ? "No records found matching your search." : "No applications found."}
            </div>
          ) : (
            <>
              <div className="block md:hidden space-y-3 p-4">
                {paginatedApplications.map((application) => {
                  const paymentStatus = getPaymentStatus(application);
                  return (
                    <Card key={application.id} className="p-4">
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold text-sm">{application.applicantName}</h3>
                          <p className="text-xs text-gray-600">Form: {application.formNumber}</p>
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
                            <span className="text-gray-500">Total:</span>
                            <p className="font-medium">₹{application.totalAmount || 0}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Pending:</span>
                            <p className="text-red-600 font-medium">₹{application.pendingAmount || 0}</p>
                          </div>
                        </div>
                        <p className={`text-xs font-medium ${paymentStatus.color}`}>
                          Status: {paymentStatus.status}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() =>
                            router.push(
                              `/dashboard/payment-management/mayra-general-application-payment/${application.id}`
                            )
                          }
                        >
                          Add Payment
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table className="w-full min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Form Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Father Name</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Gotra</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Total Fee</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Application Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedApplications.map((application) => {
                      const paymentStatus = getPaymentStatus(application);
                      return (
                        <TableRow key={application.id}>
                          <TableCell>{application.formNumber}</TableCell>
                          <TableCell>{application.applicantName}</TableCell>
                          <TableCell>{application.fatherName}</TableCell>
                          <TableCell className="capitalize">{application.gender || "N/A"}</TableCell>
                          <TableCell>{application.gotra}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={application.address}>
                            {application.address}
                          </TableCell>
                          <TableCell>₹{application.totalAmount || 0}</TableCell>
                          <TableCell className="text-green-600">₹{application.paymentAmount || 0}</TableCell>
                          <TableCell className="text-red-600">₹{application.pendingAmount || 0}</TableCell>
                          <TableCell className={paymentStatus.color}>{paymentStatus.status}</TableCell>
                          <TableCell>{formatDate(application.applicationDate)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                router.push(
                                  `/dashboard/payment-management/mayra-general-application-payment/${application.id}`
                                )
                              }
                            >
                              Add Payment
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
