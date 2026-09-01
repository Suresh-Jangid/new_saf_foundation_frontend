import api, { getAuthToken, ApiResponse } from "./api";

export interface DhundhotsavInstallment {
  id: string;
  registrationId?: string;
  dhundhotsavId?: string;
  amount: number; // ₹300 fixed
  date: string;
  paymentMode: string;
  note?: string | null;
  rashidNumber?: string | null;
  addedById?: string;
  createdAt?: string;
}

export interface DhundhotsavRegistration {
  id: string;
  formNumber: string;
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
  childName?: string | null;
  dhundhDate?: string | null;
  nomineeName?: string | null;
  nomineeRelation?: string | null;
  nomineeMobile?: string | null;
  nomineeAadhar?: string | null;
  passportPhotoUrl?: string | null;
  documentUrl?: string | null;
  affidavitUrl?: string | null;
  gender: string; // Default: Male (MALE_POOL)
  category: string;
  schemeType?: string; // "DHUNDHOTSAV"
  pool?: string; // "MALE_POOL"
  membershipFee?: number; // Fixed ₹5,100
  grantFee?: number; // Fixed ₹5,100
  totalAmount: number; // ₹5,100
  paidAmount?: number;
  pendingAmount: number;
  epinCode?: string | null;
  addedById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  installments?: DhundhotsavInstallment[];
  addedBy?: {
    id: string;
    name: string;
    mobile: string;
    employee_id?: string;
  } | null;
}

export interface CreateDhundhotsavPayload {
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
  childName?: string | null;
  dhundhDate?: string | null;
  nomineeName?: string | null;
  nomineeRelation?: string | null;
  nomineeMobile?: string | null;
  nomineeAadhar?: string | null;
  passportPhotoUrl?: string | null;
  documentUrl?: string | null;
  affidavitUrl?: string | null;
  gender?: "Male" | "Female" | "Other";
  category?: "A" | "B" | "C" | "D" | "E" | "F";
  schemeType?: "DHUNDHOTSAV";
  pool?: "MALE_POOL";
  membershipFee?: number;
  grantFee?: number;
  totalAmount?: number;
  paymentAmount?: number;
  paymentMode?: "CASH" | "ONLINE" | "RAZORPAY" | "BANK_TRANSFER";
  selectedAgentId?: string;
  agentId?: string;
  epinCode?: string | null;
  pinNumber?: string | null;
}

export interface UpdateDhundhotsavPayload {
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
  childName?: string | null;
  dhundhDate?: string | null;
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

export interface DhundhotsavFilters {
  page?: number;
  limit?: number;
  search?: string;
  agentId?: string;
  district?: string;
  tehsil?: string;
  gotra?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
}

export interface DhundhotsavListResponse {
  success: boolean;
  data: DhundhotsavRegistration[];
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

export const DhundhotsavService = {
  /**
   * Create Dhundhotsav Registration
   * POST /api/v1/dhundhotsav
   */
  createRegistration: async (
    payload: CreateDhundhotsavPayload
  ): Promise<ApiResponse<DhundhotsavRegistration>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post<ApiResponse<DhundhotsavRegistration>>(
      "/v1/dhundhotsav",
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * Get all Dhundhotsav Registrations (paginated & filtered)
   * GET /api/v1/dhundhotsav
   */
  getAllRegistrations: async (
    filters?: DhundhotsavFilters
  ): Promise<DhundhotsavListResponse> => {
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
    const response = await api.get<DhundhotsavListResponse>(
      `/v1/dhundhotsav${queryString}`,
      { headers }
    );
    return response.data;
  },

  /**
   * Get single Dhundhotsav Registration by ID
   * GET /api/v1/dhundhotsav/:id
   */
  getRegistrationById: async (
    id: string
  ): Promise<ApiResponse<DhundhotsavRegistration>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.get<ApiResponse<DhundhotsavRegistration>>(
      `/v1/dhundhotsav/${id}`,
      { headers }
    );
    return response.data;
  },

  /**
   * Update Dhundhotsav Registration
   * PUT /api/v1/dhundhotsav/:id
   */
  updateRegistration: async (
    id: string,
    payload: UpdateDhundhotsavPayload
  ): Promise<ApiResponse<DhundhotsavRegistration>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.put<ApiResponse<DhundhotsavRegistration>>(
      `/v1/dhundhotsav/${id}`,
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * Soft Delete Dhundhotsav Registration
   * DELETE /api/v1/dhundhotsav/:id
   */
  deleteRegistration: async (id: string): Promise<ApiResponse<any>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.delete<ApiResponse<any>>(
      `/v1/dhundhotsav/${id}`,
      { headers }
    );
    return response.data;
  },

  /**
   * Add Single-Ledger Installment Payment for Dhundhotsav (Fixed ₹300)
   * POST /api/v1/dhundhotsav/:id/installments
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
  ): Promise<ApiResponse<DhundhotsavInstallment>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post<ApiResponse<DhundhotsavInstallment>>(
      `/v1/dhundhotsav/${id}/installments`,
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * Verify E-PIN for Dhundhotsav
   * POST /api/v1/dhundhotsav/verify-epin
   */
  verifyEPin: async (epinCode: string): Promise<ApiResponse<any>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const trimmed = (epinCode || "").trim();
    const response = await api.post<ApiResponse<any>>(
      "/v1/dhundhotsav/verify-epin",
      { epinCode: trimmed, pinNumber: trimmed },
      { headers }
    );
    return response.data;
  },
};

export default DhundhotsavService;
