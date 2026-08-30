"use client";

import React, { useCallback, useEffect, useState } from "react";
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
import { Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { Label } from "@/components/ui/label";
import { APIService, ApplicationFilters, FinancialHelp } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { formatDate, parseDateFromDDMMYYYY } from "@/lib/utils";

export default function FinancePaymentListPage() {
  const [applications, setApplications] = useState<FinancialHelp[]>([]);
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

  const fetchApplications = useCallback(async (filters?: ApplicationFilters) => {
    try {
      setLoading(true);
      const response = await APIService.getFinancialHelps(filters);
      if (response.status && response.data) {
        setApplications(response.data as FinancialHelp[]);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to load financial help records",
          variant: "destructive",
        });
        setApplications([]);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to load financial help records",
        variant: "destructive",
      });
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const filteredApplications = applications.filter((app) => {
    const matchesName = app.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const appDate = app.date ? new Date(app.date) : null;
    const matchesDateFrom = dateFrom && appDate ? appDate >= new Date(dateFrom) : true;
    const matchesDateTo = dateTo && appDate ? appDate <= new Date(dateTo) : true;
    return matchesName && matchesDateFrom && matchesDateTo;
  });

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / itemsPerPage));
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 md:p-6 relative">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
          Finance Help Payment Distribution
        </h1>
        <p className="text-sm text-gray-600">
          Manage and review all financial help payment records.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
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
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="flex flex-col">
            <Label htmlFor="dateFrom" className="pb-2">From Date</Label>
            <div className="relative flex gap-2">
              <Input
                type="text"
                id="dateFrom"
                value={dateFrom}
                placeholder="dd-mm-yyyy"
                className="bg-background pr-10"
                onChange={(e) => {
                  const value = e.target.value;
                  setDateFrom(value);
                  const parsed = parseDateFromDDMMYYYY(value) || undefined;
                  if (parsed) setDateFromObj(parsed);
                  setCurrentPage(1);
                }}
              />
              <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="absolute top-1/2 right-2 w-8 h-8 p-0 -translate-y-1/2" type="button">
                    <CalendarDays className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dateFromObj}
                    onSelect={(date) => {
                      if (!date) return;
                      setDateFromObj(date);
                      setDateFrom(formatDate(date));
                      setDateFromOpen(false);
                      setCurrentPage(1);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex flex-col">
            <Label htmlFor="dateTo" className="pb-2">To Date</Label>
            <div className="relative flex gap-2">
              <Input
                type="text"
                id="dateTo"
                value={dateTo}
                placeholder="dd-mm-yyyy"
                className="bg-background pr-10"
                onChange={(e) => {
                  const value = e.target.value;
                  setDateTo(value);
                  const parsed = parseDateFromDDMMYYYY(value) || undefined;
                  if (parsed) setDateToObj(parsed);
                  setCurrentPage(1);
                }}
              />
              <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="absolute top-1/2 right-2 w-8 h-8 p-0 -translate-y-1/2" type="button">
                    <CalendarDays className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dateToObj}
                    onSelect={(date) => {
                      if (!date) return;
                      setDateToObj(date);
                      setDateTo(formatDate(date));
                      setDateToOpen(false);
                      setCurrentPage(1);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">
            All Financial Application Payment Records ({filteredApplications.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : paginatedApplications.length === 0 ? (
            <div className="text-center py-8 text-gray-500 px-4">
              {searchTerm || dateFrom || dateTo
                ? "No records found matching your search."
                : "No records found."}
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Form Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Father Name</TableHead>
                      <TableHead>Donated Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="min-w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedApplications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>{app.formNumber || app.id}</TableCell>
                        <TableCell>{app.name}</TableCell>
                        <TableCell>{app.fatherName}</TableCell>
                        <TableCell>₹{app.donatedAmount}</TableCell>
                        <TableCell>{formatDate(app.date)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              router.push(`/dashboard/payment-management/finance-help-payment/${app.id}`)
                            }
                          >
                            Add Payment details
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
