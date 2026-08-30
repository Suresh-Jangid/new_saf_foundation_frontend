"use client"

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";
import { useCRUD } from "@/hooks/use-crud";
import { API_ENDPOINTS } from "@/lib/api";
import { toast } from "sonner";
import { formatDate, calculateAge, isValidDate, formatDateForAPI, getCurrentUserInfo, parseDateFromDDMMYYYY } from "@/lib/utils";
import { X } from "lucide-react";

const PensionYojanaAddForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    date: "",
    dob: "",
    name: "",
    fatherName: "",
    gotra: "",
    age: "",
    village: "",
    tehsil: "",
    district: "",
    mobile: "",
    photo: null as File | null,
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    monthlyPension: "",
  });

  const { createApi } = useCRUD("pensionYojanaRecords", [], {
    create: API_ENDPOINTS.CREATE_PENSION_YOJANA,
  });

  // Calculate age when date of birth changes
  React.useEffect(() => {
    if (!form.dob) {
      setForm((prev) => ({ ...prev, age: "" }));
      return;
    }
    
    const calculatedAge = calculateAge(form.dob);
    setForm((prev) => ({ ...prev, age: calculatedAge !== null ? String(calculatedAge) : "" }));
  }, [form.dob]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!form.date || !form.dob || !form.name || !form.fatherName || !form.gotra || !form.age || !form.village || !form.mobile || !form.monthlyPension) {
      toast.error("कृपया सभी आवश्यक फील्ड भरें");
      return;
    }

    setIsLoading(true);

    try {
      const { addedby, addedby_id } = getCurrentUserInfo();
      
      // Format dates for API (yyyy-mm-dd format)
      // Parse dates from dd-mm-yyyy format first, then format for API
      const parseAndFormatDate = (dateString: string) => {
        if (!dateString) return ""
        const parsedDate = parseDateFromDDMMYYYY(dateString)
        return parsedDate ? formatDateForAPI(parsedDate) : ""
      }
      
      const apiFormData: Record<string, unknown> = {
        date: parseAndFormatDate(form.date),
        dob: parseAndFormatDate(form.dob),
        name: form.name,
        fatherName: form.fatherName,
        gotra: form.gotra,
        age: parseInt(form.age, 10) || 0,
        village: form.village,
        tehsil: form.tehsil,
        district: form.district,
        mobile: form.mobile,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        ifscCode: form.ifscCode,
        monthlyPension: form.monthlyPension,
        addedby,
        addedby_id,
      };

      if (form.photo) {
        apiFormData.photo = form.photo;
      }

      const success = await createApi(apiFormData);
      
      if (success) {
        router.push("/dashboard/pension-yojana");
      }
    } catch (error: any) {
      console.error("Error creating pension yojana application:", error);
      toast.error("पेंशन योजना आवेदन जोड़ने में त्रुटि");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Top Back Button and Title */}
      <div className="flex items-center mb-6">
        <Button type="button" variant="link" onClick={() => router.back()} className="mr-4">
          ← वापस जाएं / <br />Go Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">नई पेंशन योजना आवेदन जोड़ें</h1>
          <p className="text-sm text-gray-600">Add New Pension Yojana Application Payment</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>पेंशन योजना आवेदन विवरण / Pension Yojana Application Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="date">तिथि (Date) *</Label>
                <DatePicker
                  value={form.date}
                  onChange={(date) => setForm(prev => ({ ...prev, date: date ? formatDate(date) : "" }))}
                  id="date"
                />
              </div>
              <div>
                <Label htmlFor="name">नाम (Name) *</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="आवेदक का नाम"
                  required
                />
              </div>
              <div>
                <Label htmlFor="fatherName">पिता का नाम (Father's Name) *</Label>
                <Input
                  type="text"
                  id="fatherName"
                  name="fatherName"
                  value={form.fatherName}
                  onChange={handleChange}
                  placeholder="पिता का नाम"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <Label htmlFor="gotra">गोत्र (Gotra) *</Label>
                <Input
                  type="text"
                  id="gotra"
                  name="gotra"
                  value={form.gotra}
                  onChange={handleChange}
                  placeholder="गोत्र"
                  required
                />
              </div>
              <div>
                <Label htmlFor="dob">जन्म तिथि (Date of Birth) *</Label>
                <DatePicker
                  value={form.dob}
                  onChange={(date) => setForm(prev => ({ ...prev, dob: date ? formatDate(date) : "" }))}
                  id="dob"
                />
              </div>
              <div>
                <Label htmlFor="age">आयु (Age) *</Label>
                <Input
                  type="number"
                  id="age"
                  name="age"
                  value={form.age}
                  onChange={handleChange}
                  placeholder="आयु"
                  readOnly
                  required
                />
              </div>
              <div>
                <Label htmlFor="village">गाँव (Village) *</Label>
                <Input
                  type="text"
                  id="village"
                  name="village"
                  value={form.village}
                  onChange={handleChange}
                  placeholder="गाँव का नाम"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="tehsil">तहसील (Tehsil)</Label>
                <Input
                  type="text"
                  id="tehsil"
                  name="tehsil"
                  value={form.tehsil}
                  onChange={handleChange}
                  placeholder="तहसील"
                />
              </div>
              <div>
                <Label htmlFor="district">जिला (District)</Label>
                <Input
                  type="text"
                  id="district"
                  name="district"
                  value={form.district}
                  onChange={handleChange}
                  placeholder="जिला"
                />
              </div>
              <div>
                <Label htmlFor="mobile">मोबाइल नंबर (Mobile Number) *</Label>
                <Input
                  type="tel"
                  id="mobile"
                  name="mobile"
                  value={form.mobile}
                  onChange={handleChange}
                  placeholder="मोबाइल नंबर"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="photo">फोटो (Photo)</Label>
                <Input
                  type="file"
                  id="photo"
                  name="photo"
                  accept="image/*"
                  onChange={handleChange}
                />
                {/* Image preview */}
                {form.photo && (
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={URL.createObjectURL(form.photo)}
                      alt="Photo Preview"
                      className="h-32 w-auto border rounded"
                    />
                    <X
                      className="ml-2 w-5 h-5 text-red-500 cursor-pointer hover:text-red-700"
                      onClick={() => setForm(prev => ({ ...prev, photo: null }))}
                      aria-label="Remove"
                    />
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="monthlyPension">मासिक पेंशन (Monthly Pension) *</Label>
                <Input
                  type="text"
                  id="monthlyPension"
                  name="monthlyPension"
                  value={form.monthlyPension}
                  onChange={handleChange}
                  placeholder="मासिक पेंशन राशि"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="bankName">बैंक का नाम (Bank Name)</Label>
                <Input
                  type="text"
                  id="bankName"
                  name="bankName"
                  value={form.bankName}
                  onChange={handleChange}
                  placeholder="बैंक का नाम"
                />
              </div>
              <div>
                <Label htmlFor="accountNumber">खाता संख्या (Account Number)</Label>
                <Input
                  type="text"
                  id="accountNumber"
                  name="accountNumber"
                  value={form.accountNumber}
                  onChange={handleChange}
                  placeholder="खाता संख्या"
                />
              </div>
              <div>
                <Label htmlFor="ifscCode">IFSC कोड (IFSC Code)</Label>
                <Input
                  type="text"
                  id="ifscCode"
                  name="ifscCode"
                  value={form.ifscCode}
                  onChange={handleChange}
                  placeholder="IFSC कोड"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                रद्द करें
              </Button>
            
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "जोड़ रहा है..." : "आवेदन जोड़ें"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PensionYojanaAddForm;
