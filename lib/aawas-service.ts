import api, { getAuthToken, ApiResponse } from "./api";

export interface AawasInstallment {
  id: string;
  registrationId?: string;
  aawasId?: string;
  amount: number;
  date: string;
  paymentMode: string;
  note?: string | null;
  rashidNumber?: string | null;
  addedById?: string;
  createdAt?: string;
}

export interface AawasRegistration {
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
  houseType?: string | null;
  propertyDetails?: string | null;
  nomineeName?: string | null;
  nomineeRelation?: string | null;
  nomineeMobile?: string | null;
  nomineeAadhar?: string | null;
  passportPhotoUrl?: string | null;
  documentUrl?: string | null;
  affidavitUrl?: string | null;
  gender: string;
  category: string;
  totalAmount: number;
  pendingAmount: number;
  epinCode?: string | null;
  addedById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  installments?: AawasInstallment[];
  addedBy?: {
    id: string;
    name: string;
    mobile: string;
    employee_id?: string;
  } | null;
}

export interface CreateAawasPayload {
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
  houseType?: string | null;
  propertyDetails?: string | null;
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
  paymentAmount?: number;
  paymentMode?: "CASH" | "ONLINE" | "RAZORPAY" | "BANK_TRANSFER";
  selectedAgentId?: string;
  epinCode?: string | null;
  pinNumber?: string | null;
}

export interface UpdateAawasPayload {
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
  houseType?: string | null;
  propertyDetails?: string | null;
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

export interface AawasFilters {
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

export interface AawasListResponse {
  success: boolean;
  data: AawasRegistration[];
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
  };
}

export const AawasService = {
  /**
   * Create Aawas (Home) Registration
   * POST /api/v1/aawas
   */
  createRegistration: async (
    payload: CreateAawasPayload
  ): Promise<ApiResponse<AawasRegistration>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post<ApiResponse<AawasRegistration>>(
      "/v1/aawas",
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * Get all Aawas Registrations (paginated & filtered)
   * GET /api/v1/aawas
   */
  getAllRegistrations: async (
    filters?: AawasFilters
  ): Promise<AawasListResponse> => {
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
    const response = await api.get<AawasListResponse>(
      `/v1/aawas${queryString}`,
      { headers }
    );
    return response.data;
  },

  /**
   * Get single Aawas Registration by ID
   * GET /api/v1/aawas/:id
   */
  getRegistrationById: async (
    id: string
  ): Promise<ApiResponse<AawasRegistration>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.get<ApiResponse<AawasRegistration>>(
      `/v1/aawas/${id}`,
      { headers }
    );
    return response.data;
  },

  /**
   * Update Aawas Registration
   * PUT /api/v1/aawas/:id
   */
  updateRegistration: async (
    id: string,
    payload: UpdateAawasPayload
  ): Promise<ApiResponse<AawasRegistration>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.put<ApiResponse<AawasRegistration>>(
      `/v1/aawas/${id}`,
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * Soft Delete Aawas Registration
   * DELETE /api/v1/aawas/:id
   */
  deleteRegistration: async (id: string): Promise<ApiResponse<any>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.delete<ApiResponse<any>>(
      `/v1/aawas/${id}`,
      { headers }
    );
    return response.data;
  },

  /**
   * Add Installment Payment for Aawas
   * POST /api/v1/aawas/:id/installments
   */
  addInstallment: async (
    id: string,
    payload: {
      amount: number;
      date: string;
      paymentMode?: string;
      note?: string | null;
      rashidNumber?: string | null;
    }
  ): Promise<ApiResponse<AawasInstallment>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post<ApiResponse<AawasInstallment>>(
      `/v1/aawas/${id}/installments`,
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * Verify E-PIN for Aawas
   * POST /api/v1/aawas/verify-epin
   */
  verifyEPin: async (pinCode: string): Promise<ApiResponse<any>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post<ApiResponse<any>>(
      "/v1/aawas/verify-epin",
      { pinCode },
      { headers }
    );
    return response.data;
  },
};

export default AawasService;
