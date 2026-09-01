import api, { getAuthToken, ApiResponse } from "./api";

export interface ShubhLaxmiInstallment {
  id: string;
  registrationId?: string;
  shubhLaxmiId?: string;
  amount: number; // ₹300 fixed
  date: string;
  paymentMode: string;
  note?: string | null;
  rashidNumber?: string | null;
  addedById?: string;
  createdAt?: string;
}

export interface ShubhLaxmiRegistration {
  id: string;
  formNumber: string; // SL-XXXX
  applicationDate: string;
  applicantName: string;
  fatherName: string;
  husbandName?: string | null;
  motherName?: string | null;
  dateOfBirth?: string | null;
  age?: number | null;
  aadharNumber: string;
  gotra: string;
  mobile: string;
  address: string;
  pinCode: string;
  tehsil: string;
  district: string;
  state: string;
  nomineeName?: string | null;
  nomineeRelation?: string | null;
  nomineeMobile?: string | null;
  nomineeAadhar?: string | null;
  passportPhotoUrl?: string | null;
  documentUrl?: string | null;
  affidavitUrl?: string | null;
  gender: "Male" | "Female" | "Other"; // UNIFIED_POOL: Male + Female both eligible
  category: string;
  schemeType?: string; // "SHUBH_LAXMI"
  pool?: string; // "UNIFIED_POOL"
  membershipFee?: number; // Fixed ₹3,100
  grantFee?: number; // Fixed ₹3,100
  totalAmount: number; // ₹3,100
  paidAmount?: number;
  pendingAmount: number;
  is12MonthEligible?: boolean;
  deductionPercentage?: number; // 20%
  missedInstallmentsCount?: number;
  lifecycleStatus?: "ACTIVE" | "COMPLETED" | "WARNING" | "TERMINATED";
  epinCode?: string | null;
  addedById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  installments?: ShubhLaxmiInstallment[];
  addedBy?: {
    id: string;
    name: string;
    mobile: string;
    employee_id?: string;
  } | null;
}

export interface CreateShubhLaxmiPayload {
  applicationDate: string;
  applicantName: string;
  fatherName: string;
  husbandName?: string | null;
  motherName?: string | null;
  dateOfBirth?: string | null;
  age?: number | null;
  aadharNumber: string;
  gotra: string;
  mobile: string;
  address: string;
  pinCode: string;
  tehsil: string;
  district: string;
  state?: string;
  nomineeName?: string | null;
  nomineeRelation?: string | null;
  nomineeMobile?: string | null;
  nomineeAadhar?: string | null;
  passportPhotoUrl?: string | null;
  documentUrl?: string | null;
  affidavitUrl?: string | null;
  gender: "Male" | "Female" | "Other"; // UNIFIED_POOL
  category?: "A" | "B" | "C" | "D" | "E" | "F";
  schemeType?: "SHUBH_LAXMI";
  pool?: "UNIFIED_POOL";
  membershipFee?: number; // 3100
  grantFee?: number;
  totalAmount?: number;
  paymentAmount?: number;
  paymentMode?: "CASH" | "ONLINE" | "RAZORPAY" | "BANK_TRANSFER";
  selectedAgentId?: string;
  epinCode?: string | null;
  pinNumber?: string | null;
}

export interface UpdateShubhLaxmiPayload {
  applicantName?: string;
  fatherName?: string;
  husbandName?: string | null;
  motherName?: string | null;
  dateOfBirth?: string | null;
  age?: number | null;
  gotra?: string;
  mobile?: string;
  address?: string;
  pinCode?: string;
  tehsil?: string;
  district?: string;
  state?: string;
  nomineeName?: string | null;
  nomineeRelation?: string | null;
  nomineeMobile?: string | null;
  nomineeAadhar?: string | null;
  passportPhotoUrl?: string | null;
  documentUrl?: string | null;
  affidavitUrl?: string | null;
  gender?: "Male" | "Female" | "Other";
  category?: "A" | "B" | "C" | "D" | "E" | "F";
  totalAmount?: number;
  pendingAmount?: number;
}

export interface ShubhLaxmiFilters {
  page?: number;
  limit?: number;
  search?: string;
  agentId?: string;
  district?: string;
  tehsil?: string;
  gotra?: string;
  gender?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
}

export interface ShubhLaxmiListResponse {
  success: boolean;
  data: ShubhLaxmiRegistration[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary?: {
    totalRecords: number;
    totalAmount: number;
    totalPaid?: number;
    totalPending: number;
  };
}

export const ShubhLaxmiService = {
  /**
   * Create ShubhLaxmi Registration
   * POST /api/v1/shubh-laxmi
   */
  createRegistration: async (
    payload: CreateShubhLaxmiPayload
  ): Promise<ApiResponse<ShubhLaxmiRegistration>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post<ApiResponse<ShubhLaxmiRegistration>>(
      "/v1/shubh-laxmi",
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * Get all ShubhLaxmi Registrations (paginated & filtered)
   * GET /api/v1/shubh-laxmi
   */
  getAllRegistrations: async (
    filters?: ShubhLaxmiFilters
  ): Promise<ShubhLaxmiListResponse> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          queryParams.append(key, String(val));
        }
      });
    }
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
    const response = await api.get<ShubhLaxmiListResponse>(
      `/v1/shubh-laxmi${queryString}`,
      { headers }
    );
    return response.data;
  },

  /**
   * Get single ShubhLaxmi Registration by ID
   * GET /api/v1/shubh-laxmi/:id
   */
  getRegistrationById: async (
    id: string
  ): Promise<ApiResponse<ShubhLaxmiRegistration>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.get<ApiResponse<ShubhLaxmiRegistration>>(
      `/v1/shubh-laxmi/${id}`,
      { headers }
    );
    return response.data;
  },

  /**
   * Update ShubhLaxmi Registration
   * PUT /api/v1/shubh-laxmi/:id
   */
  updateRegistration: async (
    id: string,
    payload: UpdateShubhLaxmiPayload
  ): Promise<ApiResponse<ShubhLaxmiRegistration>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.put<ApiResponse<ShubhLaxmiRegistration>>(
      `/v1/shubh-laxmi/${id}`,
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * Soft Delete ShubhLaxmi Registration
   * DELETE /api/v1/shubh-laxmi/:id
   */
  deleteRegistration: async (id: string): Promise<ApiResponse<any>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.delete<ApiResponse<any>>(
      `/v1/shubh-laxmi/${id}`,
      { headers }
    );
    return response.data;
  },

  /**
   * Add Single-Ledger Installment Payment for ShubhLaxmi (Fixed ₹300)
   * POST /api/v1/shubh-laxmi/:id/installments
   */
  addInstallment: async (
    id: string,
    payload: {
      amount: number; // Exactly 300
      date: string;
      paymentMode?: string;
      note?: string | null;
      rashidNumber?: string | null;
    }
  ): Promise<ApiResponse<ShubhLaxmiInstallment>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post<ApiResponse<ShubhLaxmiInstallment>>(
      `/v1/shubh-laxmi/${id}/installments`,
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * Verify E-PIN for ShubhLaxmi
   * POST /api/v1/shubh-laxmi/verify-epin
   */
  verifyEPin: async (pinCode: string): Promise<ApiResponse<any>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post<ApiResponse<any>>(
      "/v1/shubh-laxmi/verify-epin",
      { pinCode },
      { headers }
    );
    return response.data;
  },
};

export default ShubhLaxmiService;
