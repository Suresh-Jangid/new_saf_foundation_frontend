import api, { getAuthToken, ApiResponse } from "./api";

export interface JanniDeliveryInstallment {
  id: string;
  registrationId: string;
  amount: number;
  date: string;
  paymentMode: string;
  note?: string | null;
  rashidNumber?: string | null;
  addedById?: string;
  createdAt?: string;
}

export interface JanniDeliveryRegistration {
  id: string;
  formNumber: string;
  applicationDate: string;
  applicantName: string;
  fatherName: string;
  husbandName?: string | null;
  motherName?: string | null;
  dateOfBirth: string;
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
  childGender?: "Male" | "Female" | "Other" | null;
  deliveryDate?: string | null;
  hospitalName?: string | null;
  nomineeName?: string | null;
  nomineeRelation?: string | null;
  nomineeMobile?: string | null;
  passportPhotoUrl?: string | null;
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
  installments?: JanniDeliveryInstallment[];
  addedBy?: {
    id: string;
    name: string;
    mobile: string;
    employee_id?: string;
  } | null;
}

export interface CreateJanniDeliveryPayload {
  applicationDate: string;
  applicantName: string;
  fatherName: string;
  husbandName?: string | null;
  motherName?: string | null;
  dateOfBirth: string;
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
  childGender?: "Male" | "Female" | "Other" | null;
  deliveryDate?: string | null;
  hospitalName?: string | null;
  nomineeName?: string | null;
  nomineeRelation?: string | null;
  nomineeMobile?: string | null;
  passportPhotoUrl?: string | null;
  affidavitUrl?: string | null;
  gender?: "Female" | "Male" | "Other";
  category?: "A" | "B" | "C" | "D" | "E" | "F";
  totalAmount?: number;
  paymentAmount?: number;
  paymentMode?: "CASH" | "ONLINE" | "RAZORPAY" | "BANK_TRANSFER";
  selectedAgentId?: string;
  epinCode?: string | null;
  pinNumber?: string | null;
}

export interface UpdateJanniDeliveryPayload {
  applicantName?: string;
  fatherName?: string;
  husbandName?: string | null;
  motherName?: string | null;
  dateOfBirth?: string;
  age?: number | null;
  gotra?: string;
  mobile?: string;
  address?: string;
  pinCode?: string;
  tehsil?: string;
  district?: string;
  state?: string;
  childName?: string | null;
  childGender?: "Male" | "Female" | "Other" | null;
  deliveryDate?: string | null;
  hospitalName?: string | null;
  nomineeName?: string | null;
  nomineeRelation?: string | null;
  nomineeMobile?: string | null;
  passportPhotoUrl?: string | null;
  affidavitUrl?: string | null;
  gender?: "Female" | "Male" | "Other";
  category?: "A" | "B" | "C" | "D" | "E" | "F";
  totalAmount?: number;
  pendingAmount?: number;
}

export interface JanniDeliveryFilters {
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

export interface JanniDeliveryListResponse {
  success: boolean;
  data: JanniDeliveryRegistration[];
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

export const JanniDeliveryService = {
  /**
   * Create Janni Delivery Registration
   * POST /api/v1/janni-delivery
   */
  createRegistration: async (
    payload: CreateJanniDeliveryPayload
  ): Promise<ApiResponse<JanniDeliveryRegistration>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post<ApiResponse<JanniDeliveryRegistration>>(
      "/v1/janni-delivery",
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * Get all Janni Delivery Registrations (paginated & filtered)
   * GET /api/v1/janni-delivery
   */
  getAllRegistrations: async (
    filters?: JanniDeliveryFilters
  ): Promise<JanniDeliveryListResponse> => {
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
    const response = await api.get<JanniDeliveryListResponse>(
      `/v1/janni-delivery${queryString}`,
      { headers }
    );
    return response.data;
  },

  /**
   * Get single Janni Delivery Registration by ID
   * GET /api/v1/janni-delivery/:id
   */
  getRegistrationById: async (
    id: string
  ): Promise<ApiResponse<JanniDeliveryRegistration>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.get<ApiResponse<JanniDeliveryRegistration>>(
      `/v1/janni-delivery/${id}`,
      { headers }
    );
    return response.data;
  },

  /**
   * Update Janni Delivery Registration
   * PUT /api/v1/janni-delivery/:id
   */
  updateRegistration: async (
    id: string,
    payload: UpdateJanniDeliveryPayload
  ): Promise<ApiResponse<JanniDeliveryRegistration>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.put<ApiResponse<JanniDeliveryRegistration>>(
      `/v1/janni-delivery/${id}`,
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * Soft Delete Janni Delivery Registration
   * DELETE /api/v1/janni-delivery/:id
   */
  deleteRegistration: async (id: string): Promise<ApiResponse<any>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.delete<ApiResponse<any>>(
      `/v1/janni-delivery/${id}`,
      { headers }
    );
    return response.data;
  },

  /**
   * Add Installment Payment
   * POST /api/v1/janni-delivery/:id/installments
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
  ): Promise<ApiResponse<JanniDeliveryInstallment>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post<ApiResponse<JanniDeliveryInstallment>>(
      `/v1/janni-delivery/${id}/installments`,
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * Verify E-PIN for Janni Delivery
   * POST /api/v1/janni-delivery/verify-epin
   */
  verifyEPin: async (pinCode: string): Promise<ApiResponse<any>> => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post<ApiResponse<any>>(
      "/v1/janni-delivery/verify-epin",
      { pinCode },
      { headers }
    );
    return response.data;
  },
};

export default JanniDeliveryService;
