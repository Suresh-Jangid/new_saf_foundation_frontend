"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { formatDate, formatDateForInput, parseDateFromDDMMYYYY, isValidDate as isValidDateUtil } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import APIService from "@/lib/services";
import { PaymentManagement, PaymentFilters, PaymentListItem } from "@/lib/services";
import { Pagination } from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 50;

// Unified interface for all payment data from different sources
interface UnifiedPaymentData {
  id: string | number;
  date: string;
  type?: string; // For payment_management
  amount: string | number;
  remark?: string; // For payment_management
  name?: string; // For other sources
  source: string;
}

// Get source display name helper (moved before component for use in export)
const getSourceDisplayName = (source: string) => {
  // Labels per the client's rename mapping (sheet #12).
  const sourceMap: Record<string, string> = {
    'payment_management': 'Manual Payment',
    'applications': 'General Marriage Application',
    'applications_male': 'General Marriage Application (Boys)',
    'applications_female': 'General Marriage Application (Girls)',
    'applications_installment': 'General Marriage Application Installment',
    'application_insurance': 'Insurance Bima Application',
    'application_insurance_installment': 'Insurance Bima Application Installment',
    'loan_applications': 'Loan Application Payment',
    'financial_help': 'Financial Application Payment',
    'suraksha_bima_yojana': 'Insurance Bima Payment',
    'marriage_congratulations': 'General Marriage Congratulations Payment',
    'marriage_congratulations_emi': 'General Marriage Congratulations Payment',
    'mayra_registration': 'Mayra General Application',
    'mayra_congratulations_emi': 'Mayra Congratulations Payment',
    'pension_yojana': 'Pension Yojana Application Payment',
    'agent_payouts': 'Agents commission Payment'
  };
  return sourceMap[source] || source;
};

