import api, { getAuthToken, ApiResponse } from "./api";

export type LadoBahinAccountType = "LADO_BAHIN_300" | "LADO_BAHIN_1000";

export interface LadoBahinInstallment {
  id: string;
  registrationId?: string;
  ladoBahinId?: string;
  accountType: LadoBahinAccountType;
  amount: number;
  date: string;
  paymentMode: string;
  note?: string | null;
  rashidNumber?: string | null;
  addedById?: string;
  createdAt?: string;
}

export interface LadoBahinRegistration {
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
  muklawaDate?: string | null;
  nomineeName?: string | null;
  nomineeRelation?: string | null;
  nomineeMobile?: string | null;
  nomineeAadhar?: string | null;
  passportPhotoUrl?: string | null;
  documentUrl?: string | null;
  affidavitUrl?: string | null;
  gender: string;
  category: string;
  schemeType?: string; // "LADO_BAHIN"
  pool?: string; // "FEMALE_POOL"
  membershipFee?: number; // Fixed ₹5,100
  grantFee?: number; // Fixed ₹5,100
  totalAmount: number; // ₹5,100
  pendingAmount: number;
  accountType?: LadoBahinAccountType | null;
  account300Total?: number;
  account300Paid?: number;
  account300Pending?: number;
  account1000Total?: number;
  account1000Paid?: number;
  account1000Pending?: number;
  epinCode?: string | null;
  addedById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  installments?: LadoBahinInstallment[];
  addedBy?: {
    id: string;
    name: string;
    mobile: string;
    employee_id?: string;
  } | null;
}

export interface CreateLadoBahinPayload {
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
  muklawaDate?: string | null;
  nomineeName?: string | null;
  nomineeRelation?: string | null;
  nomineeMobile?: string | null;
  nomineeAadhar?: string | null;
  passportPhotoUrl?: string | null;
  documentUrl?: string | null;
  affidavitUrl?: string | null;
  gender?: "Female" | "Male" | "Other";
  category?: "A" | "B" | "C" | "D" | "E" | "F";
  schemeType?: "LADO_BAHIN";
  pool?: "FEMALE_POOL";
  accountType?: LadoBahinAccountType;
  membershipFee?: number;
  grantFee?: number;
  totalAmount?: number;
  paymentAmount?: number;
  paymentMode?: "CASH" | "ONLINE" | "RAZORPAY" | "BANK_TRANSFER";
  selectedAgentId?: string;
  epinCode?: string | null;
  pinNumber?: string | null;
}

export interface UpdateLadoBahinPayload {
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
  muklawaDate?: string | null;
  nomineeName?: string | null;
  nomineeRelation?: string | null;
  nomineeMobile?: string | null;
  nomineeAadhar?: string | null;
  passportPhotoUrl?: string | null;
  documentUrl?: string | null;
  affidavitUrl?: string | null;
  gender?: "Female" | "Male" | "Other";
  category?: "A" | "B" | "C" | "D" | "E" | "F";
  totalAmount?: number;
  pendingAmount?: number;
}

export interface LadoBahinFilters {
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
  accountType?: string;
}

export interface LadoBahinListResponse {
  success: boolean;
  data: LadoBahinRegistration[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary?: {
    totalRecords: number;
    totalAmount: number;
    totalPending: number;
    account300Paid?: number;
    account300Pending?: number;
    account1000Paid?: number;
    account1000Pending?: number;
  };
}

export const LadoBahinService = {
  /**
   * Create Lado Bahin (Muklawa) Registration
   * POST /api/v1/lado-bahin
   */
  createRegistration: async (
    payload: CreateLadoBahinPayload
  ): Promise<ApiResponse<LadoBahinRegistration>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post<ApiResponse<LadoBahinRegistration>>(
      "/v1/lado-bahin",
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * Get all Lado Bahin Registrations (paginated & filtered)
   * GET /api/v1/lado-bahin
   */
  getAllRegistrations: async (
    filters?: LadoBahinFilters
  ): Promise<LadoBahinListResponse> => {
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
    const response = await api.get<LadoBahinListResponse>(
      `/v1/lado-bahin${queryString}`,
      { headers }
    );
    return response.data;
  },

  /**
   * Get single Lado Bahin Registration by ID
   * GET /api/v1/lado-bahin/:id
   */
  getRegistrationById: async (
    id: string
  ): Promise<ApiResponse<LadoBahinRegistration>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.get<ApiResponse<LadoBahinRegistration>>(
      `/v1/lado-bahin/${id}`,
      { headers }
    );
    return response.data;
  },

  /**
   * Update Lado Bahin Registration
   * PUT /api/v1/lado-bahin/:id
   */
  updateRegistration: async (
    id: string,
    payload: UpdateLadoBahinPayload
  ): Promise<ApiResponse<LadoBahinRegistration>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.put<ApiResponse<LadoBahinRegistration>>(
      `/v1/lado-bahin/${id}`,
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * Soft Delete Lado Bahin Registration
   * DELETE /api/v1/lado-bahin/:id
   */
  deleteRegistration: async (id: string): Promise<ApiResponse<any>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.delete<ApiResponse<any>>(
      `/v1/lado-bahin/${id}`,
      { headers }
    );
    return response.data;
  },

  /**
   * Add Installment Payment for Lado Bahin
   * POST /api/v1/lado-bahin/:id/installments
   */
  addInstallment: async (
    id: string,
    payload: {
      accountType: LadoBahinAccountType;
      amount: number;
      date: string;
      paymentMode?: string;
      note?: string | null;
      rashidNumber?: string | null;
    }
  ): Promise<ApiResponse<LadoBahinInstallment>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post<ApiResponse<LadoBahinInstallment>>(
      `/v1/lado-bahin/${id}/installments`,
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * Verify E-PIN for Lado Bahin
   * POST /api/v1/lado-bahin/verify-epin
   */
  verifyEPin: async (pinCode: string): Promise<ApiResponse<any>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post<ApiResponse<any>>(
      "/v1/lado-bahin/verify-epin",
      { pinCode },
      { headers }
    );
    return response.data;
  },
};

export default LadoBahinService;