export default function CashFlowPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<UnifiedPaymentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [from, setFrom] = useState<Date | undefined>();
  const [fromValue, setFromValue] = useState(""); // For input value
  const [fromOpen, setFromOpen] = useState(false); // For popover open state
  const [to, setTo] = useState<Date | undefined>();
  const [toValue, setToValue] = useState(""); // For input value
  const [toOpen, setToOpen] = useState(false); // For popover open state
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [editExpenseOpen, setEditExpenseOpen] = useState(false);
  const [deleteExpenseOpen, setDeleteExpenseOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseType, setExpenseType] = useState("Out");
  const [expenseDate, setExpenseDate] = useState(
    formatDateForInput(new Date())
  );
  const [addDateObj, setAddDateObj] = useState<Date | undefined>(new Date());
  const [addDateOpen, setAddDateOpen] = useState(false);
  const [addDateValue, setAddDateValue] = useState<string>(
    formatDate(new Date())
  );
  const [selectedPayment, setSelectedPayment] =
    useState<UnifiedPaymentData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netBalance, setNetBalance] = useState(0);

  const mapPaymentItem = (item: PaymentListItem): UnifiedPaymentData => ({
    id: item.id,
    date: item.date,
    type: item.type || undefined,
    amount: item.amount,
    remark: item.remark || undefined,
    name: item.name || undefined,
    source: item.source,
  });

  const fetchPayments = async (
    page = 1,
    filterOverrides?: {
      search?: string;
      sourceFilter?: string;
      from?: Date | undefined;
      to?: Date | undefined;
    }
  ) => {
    setLoading(true);
    try {
      const activeSearch = filterOverrides?.search ?? search;
      const activeSource = filterOverrides?.sourceFilter ?? sourceFilter;
      const activeFrom =
        filterOverrides?.from !== undefined ? filterOverrides.from : from;
      const activeTo =
        filterOverrides?.to !== undefined ? filterOverrides.to : to;

      const filters: PaymentFilters = {
        page,
        limit: ITEMS_PER_PAGE,
      };

      if (activeSearch) filters.search = activeSearch;
      if (activeFrom) filters.from = format(activeFrom, "yyyy-MM-dd");
      if (activeTo) filters.to = format(activeTo, "yyyy-MM-dd");
      if (activeSource && activeSource !== "all") filters.source = activeSource;

      const response = await APIService.getPayments(filters);
      if (response.status) {
        const unifiedData: UnifiedPaymentData[] = (response.data || []).map(mapPaymentItem);
        setPayments(unifiedData);
        setTotalIncome(response.totalIncome ?? 0);
        setTotalExpenses(response.totalExpenses ?? 0);
        setNetBalance(response.netBalance ?? 0);
        setCurrentPage(response.pagination?.page ?? page);
        setTotalPages(response.pagination?.totalPages ?? 1);
        setTotalRecords(response.pagination?.totalRecords ?? unifiedData.length);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to load payments",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to load payments:", error);
      toast({
        title: "Error",
        description: "Failed to load payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load payments on component mount
  useEffect(() => {
    fetchPayments(1);
  }, []);

  const handleFilter = async () => {
    setCurrentPage(1);
    await fetchPayments(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchPayments(page);
  };

  const handleEdit = (payment: UnifiedPaymentData) => {
    // Only allow editing payment_management records
    if (payment.source !== 'payment_management') {
      toast({
        title: "Info",
        description: "Only manual payments can be edited",
        variant: "default",
      });
      return;
    }
    
    setSelectedPayment(payment);
    setExpenseAmount(payment.amount.toString());
    setExpenseNote(payment.remark || "");
    setExpenseType(payment.type || "Out");
    setExpenseDate(payment.date);
    setEditExpenseOpen(true);
  };

  const handleDelete = (payment: UnifiedPaymentData) => {
    // Only allow deleting payment_management records
    if (payment.source !== 'payment_management') {
      toast({
        title: "Info",
        description: "Only manual payments can be deleted",
        variant: "default",
      });
      return;
    }
    
    setSelectedPayment(payment);
    setDeleteExpenseOpen(true);
  };

  const handleUpdatePayment = async () => {
    if (!selectedPayment || !expenseAmount || !expenseNote) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const paymentData: Partial<PaymentManagement> = {
        date: expenseDate,
        type: expenseType,
        amount: parseFloat(expenseAmount),
        remark: expenseNote,
      };

      const response = await APIService.updatePayment(
        selectedPayment.id!.toString(),
        paymentData
      );
      if (response.status) {
        toast({
          title: "Success",
          description: "Payment updated successfully",
        });
        resetEditForm();
        setEditExpenseOpen(false);
        fetchPayments(currentPage);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to update payment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to update payment:", error);
      toast({
        title: "Error",
        description: "Failed to update payment",
        variant: "destructive",
      });
    }
  };

  const handleDeletePayment = async () => {
    if (!selectedPayment) return;

    try {
      const response = await APIService.deletePayment(selectedPayment.id!.toString());
      if (response.status) {
        toast({
          title: "Success",
          description: "Payment deleted successfully",
        });
        setDeleteExpenseOpen(false);
        setSelectedPayment(null);
        fetchPayments(currentPage);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to delete payment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to delete payment:", error);
      toast({
        title: "Error",
        description: "Failed to delete payment",
        variant: "destructive",
      });
    }
  };

  const resetAddForm = () => {
    setExpenseAmount("");
    setExpenseNote("");
    setExpenseType("Out");
    setExpenseDate(formatDateForInput(new Date()));
    setAddDateObj(new Date());
    setAddDateValue(formatDate(new Date()));
  };

  const resetEditForm = () => {
    setSelectedPayment(null);
    setExpenseAmount("");
    setExpenseNote("");
    setExpenseType("Out");
    setExpenseDate(formatDateForInput(new Date()));
  };

  // Helper to check valid date (using util for consistency)
  function isValidDate(d: Date) {
    return isValidDateUtil(d);
  }

  const submitNewPayment = async () => {
    console.log("submitNewPayment called", {
      expenseAmount,
      expenseNote,
      expenseDate,
      addDateObj,
      expenseType
    });
    
    if (!expenseAmount || !expenseNote) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const parsedAmount = parseFloat(expenseAmount);
    if (Number.isNaN(parsedAmount)) {
      toast({
        title: "Error",
        description: "Amount must be a number",
        variant: "destructive",
      });
      return;
    }
    if (!expenseDate || !addDateObj) {
      toast({
        title: "Error",
        description: "Please pick a valid date",
        variant: "destructive",
      });
      return;
    }

    try {
      const paymentData: PaymentManagement = {
        date: expenseDate, // yyyy-MM-dd
        type: expenseType,
        amount: parsedAmount,
        remark: expenseNote,
      };

      console.log("paymentData", paymentData);

      const response = await APIService.createPayment(paymentData);
      if (response.status) {
        toast({
          title: "Success",
          description: "Payment added successfully",
        });
        resetAddForm();
        setAddExpenseOpen(false);
        fetchPayments(currentPage);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to add payment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to add payment:", error);
      toast({
        title: "Error",
        description: "Failed to add payment",
        variant: "destructive",
      });
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = payments;
      
      if (dataToExport.length === 0) {
        toast({
          title: "Error",
          description: "No data to export",
          variant: "destructive",
        });
        return;
      }

      // Prepare data for Excel export
      const excelData = dataToExport.map((flow) => ({
        "Date": formatDate(flow.date),
        "Source": getSourceDisplayName(flow.source),
        "Name/Type": flow.name || flow.type || 'N/A',
        "Remark": flow.remark || 'N/A',
        "Amount": parseFloat(flow.amount.toString()),
        "Type": flow.type || (flow.source !== 'payment_management' ? 'In' : 'N/A'),
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Cash Flow");

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cash_flow_${new Date().toISOString().split("T")[0]}.xlsx`;
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

  return (
    <Card className="p-4">
      {/* Action Button Section */}
      <div className="mb-6">
        <AlertDialog
          open={addExpenseOpen}
          onOpenChange={(open) => {
            setAddExpenseOpen(open);
            if (!open) {
              resetAddForm();
            }
          }}
        >
          <AlertDialogTrigger asChild>
            <Button variant="default" className="mb-4">
              Add Payment
            </Button>
          </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Add Payment</AlertDialogTitle>
                <AlertDialogDescription>
                  Fill in the details to add a new payment record.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await submitNewPayment();
                }}
                className="space-y-4"
              >
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    htmlFor="add-date"
                  >
                    Date
                  </label>
                  <div className="relative flex gap-2">
                    <Input
                      id="add-date"
                      type="text"
                      value={addDateValue}
                      placeholder="dd-mm-yyyy"
                      className="bg-background pr-10"
                      onChange={(e) => {
                        const str = e.target.value;
                        setAddDateValue(str);
                        const date = parseDateFromDDMMYYYY(str);
                        if (date) {
                          setAddDateObj(date);
                          setExpenseDate(formatDateForInput(date));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setAddDateOpen(true);
                        }
                      }}
                      required
                    />
                    <Popover open={addDateOpen} onOpenChange={setAddDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="add-date-picker"
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
                          selected={addDateObj}
                          captionLayout="dropdown"
                          month={addDateObj}
                          onMonthChange={setAddDateObj}
                          onSelect={(date: any) => {
                            setAddDateObj(date);
                            setAddDateValue(date ? formatDate(date) : "");
                            setExpenseDate(date ? formatDateForInput(date) : "");
                            setAddDateOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    htmlFor="add-type"
                  >
                    Type
                  </label>
                  <select
                    id="add-type"
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="In">Income</option>
                    <option value="Out">Expense</option>
                  </select>
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    htmlFor="expense-amount"
                  >
                    Amount
                  </label>
                  <Input
                    id="expense-amount"
                    type="number"
                    min="0"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    htmlFor="expense-note"
                  >
                    Note
                  </label>
                  <Input
                    id="expense-note"
                    type="text"
                    value={expenseNote}
                    onChange={(e) => setExpenseNote(e.target.value)}
                    required
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    type="button"
                    onClick={() => {
                      setAddExpenseOpen(false);
                      resetAddForm();
                    }}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <Button type="submit">
                    Add
                  </Button>
                </AlertDialogFooter>
              </form>
            </AlertDialogContent>
          </AlertDialog>

        {/* Edit Payment Dialog */}
        <AlertDialog
          open={editExpenseOpen}
          onOpenChange={(open) => {
            setEditExpenseOpen(open);
            if (!open) {
              resetEditForm();
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Payment</AlertDialogTitle>
              <AlertDialogDescription>
                Update the payment details.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="edit-date"
                >
                  Date
                </label>
                <Input
                  id="edit-date"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="edit-type"
                >
                  Type
                </label>
                <select
                  id="edit-type"
                  value={expenseType}
                  onChange={(e) => setExpenseType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="In">Income</option>
                  <option value="Out">Expense</option>
                </select>
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="edit-amount"
                >
                  Amount
                </label>
                <Input
                  id="edit-amount"
                  type="number"
                  min="0"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="edit-note"
                >
                  Note
                </label>
                <Input
                  id="edit-note"
                  type="text"
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  required
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel
                type="button"
                onClick={() => {
                  setEditExpenseOpen(false);
                  resetEditForm();
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction type="button" onClick={handleUpdatePayment}>
                Update
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Payment Dialog */}
        <AlertDialog
          open={deleteExpenseOpen}
          onOpenChange={setDeleteExpenseOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this payment? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                type="button"
                onClick={() => setDeleteExpenseOpen(false)}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                type="button"
                onClick={handleDeletePayment}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Filter Section */}
      <Card className="p-4 mb-6 bg-gray-50 border-2 border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* From Date Picker */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">From Date</label>
            <div className="relative">
              <Input
                type="text"
                id="from-date"
                name="from-date"
                value={fromValue}
                placeholder="dd-mm-yyyy"
                className="bg-white pr-10 border-gray-300"
                onChange={(e) => {
                  const str = e.target.value;
                  setFromValue(str);
                  const date = parseDateFromDDMMYYYY(str);
                  if (date) setFrom(date);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setFromOpen(true);
                  }
                }}
                required={false}
              />
              <Popover open={fromOpen} onOpenChange={setFromOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="from-date-picker"
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
                    selected={from}
                    captionLayout="dropdown"
                    month={from}
                    onMonthChange={setFrom}
                    onSelect={(date: Date | undefined) => {
                      setFrom(date);
                      setFromValue(date ? formatDate(date) : "");
                      setFromOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {/* To Date Picker */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">To Date</label>
            <div className="relative">
              <Input
                type="text"
                id="to-date"
                name="to-date"
                value={toValue}
                placeholder="dd-mm-yyyy"
                className="bg-white pr-10 border-gray-300"
                onChange={(e) => {
                  const str = e.target.value;
                  setToValue(str);
                  const date = parseDateFromDDMMYYYY(str);
                  if (date) setTo(date);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setToOpen(true);
                  }
                }}
                required={false}
              />
              <Popover open={toOpen} onOpenChange={setToOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="to-date-picker"
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
                    selected={to}
                    captionLayout="dropdown"
                    month={to}
                    onMonthChange={setTo}
                    onSelect={(date: Date | undefined) => {
                      setTo(date);
                      setToValue(date ? formatDate(date) : "");
                      setToOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {/* Source Filter */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">Source</label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full bg-white border-gray-300">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {[
                  "payment_management",
                  "applications_male",
                  "applications_female",
                  "applications_installment",
                  "marriage_congratulations_emi",
                  "mayra_registration",
                  "mayra_congratulations_emi",
                  "application_insurance",
                  "application_insurance_installment",
                  "suraksha_bima_yojana",
                  "pension_yojana",
                  "loan_applications",
                  "financial_help",
                  "agent_payouts",
                ].map((src) => (
                  <SelectItem key={src} value={src}>
                    {getSourceDisplayName(src)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">
              Search
            </label>
            <Input
              placeholder="Search by name, remarks, type, or source"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border-gray-300"
            />
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-300">
          <Button 
            onClick={handleExportExcel} 
            variant="default"
            className="flex items-center gap-2"
            disabled={payments.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </Button>
          <Button onClick={handleFilter} variant="secondary">
            Apply Filter
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setSourceFilter("all");
              setFrom(undefined);
              setFromValue("");
              setTo(undefined);
              setToValue("");
              setCurrentPage(1);
              fetchPayments(1, {
                search: "",
                sourceFilter: "all",
                from: undefined,
                to: undefined,
              });
            }}
          >
            Clear Filter
          </Button>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">
                ₹{totalIncome.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">+</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Expenses
              </p>
              <p className="text-2xl font-bold text-red-600">
                ₹{totalExpenses.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold">-</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Balance</p>
              <p
                className={`text-2xl font-bold ${
                  netBalance >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                ₹{netBalance.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">=</span>
            </div>
          </div>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">
            All Records ({totalRecords.toLocaleString()} total)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-gray-500 px-4">
              Loading...
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 px-4">
              No records found.
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Name/Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((flow, idx) => (
                      <TableRow key={`${flow.source}-${flow.id}-${idx}`}>
                        <TableCell>{formatDate(flow.date)}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getSourceDisplayName(flow.source)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {flow.name || flow.type || 'N/A'}
                          {flow.remark && (
                            <div className="text-xs text-gray-500 mt-1">
                              {flow.remark}
                            </div>
                          )}
                        </TableCell>
                        <TableCell
                          className={`font-medium ${
                            flow.type === "Out" ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          ₹{parseFloat(flow.amount.toString()).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {flow.source === 'payment_management' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(flow)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(flow)}
                                >
                                  Delete
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-500">Read-only</span>
                            )}
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
                onPageChange={handlePageChange}
              />
            </>
          )}
        </CardContent>
      </Card>
    </Card>
  );
}
