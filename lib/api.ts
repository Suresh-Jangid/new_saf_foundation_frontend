import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { getApiBaseUrl, getBackendOrigin } from "./api-url";

// Create an Axios instance with default config
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000, // Increased timeout for file uploads
});

// ---- Global request de-duplication ----
// Ensures identical in-flight requests share a single network call
type DedupeKey = string;
const inflightRequests = new Map<DedupeKey, Promise<AxiosResponse<any>>>();

function isFormData(value: any): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function isURLSearchParams(value: any): value is URLSearchParams {
  return typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams;
}

function serializeData(data: any): string {
  if (!data) return "";
  if (data instanceof URLSearchParams) {
    return data.toString();
  }
  if (isFormData(data)) {
    const entries: Array<[string, string]> = [];
    // FormData.forEach preserves insertion order; we sort to get a stable key
    data.forEach((value: any, key: string) => {
      // Convert File/Blob to a stable identifier
      if (typeof File !== "undefined" && value instanceof File) {
        entries.push([key, `file:${value.name}:${value.size}:${value.type}`]);
      } else if (typeof Blob !== "undefined" && value instanceof Blob) {
        entries.push([key, `blob:${value.size}:${value.type}`]);
      } else {
        entries.push([key, String(value)]);
      }
    });
    entries.sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1]));
    return entries.map(([k, v]) => `${k}=${v}`).join("&");
  }
  if (typeof data === "object") {
    const sortObject = (obj: any): any => {
      if (obj === null) return null;
      if (Array.isArray(obj)) return obj.map(sortObject);
      if (typeof obj === "object") {
        return Object.keys(obj)
          .sort()
          .reduce((acc: any, key: string) => {
            acc[key] = sortObject(obj[key]);
            return acc;
          }, {} as any);
      }
      return obj;
    };
    try {
      return JSON.stringify(sortObject(data));
    } catch {
      return "[unserializable]";
    }
  }
  return String(data);
}

function buildDedupeKey(method: string, url: string, data?: any): DedupeKey {
  return `${method.toUpperCase()} ${url} ${serializeData(data)}`;
}

/** Read JWT from localStorage (direct key or nested in user/agent object). */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const direct = localStorage.getItem("token");
  if (direct) return direct;
  try {
    const userRaw = localStorage.getItem("user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (user?.token) return user.token;
    }
    const agentRaw = localStorage.getItem("agent");
    if (agentRaw) {
      const agent = JSON.parse(agentRaw);
      if (agent?.token) return agent.token;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

export function saveAuthToken(token: string | undefined | null): void {
  if (typeof window === "undefined" || !token) return;
  localStorage.setItem("token", token);
}

/** Apply token to axios default headers + localStorage. */
export function applyAuthToken(token: string | null | undefined): void {
  if (typeof window === "undefined") return;
  if (!token) {
    delete api.defaults.headers.common["Authorization"];
    localStorage.removeItem("token");
    return;
  }
  saveAuthToken(token);
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

/** Restore token from user/agent objects (fixes sessions created before token key was saved). */
export function syncAuthSession(): string | null {
  const token = getAuthToken();
  if (token) {
    applyAuthToken(token);
  }
  return token;
}

export function setAuthSession(options: {
  role: "admin" | "agent";
  token: string;
  user?: Record<string, unknown>;
  agent?: Record<string, unknown>;
}): void {
  if (typeof window === "undefined" || !options.token) return;
  applyAuthToken(options.token);
  localStorage.setItem("isAuthenticated", "true");
  localStorage.setItem("userRole", options.role);
  if (options.role === "admin" && options.user) {
    localStorage.setItem("user", JSON.stringify({ ...options.user, token: options.token }));
  }
  if (options.role === "agent" && options.agent) {
    localStorage.setItem("agent", JSON.stringify({ ...options.agent, token: options.token }));
  }
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  applyAuthToken(null);
}

// Optional: Add interceptors for auth, logging, etc.
api.interceptors.request.use(
  (config: any) => {
    const token = getAuthToken();
    if (token) {
      applyAuthToken(token);
      (config.headers ??= {})["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const message = response.data?.message;
    // Only clear session on genuine token/session expiration, never on operational business errors
    if (
      response.data?.error === true &&
      typeof message === "string" &&
      /jwt expired|invalid token|jwt malformed|token missing|authentication token expired/i.test(message)
    ) {
      if (typeof window !== "undefined") {
        clearAuthSession();
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("user");
        localStorage.removeItem("agent");
        localStorage.removeItem("userRole");
        if (!window.location.pathname.startsWith("/dashboard") && window.location.pathname !== "/") {
          // already on login
        } else if (window.location.pathname.startsWith("/dashboard")) {
          window.location.href = "/";
        }
      }
    }
    return response;
  },
  (error) => {
    // Only genuine 401 Unauthorized with token expiry should reset session
    if (error?.response?.status === 401) {
      const errMsg = String(error.response?.data?.message || "");
      if (/jwt expired|invalid token|jwt malformed|token missing|session expired/i.test(errMsg)) {
        if (typeof window !== "undefined") {
          clearAuthSession();
          localStorage.removeItem("isAuthenticated");
          localStorage.removeItem("user");
          localStorage.removeItem("agent");
          localStorage.removeItem("userRole");
          if (window.location.pathname.startsWith("/dashboard")) {
            window.location.href = "/";
          }
        }
      }
    }
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);

// Helper functions for common requests
export const get = <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  const key = buildDedupeKey("GET", api.defaults.baseURL ? new URL(url, api.defaults.baseURL).toString() : url);
  const existing = inflightRequests.get(key) as Promise<AxiosResponse<T>> | undefined;
  if (existing) return existing;
  const request = api.get<T>(url, config).finally(() => {
    inflightRequests.delete(key);
  });
  inflightRequests.set(key, request as Promise<AxiosResponse<any>>);
  return request;
};

export const post = <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  const formDataLike = isFormData(data);
  const urlParamsLike = isURLSearchParams(data);
  const headers = formDataLike
    ? { ...config?.headers } // Let Axios set Content-Type
    : urlParamsLike
    ? { "Content-Type": "application/x-www-form-urlencoded", ...config?.headers }
    : { "Content-Type": "application/json", ...config?.headers };

  const key = buildDedupeKey(
    "POST",
    api.defaults.baseURL ? new URL(url, api.defaults.baseURL).toString() : url,
    data
  );
  const existing = inflightRequests.get(key) as Promise<AxiosResponse<T>> | undefined;
  if (existing) return existing;
  const request = api.post<T>(url, data, { ...config, headers }).finally(() => {
    inflightRequests.delete(key);
  });
  inflightRequests.set(key, request as Promise<AxiosResponse<any>>);
  return request;
};

export const put = <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  const formDataLike = isFormData(data);
  const urlParamsLike = isURLSearchParams(data);
  const headers = formDataLike
    ? { ...config?.headers }
    : urlParamsLike
    ? { "Content-Type": "application/x-www-form-urlencoded", ...config?.headers }
    : { "Content-Type": "application/json", ...config?.headers };
  const key = buildDedupeKey(
    "PUT",
    api.defaults.baseURL ? new URL(url, api.defaults.baseURL).toString() : url,
    data
  );
  const existing = inflightRequests.get(key) as Promise<AxiosResponse<T>> | undefined;
  if (existing) return existing;
  const request = api.put<T>(url, data, { ...config, headers }).finally(() => {
    inflightRequests.delete(key);
  });
  inflightRequests.set(key, request as Promise<AxiosResponse<any>>);
  return request;
};

export const del = <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  const key = buildDedupeKey("DELETE", api.defaults.baseURL ? new URL(url, api.defaults.baseURL).toString() : url);
  const existing = inflightRequests.get(key) as Promise<AxiosResponse<T>> | undefined;
  if (existing) return existing;
  const request = api.delete<T>(url, config).finally(() => {
    inflightRequests.delete(key);
  });
  inflightRequests.set(key, request as Promise<AxiosResponse<any>>);
  return request;
};

// API Endpoints based on the PHP file
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: "?apicall=login",
  AGENT_LOGIN: "?apicall=agentLogin",
  LOGOUT: "?apicall=logout",
  REGISTER: "?apicall=register",

  // Dashboard
  GET_DASHBOARD_COUNTS: "?apicall=getDashboardCounts",
  
  // General Applications
  CREATE_APPLICATION: "?apicall=createApplication",
  GET_APPLICATIONS: "?apicall=getApplications",
  UPDATE_APPLICATION: "?apicall=updateApplication",
  DELETE_APPLICATION: "?apicall=deleteApplication",
  UPDATE_APPLICATION_ACTIVE_STATUS: "?apicall=updateApplicationActiveStatus",
  
  // Insurance Applications
  CREATE_INSURANCE_APPLICATION: "?apicall=createInsuranceApplication",
  GET_INSURANCE_APPLICATIONS: "?apicall=getInsuranceApplication",
  UPDATE_INSURANCE_APPLICATION: "?apicall=editInsuranceApplication",
  DELETE_INSURANCE_APPLICATION: "?apicall=deleteInsuranceApplication",
  GET_INSURANCE_APPLICATION: "?apicall=getInsuranceApplication",
  UPDATE_INSURANCE_APPLICATION_ACTIVE_STATUS: "?apicall=updateInsuranceApplicationActiveStatus",

  // Insurance Application Installments
  GET_INSURANCE_APPLICATION_INSTALLMENTS: "?apicall=getApplicationInsuranceInstallments",
  ADD_INSURANCE_APPLICATION_INSTALLMENT: "?apicall=addApplicationInsuranceInstallment",
  
  // Loan Applications
  CREATE_LOAN_APPLICATION: "?apicall=addLoanApplication",
  GET_LOAN_APPLICATIONS: "?apicall=getLoanApplications",
  UPDATE_LOAN_APPLICATION: "?apicall=editLoanApplication",
  DELETE_LOAN_APPLICATION: "?apicall=deleteLoanApplication",
  // Loan Application Installments
  GET_LOAN_APPLICATION_INSTALLMENTS: "?apicall=getLoanApplicationInstallments",
  ADD_LOAN_APPLICATION_INSTALLMENT: "?apicall=addLoanApplicationInstallment",
  
  // Financial Help
  CREATE_FINANCIAL_HELP: "?apicall=addFinancialHelp",
  GET_FINANCIAL_HELPS: "?apicall=getFinancialHelps",
  UPDATE_FINANCIAL_HELP: "?apicall=editFinancialHelp",
  DELETE_FINANCIAL_HELP: "?apicall=deleteFinancialHelp",
  GET_FINANCIAL_HELP_INSTALLMENTS: "?apicall=getFinancialHelpInstallments",
  ADD_FINANCIAL_HELP_INSTALLMENT: "?apicall=addFinancialHelpInstallment",
  
  // Disability Cycle
  CREATE_DISABILITY_CYCLE: "?apicall=addDisabilityCycle",
  GET_DISABILITY_CYCLES: "?apicall=getDisabilityCycles",
  UPDATE_DISABILITY_CYCLE: "?apicall=editDisabilityCycle",
  DELETE_DISABILITY_CYCLE: "?apicall=deleteDisabilityCycle",
  
  // Agent Registration
  CREATE_AGENT: "?apicall=addAgent",
  GET_AGENTS: "?apicall=getAgents",
  UPDATE_AGENT: "?apicall=editAgent",
  DELETE_AGENT: "?apicall=deleteAgent",
  GET_AGENT_PERMISSIONS: "?apicall=getAgentPermissions",
  SET_AGENT_PERMISSIONS: "?apicall=setAgentPermissions",
  GET_ALL_BULK_DATA: "?apicall=getAllBulkData",
  ADD_AGENT_PAYMENT_FOR_DETAILS: "?apicall=addAgentPaymentForDetails",
  
  // Marriage Congratulations
  CREATE_MARRIAGE_CONGRATS: "?apicall=addMarriageCongrats",
  GET_MARRIAGE_CONGRATS: "?apicall=getMarriageCongrats",
  GET_MARRIAGE_CONGRATULATIONS_LOOKUP: "?apicall=getMarriageCongratulations",
  UPDATE_MARRIAGE_CONGRATS: "?apicall=editMarriageCongrats",
  DELETE_MARRIAGE_CONGRATS: "?apicall=deleteMarriageCongrats",
  GET_USER_DATA: "?apicall=getUserData",
  UPDATE_PAYMENT_STATUS: "?apicall=updatePaymentStatus",
  UPDATE_PDF_STATUS: "?apicall=updatePdfStatus",
  
  // Mayra Registration (Application)
  CREATE_MAYRA_APPLICATION: "?apicall=createmayra_Application",
  GET_MAYRA_APPLICATIONS: "?apicall=getmayra_application",
  UPDATE_MAYRA_APPLICATION: "?apicall=updatemayra_Application",
  DELETE_MAYRA_APPLICATION: "?apicall=deletemayra_Application",
  UPDATE_MAYRA_APPLICATION_ACTIVE_STATUS: "?apicall=updateMayraApplicationActiveStatus",
  
  // Mayra Congratulations
  CREATE_MAYRA_CONGRATS: "?apicall=addMayraCongrats",
  GET_MAYRA_CONGRATS: "?apicall=getMayraCongrats",
  UPDATE_MAYRA_CONGRATS: "?apicall=editMayraCongrats",
  DELETE_MAYRA_CONGRATS: "?apicall=deleteMayraCongrats",
  UPDATE_MAYRA_CONGRATS_STATUS: "?apicall=updateMayraCongratulationsStatus",
  GET_MAYRA_CONGRATULATIONS_DETAILS: "?apicall=getMayraCongratulations",
  
  // Mayra Installments
  CREATE_MAYRA_INSTALLMENT: "?apicall=addMayraInstallment",
  GET_MAYRA_INSTALLMENTS: "?apicall=getMayraInstallments",
  UPDATE_MAYRA_INSTALLMENT: "?apicall=updateMayraInstallment",
  DELETE_MAYRA_INSTALLMENT: "?apicall=deleteMayraInstallment",
  
  // Mayra Congrats Payments
  CREATE_MAYRA_CONGRATS_PAYMENT: "?apicall=createMayraCongratulationsPayment",
  GET_MAYRA_CONGRATS_PAYMENT: "?apicall=getMayraCongratulationsPayment",
  UPDATE_MAYRA_CONGRATS_PAYMENT: "?apicall=updateMayraCongratulationsPayment",
  DELETE_MAYRA_CONGRATS_PAYMENT: "?apicall=deleteMayraCongratulationsPayment",
  
  // Mayra Other
  GET_MAYRA_DETAILS_BY_NUMBER: "?apicall=getMayraDetailsByNumber",
  GET_MAYRA_BEFORE_DATE: "?apicall=getMayraBeforeDate",
  UPDATE_MAYRA_STATUS: "?apicall=updateMayraStatus",
  GET_MAYRA_PREVIOUS_MEMBERS: "?apicall=getMayraPreviousMembers",
  GET_MAYRA_BULK_DATA: "?apicall=getMayraBulkData",
  GET_MAYRA_USER_DATA: "?apicall=getMayraUserData",
  UPDATE_MAYRA_PDF_STATUS: "?apicall=updateMayraPdfStatus",
  
  // Marriage Sewing Machine
  CREATE_MARRIAGE_SEWING: "?apicall=addMarriageSewing",
  GET_MARRIAGE_SEWING: "?apicall=getMarriageSewing",
  UPDATE_MARRIAGE_SEWING: "?apicall=editMarriageSewing",
  DELETE_MARRIAGE_SEWING: "?apicall=deleteMarriageSewing",
  
  // Pension Yojana
  CREATE_PENSION_YOJANA: "?apicall=addPensionYojana",
  GET_PENSION_YOJANAS: "?apicall=getPensionYojanas",
  UPDATE_PENSION_YOJANA: "?apicall=editPensionYojana",
  DELETE_PENSION_YOJANA: "?apicall=deletePensionYojana",
  
  // Pension Yojana Payments
  GET_PENSION_YOJANA_PAYMENTS: "?apicall=getPensionYojanaPayments",
  ADD_PENSION_YOJANA_PAYMENT: "?apicall=addPensionYojanaPayment",
  
  // Sewing Machine Camp
  CREATE_SEWING_CAMP: "?apicall=addSewingCamp",
  GET_SEWING_CAMPS: "?apicall=getSewingCamp",
  GET_SEWING_CAMP: "?apicall=getSewingCamp",
  UPDATE_SEWING_CAMP: "?apicall=editSewingCamp",
  DELETE_SEWING_CAMP: "?apicall=deleteSewingCamp",
  
  // Suraksha Bima Yojana
  CREATE_SURAKSHA_BIMA: "?apicall=addSurakshaBima",
  GET_SURAKSHA_BIMA: "?apicall=getSurakshaBimaList",
  GET_SURAKSHA_BIMA_BY_ID: "?apicall=getSurakshaBima",
  GET_SURAKSHA_BIMA_DATA: "?apicall=getSurakshaBimaData",
  UPDATE_SURAKSHA_BIMA: "?apicall=editSurakshaBima",
  DELETE_SURAKSHA_BIMA: "?apicall=deleteSurakshaBima",
  GET_PREVIOUS_SURAKSHA_BIMA_MEMBERS: "?apicall=getPreviousSurakshaBimaMembers",
  GET_SURAKSHA_BIMA_PAYMENT_BY_ID: "?apicall=getSurakshaBimaPaymentById",
  CREATE_SURAKSHA_BIMA_PAYMENT: "?apicall=createSurakshaBimaPayment",
  GET_INSURANCE_BULK_DATA: "?apicall=getInsuranceBulkData",
  UPDATE_BIMA_PAYMENT_STATUS: "?apicall=updateBimaPaymentStatus",
  UPDATE_INSURANCE_PDF_STATUS: "?apicall=updateInsurancePdfStatus",
  
  // Payment Management
  CREATE_PAYMENT: "?apicall=addPayment",
  GET_PAYMENT_LIST: "?apicall=getPaymentList",
  UPDATE_PAYMENT: "?apicall=editPayment",
  DELETE_PAYMENT: "?apicall=deletePayment",

  // Application Installments
  GET_APPLICATION_INSTALLMENTS: "?apicall=getApplicationInstallments",
  ADD_APPLICATION_INSTALLMENT: "?apicall=addApplicationInstallment",
  
  // Previous Applications Members
  GET_PREVIOUS_APPLICATIONS_MEMBERS: "?apicall=getPreviousApplicationsMembers",
  
  // Marriage Congratulations Payment Summary
  GET_MARRIAGE_CONGRATULATIONS_PAYMENT: "?apicall=getMarriageCongratulationsPayment",
  
  // Create Marriage Congratulations Payment
  CREATE_MARRIAGE_CONGRATULATIONS_PAYMENT: "?apicall=createMarriageCongratulationsPayment",
  
  // Marriage Details
  GET_MARRIAGE_DETAILS_BY_NUMBER: "?apicall=getMarriageDetailsByNumber",
  
  // Agent Commission Reports
  GET_AGENT_PAYMENTS_FOR_DETAILS: "?apicall=getAgentPaymentsForDetails",
};

// Helper function to create FormData from object
export const createFormData = (data: Record<string, any>): FormData => {
  const formData = new FormData();
  Object.keys(data).forEach(key => {
    if (data[key] !== null && data[key] !== undefined) {
      if (data[key] instanceof File) {
        formData.append(key, data[key]);
      } else {
        formData.append(key, String(data[key]));
      }
    }
  });
  return formData;
};

/** Build FormData for edit routes — only appends explicitly provided fields plus id. */
export const buildEditFormData = (
  id: string,
  fields: Record<string, string | number | boolean | File | null | undefined>
): FormData => {
  const formData = new FormData();
  formData.append("id", id);
  Object.entries(fields).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (typeof File !== "undefined" && value instanceof File) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  });
  return formData;
};

// Helper function to create URLSearchParams from object
export const createSearchParams = (data: Record<string, any>): URLSearchParams => {
  const params = new URLSearchParams();
  Object.keys(data).forEach(key => {
    if (data[key] !== null && data[key] !== undefined) {
      params.append(key, String(data[key]));
    }
  });
  return params;
};

// Helper for application/x-www-form-urlencoded POSTs
export const postUrlEncoded = async <T = any>(url: string, data: Record<string, any>) => {
  const params = createSearchParams(data);
  const response = await api.post<T>(url, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return response;
};

// API Response Types
export interface ApiResponse<T = any> {
  status: boolean;
  message?: string;
  data?: T;
  error?: boolean;
  success?: boolean;
  dashboard?: any;
}

export interface User {
  id: number;
  name: string;
  email: string;
  mobile: string;
  token?: string;
  token_expiry?: string;
}

// Authentication API Services
export const authAPI = {
  login: async (mobile: string, password: string): Promise<ApiResponse<User>> => {
    const formData = createFormData({ mobile, password });
    const response = await post<ApiResponse<User>>(API_ENDPOINTS.LOGIN, formData);
    return response.data;
  },

  logout: async (token: string): Promise<ApiResponse> => {
    const formData = createFormData({ token });
    const response = await post<ApiResponse>(API_ENDPOINTS.LOGOUT, formData);
    return response.data;
  },

  register: async (name: string, email: string, mobile: string, password: string): Promise<ApiResponse> => {
    const formData = createFormData({ name, email, mobile, password });
    const response = await post<ApiResponse>(API_ENDPOINTS.REGISTER, formData);
    return response.data;
  },

  agentLogin: async (mobile: string, password: string): Promise<ApiResponse<any>> => {
    const formData = createFormData({ mobile, password });
    const response = await post<ApiResponse<any>>(API_ENDPOINTS.AGENT_LOGIN, formData);
    return response.data;
  },
};

// Dashboard API Services
export const dashboardAPI = {
  getCounts: async (): Promise<ApiResponse<any>> => {
    syncAuthSession();
    try {
      const response = await api.get<ApiResponse<any>>(
        `${getBackendOrigin()}/api/v1/dashboard/counts`
      );
      return response.data;
    } catch {
      const response = await post<ApiResponse<any>>(
        API_ENDPOINTS.GET_DASHBOARD_COUNTS,
        new FormData()
      );
      return response.data;
    }
  },
};

// Agent Permissions API Services
export const agentPermissionAPI = {
  getPermissions: async (agentId: string | number): Promise<ApiResponse<any>> => {
    const formData = createFormData({ agent_id: String(agentId) });
    const response = await post<ApiResponse<any>>(API_ENDPOINTS.GET_AGENT_PERMISSIONS, formData);
    return response.data;
  },

  setPermissions: async (agentId: string | number, permissions: Record<string, unknown>): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>(API_ENDPOINTS.SET_AGENT_PERMISSIONS, {
      agent_id: String(agentId),
      permissions,
    });
    return response.data;
  },
};

// Agent Commission Bulk API Services
export const agentCommissionBulkAPI = {
  getAllBulkData: async (filters?: Record<string, any>): Promise<ApiResponse<any>> => {
    const formData = createFormData(filters || {});
    const response = await post<ApiResponse<any>>(API_ENDPOINTS.GET_ALL_BULK_DATA, formData);
    return response.data;
  },

  addPaymentForDetails: async (data: Record<string, any>): Promise<ApiResponse> => {
    const formData = createFormData(data);
    const response = await post<ApiResponse>(API_ENDPOINTS.ADD_AGENT_PAYMENT_FOR_DETAILS, formData);
    return response.data;
  },
};

// Marriage Bulk EMI API Services
export const marriageBulkAPI = {
  getUserData: async (userId: string): Promise<ApiResponse<any>> => {
    const formData = createFormData({ userId });
    const response = await post<ApiResponse<any>>(API_ENDPOINTS.GET_USER_DATA, formData);
    return response.data;
  },

  updatePaymentStatus: async (data: Record<string, any>): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>(API_ENDPOINTS.UPDATE_PAYMENT_STATUS, data);
    return response.data;
  },

  updatePdfStatus: async (ids: number[]): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>(API_ENDPOINTS.UPDATE_PDF_STATUS, { ids });
    return response.data;
  },
};

// Suraksha Bima Bulk EMI API Services
export const surakshaBimaBulkAPI = {
  getBulkData: async (userId: string): Promise<ApiResponse<any>> => {
    const response = await postUrlEncoded<ApiResponse<any>>(API_ENDPOINTS.GET_INSURANCE_BULK_DATA, { userId });
    return response.data;
  },

  updatePaymentStatus: async (data: Record<string, any>): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>(API_ENDPOINTS.UPDATE_BIMA_PAYMENT_STATUS, data);
    return response.data;
  },

  updatePdfStatus: async (ids: number[]): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>(API_ENDPOINTS.UPDATE_INSURANCE_PDF_STATUS, { ids });
    return response.data;
  },
};

// Suraksha Bima Payment API Services
export const surakshaBimaPaymentAPI = {
  getPreviousMembers: async (id: string | number): Promise<ApiResponse<any>> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse<any>>(API_ENDPOINTS.GET_PREVIOUS_SURAKSHA_BIMA_MEMBERS, formData);
    return response.data;
  },

  getPaymentById: async (id: string | number): Promise<ApiResponse<any>> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse<any>>(API_ENDPOINTS.GET_SURAKSHA_BIMA_PAYMENT_BY_ID, formData);
    return response.data;
  },

  createPayment: async (data: Record<string, any>): Promise<ApiResponse> => {
    const formData = createFormData(data);
    const response = await post<ApiResponse>(API_ENDPOINTS.CREATE_SURAKSHA_BIMA_PAYMENT, formData);
    return response.data;
  },
};

// General Applications API Services
export const generalApplicationsAPI = {
  create: async (data: any): Promise<ApiResponse> => {
    const formData = createFormData(data);
    const response = await post<ApiResponse>(API_ENDPOINTS.CREATE_APPLICATION, formData);
    return response.data;
  },

  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const formData = createFormData(filters || {});
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_APPLICATIONS, formData);
    return response.data;
  },

  update: async (id: string, data: any): Promise<ApiResponse> => {
    const formData = buildEditFormData(id, data);
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_APPLICATION, formData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse>(API_ENDPOINTS.DELETE_APPLICATION, formData);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<any>> => {
    // API expects x-www-form-urlencoded for single id fetch
    const response = await postUrlEncoded<ApiResponse<any>>(API_ENDPOINTS.GET_APPLICATIONS, { id });
    return response.data;
  },

  toggleActiveStatus: async (id: string, currentStatus: number): Promise<ApiResponse> => {
    const newStatus = currentStatus === 0 ? 1 : 0;
    const formData = createFormData({ id, is_active: newStatus });
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_APPLICATION_ACTIVE_STATUS, formData);
    return response.data;
  },

  bulkImport: async (rows: any[]): Promise<ApiResponse<any>> => {
    syncAuthSession();
    const response = await api.post<ApiResponse<any>>(
      `${getBackendOrigin()}/api/v1/applications/general/bulk-import`,
      { rows }
    );
    return response.data;
  },
};

// Insurance Applications API Services
export const insuranceApplicationsAPI = {
  create: async (data: any): Promise<ApiResponse> => {
    const formData = createFormData(data);
    const response = await post<ApiResponse>(API_ENDPOINTS.CREATE_INSURANCE_APPLICATION, formData);
    return response.data;
  },

  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const formData = createFormData(filters || {});
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_INSURANCE_APPLICATIONS, formData);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<any>> => {
    // API expects x-www-form-urlencoded for single id fetch
    const response = await postUrlEncoded<ApiResponse<any>>(API_ENDPOINTS.GET_INSURANCE_APPLICATION, { id });
    return response.data;
  },

  update: async (id: string, data: any): Promise<ApiResponse> => {
    const formData = buildEditFormData(id, data);
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_INSURANCE_APPLICATION, formData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse>(API_ENDPOINTS.DELETE_INSURANCE_APPLICATION, formData);
    return response.data;
  },

  toggleActiveStatus: async (id: string, currentStatus: number): Promise<ApiResponse> => {
    const newStatus = currentStatus === 0 ? 1 : 0;
    const formData = createFormData({ id, is_active: newStatus });
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_INSURANCE_APPLICATION_ACTIVE_STATUS, formData);
    return response.data;
  },
};

// Loan Applications API Services
export const loanApplicationsAPI = {
  create: async (data: any): Promise<ApiResponse> => {
    const formData = createFormData(data);
    const response = await post<ApiResponse>(API_ENDPOINTS.CREATE_LOAN_APPLICATION, formData);
    return response.data;
  },

  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const formData = createFormData(filters || {});
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_LOAN_APPLICATIONS, formData);
    return response.data;
  },

  update: async (id: string, data: any): Promise<ApiResponse> => {
    const formData = createFormData({ ...data, id });
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_LOAN_APPLICATION, formData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse>(API_ENDPOINTS.DELETE_LOAN_APPLICATION, formData);
    return response.data;
  },
};

// Loan Application Installments API Services
export const loanApplicationInstallmentsAPI = {
  getByLoanApplicationId: async (
    loanApplicationId: string | number
  ): Promise<any> => {
    const params = createSearchParams({ loan_application_id: loanApplicationId });
    const response = await post<any>(
      API_ENDPOINTS.GET_LOAN_APPLICATION_INSTALLMENTS,
      params
    );
    return response.data;
  },
  create: async (data: {
    loan_application_id: string | number;
    amount: string | number;
    date: string; // YYYY-MM-DD
    type: "User Repayment" | "We Paid";
    note?: string;
  }): Promise<any> => {
    const formData = createFormData(data as any);
    const response = await post<any>(
      API_ENDPOINTS.ADD_LOAN_APPLICATION_INSTALLMENT,
      formData
    );
    return response.data;
  },
};

// Financial Help API Services
export const financialHelpAPI = {
  create: async (data: any): Promise<ApiResponse> => {
    const formData = createFormData(data);
    const response = await post<ApiResponse>(API_ENDPOINTS.CREATE_FINANCIAL_HELP, formData);
    return response.data;
  },

  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const formData = createFormData(filters || {});
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_FINANCIAL_HELPS, formData);
    return response.data;
  },

  update: async (id: string, data: any): Promise<ApiResponse> => {
    const formData = createFormData({ ...data, id });
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_FINANCIAL_HELP, formData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse>(API_ENDPOINTS.DELETE_FINANCIAL_HELP, formData);
    return response.data;
  },
};

// Financial Help Installments API Services
export const financialHelpInstallmentsAPI = {
  getByFinancialHelpId: async (financialHelpId: string | number): Promise<any> => {
    const params = createSearchParams({ financial_help_id: financialHelpId });
    const response = await post<any>(API_ENDPOINTS.GET_FINANCIAL_HELP_INSTALLMENTS, params);
    return response.data;
  },

  create: async (data: {
    financial_help_id: string | number;
    amount: string | number;
    date: string;
    note?: string;
  }): Promise<any> => {
    const formData = createFormData(data as any);
    const response = await post<any>(API_ENDPOINTS.ADD_FINANCIAL_HELP_INSTALLMENT, formData);
    return response.data;
  },
};

// Disability Cycle API Services
export const disabilityCycleAPI = {
  create: async (data: any): Promise<ApiResponse> => {
    const formData = createFormData(data);
    const response = await post<ApiResponse>(API_ENDPOINTS.CREATE_DISABILITY_CYCLE, formData);
    return response.data;
  },

  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const formData = createFormData(filters || {});
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_DISABILITY_CYCLES, formData);
    return response.data;
  },

  update: async (id: string, data: any): Promise<ApiResponse> => {
    const formData = createFormData({ ...data, id });
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_DISABILITY_CYCLE, formData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse>(API_ENDPOINTS.DELETE_DISABILITY_CYCLE, formData);
    return response.data;
  },
};

// Agent Registration API Services
export const agentRegistrationAPI = {
  create: async (data: any): Promise<ApiResponse> => {
    const formData = createFormData(data);
    const response = await post<ApiResponse>(API_ENDPOINTS.CREATE_AGENT, formData);
    return response.data;
  },

  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const formData = createFormData(filters || {});
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_AGENTS, formData);
    return response.data;
  },

  update: async (id: string, data: any): Promise<ApiResponse> => {
    const formData = createFormData({ ...data, id });
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_AGENT, formData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse>(API_ENDPOINTS.DELETE_AGENT, formData);
    return response.data;
  },
};

// Marriage Congratulations API Services
export const marriageCongratulationsAPI = {
  create: async (data: any): Promise<ApiResponse> => {
    const formData = createFormData(data);
    const response = await post<ApiResponse>(API_ENDPOINTS.CREATE_MARRIAGE_CONGRATS, formData);
    return response.data;
  },

  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const formData = createFormData(filters || {});
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_MARRIAGE_CONGRATS, formData);
    return response.data;
  },

  update: async (id: string, data: any): Promise<ApiResponse> => {
    const formData = createFormData({ ...data, id });
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_MARRIAGE_CONGRATS, formData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse>(API_ENDPOINTS.DELETE_MARRIAGE_CONGRATS, formData);
    return response.data;
  },
};

// Mayra Registration (Application) API Services
export const mayraApplicationAPI = {
  create: async (data: any): Promise<ApiResponse> => {
    const formData = createFormData(data);
    const response = await post<ApiResponse>(API_ENDPOINTS.CREATE_MAYRA_APPLICATION, formData);
    return response.data;
  },

  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const formData = createFormData(filters || {});
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_MAYRA_APPLICATIONS, formData);
    return response.data;
  },

  update: async (id: string, data: any): Promise<ApiResponse> => {
    const formData = createFormData({ ...data, id });
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_MAYRA_APPLICATION, formData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse>(API_ENDPOINTS.DELETE_MAYRA_APPLICATION, formData);
    return response.data;
  },

  toggleActiveStatus: async (id: string, currentStatus: number): Promise<ApiResponse> => {
    const newStatus = currentStatus === 0 ? 1 : 0;
    const formData = createFormData({ id, is_active: newStatus });
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_MAYRA_APPLICATION_ACTIVE_STATUS, formData);
    return response.data;
  },
};

// Mayra Congratulations API Services
export const mayraCongratsAPI = {
  create: async (data: any): Promise<ApiResponse> => {
    const formData = createFormData(data);
    const response = await post<ApiResponse>(API_ENDPOINTS.CREATE_MAYRA_CONGRATS, formData);
    return response.data;
  },

  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const formData = createFormData(filters || {});
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_MAYRA_CONGRATS, formData);
    return response.data;
  },

  update: async (id: string, data: any): Promise<ApiResponse> => {
    const formData = createFormData({ ...data, id });
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_MAYRA_CONGRATS, formData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse>(API_ENDPOINTS.DELETE_MAYRA_CONGRATS, formData);
    return response.data;
  },

  updateStatus: async (id: string, status: number): Promise<ApiResponse> => {
    const formData = createFormData({ id, payment_status: status });
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_MAYRA_CONGRATS_STATUS, formData);
    return response.data;
  },

  getDetails: async (mayra_id: string): Promise<ApiResponse> => {
    const response = await postUrlEncoded<ApiResponse>(API_ENDPOINTS.GET_MAYRA_CONGRATULATIONS_DETAILS, { mayra_id });
    return response.data;
  },
};

// Marriage Congratulations Lookup API Services
export const marriageCongratulationsLookupAPI = {
  getByApplicationId: async (application_id: string | number): Promise<ApiResponse<any>> => {
    const response = await postUrlEncoded<ApiResponse<any>>(
      API_ENDPOINTS.GET_MARRIAGE_CONGRATULATIONS_LOOKUP,
      { application_id }
    );
    return response.data;
  },
};

// Mayra Installments API Services
export const mayraInstallmentAPI = {
  create: async (data: any): Promise<ApiResponse> => {
    const formData = createFormData(data);
    const response = await post<ApiResponse>(API_ENDPOINTS.CREATE_MAYRA_INSTALLMENT, formData);
    return response.data;
  },

  getAllByMayraId: async (mayra_id: string): Promise<ApiResponse<any[]>> => {
    const formData = createFormData({ mayra_id });
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_MAYRA_INSTALLMENTS, formData);
    return response.data;
  },

  update: async (id: string, data: any): Promise<ApiResponse> => {
    const formData = createFormData({ ...data, id });
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_MAYRA_INSTALLMENT, formData);
    return response.data;
  },

  delete: async (mayra_id: string, id: string): Promise<ApiResponse> => {
    const formData = createFormData({ mayra_id, id });
    const response = await post<ApiResponse>(API_ENDPOINTS.DELETE_MAYRA_INSTALLMENT, formData);
    return response.data;
  },
};

// Mayra Other API Services
export const mayraOtherAPI = {
  getDetailsByNumber: async (mayraNumber: string): Promise<ApiResponse> => {
    const formData = createFormData({ mayraNumber });
    const response = await post<ApiResponse>(API_ENDPOINTS.GET_MAYRA_DETAILS_BY_NUMBER, formData);
    return response.data;
  },

  getBeforeDate: async (id: string): Promise<ApiResponse> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse>(API_ENDPOINTS.GET_MAYRA_BEFORE_DATE, formData);
    return response.data;
  },

  updateMayraStatus: async (mayra_id: number, data: any[]): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>(API_ENDPOINTS.UPDATE_MAYRA_STATUS, { mayra_id, data });
    return response.data;
  },

  getBulkData: async (userId: string): Promise<ApiResponse> => {
    const response = await postUrlEncoded<ApiResponse>(API_ENDPOINTS.GET_MAYRA_BULK_DATA, { userId });
    return response.data;
  },

  getUserData: async (userId: string): Promise<ApiResponse> => {
    const response = await postUrlEncoded<ApiResponse>(API_ENDPOINTS.GET_MAYRA_USER_DATA, { userId });
    return response.data;
  },

  updatePdfStatus: async (ids: number[]): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>(API_ENDPOINTS.UPDATE_MAYRA_PDF_STATUS, { ids });
    return response.data;
  },
};

// Marriage Sewing Machine API Services
export const marriageSewingMachineAPI = {
  create: async (data: any): Promise<ApiResponse> => {
    const formData = createFormData(data);
    const response = await post<ApiResponse>(API_ENDPOINTS.CREATE_MARRIAGE_SEWING, formData);
    return response.data;
  },

  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const formData = createFormData(filters || {});
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_MARRIAGE_SEWING, formData);
    return response.data;
  },

  update: async (id: string, data: any): Promise<ApiResponse> => {
    const formData = createFormData({ ...data, id });
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_MARRIAGE_SEWING, formData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse>(API_ENDPOINTS.DELETE_MARRIAGE_SEWING, formData);
    return response.data;
  },
};

// Pension Yojana API Services
export const pensionYojanaAPI = {
  create: async (data: any): Promise<ApiResponse> => {
    const formData = createFormData(data);
    const response = await post<ApiResponse>(API_ENDPOINTS.CREATE_PENSION_YOJANA, formData);
    return response.data;
  },

  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const formData = createFormData(filters || {});
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_PENSION_YOJANAS, formData);
    return response.data;
  },

  update: async (id: string, data: any): Promise<ApiResponse> => {
    const formData = createFormData({ ...data, id });
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_PENSION_YOJANA, formData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse>(API_ENDPOINTS.DELETE_PENSION_YOJANA, formData);
    return response.data;
  },
};

// Pension Yojana Payment API Services
export const pensionYojanaPaymentAPI = {
  getByPensionYojanaId: async (pensionYojanaId: string | number): Promise<ApiResponse<any[]>> => {
    const params = createSearchParams({ pension_yojana_id: pensionYojanaId });
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_PENSION_YOJANA_PAYMENTS, params);
    return response.data;
  },
  
  create: async (data: {
    pension_yojana_id: string | number;
    amount: string | number;
    date: string;
    note?: string;
  }): Promise<ApiResponse<any>> => {
    const formData = createFormData(data as any);
    const response = await post<ApiResponse<any>>(API_ENDPOINTS.ADD_PENSION_YOJANA_PAYMENT, formData);
    return response.data;
  },
};

// Sewing Machine Camp API Services
export const sewingMachineCampAPI = {
  create: async (data: any): Promise<ApiResponse> => {
    const formData = createFormData(data);
    const response = await post<ApiResponse>(API_ENDPOINTS.CREATE_SEWING_CAMP, formData);
    return response.data;
  },

  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const formData = createFormData(filters || {});
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_SEWING_CAMPS, formData);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<any>> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse<any>>(API_ENDPOINTS.GET_SEWING_CAMP, formData);
    return response.data;
  },

  update: async (id: string, data: any): Promise<ApiResponse> => {
    const formData = createFormData({ ...data, id });
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_SEWING_CAMP, formData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse>(API_ENDPOINTS.DELETE_SEWING_CAMP, formData);
    return response.data;
  },
};

// Suraksha Bima Yojana API Services
export const surakshaBimaYojanaAPI = {
  create: async (data: any): Promise<ApiResponse> => {
    const formData = createFormData(data);
    const response = await post<ApiResponse>(API_ENDPOINTS.CREATE_SURAKSHA_BIMA, formData);
    return response.data;
  },

  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any[]>> => {
    const formData = createFormData(filters || {});
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_SURAKSHA_BIMA, formData);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<any>> => {
    const params = createSearchParams({ id });
    const response = await get<ApiResponse<any>>(`${API_ENDPOINTS.GET_SURAKSHA_BIMA_BY_ID}&${params.toString()}`);
    return response.data;
  },

  getByInsuranceApplicationId: async (insuranceApplicationId: string): Promise<ApiResponse<any>> => {
    const formData = createFormData({ insuranceApplication_id: insuranceApplicationId });
    const response = await post<ApiResponse<any>>(API_ENDPOINTS.GET_SURAKSHA_BIMA_DATA, formData);
    return response.data;
  },

  update: async (id: string, data: any): Promise<ApiResponse> => {
    const formData = createFormData({ ...data, id });
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_SURAKSHA_BIMA, formData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse>(API_ENDPOINTS.DELETE_SURAKSHA_BIMA, formData);
    return response.data;
  },
};

// Payment Management API Services
export const paymentManagementAPI = {
  create: async (data: any): Promise<ApiResponse> => {
    const formData = createFormData(data);
    const response = await post<ApiResponse>(API_ENDPOINTS.CREATE_PAYMENT, formData);
    return response.data;
  },

  getAll: async (filters?: Record<string, any>) => {
    const formData = createFormData(filters || {});
    const response = await post(API_ENDPOINTS.GET_PAYMENT_LIST, formData);
    return response.data;
  },

  update: async (id: string, data: any): Promise<ApiResponse> => {
    const formData = createFormData({ ...data, id });
    const response = await post<ApiResponse>(API_ENDPOINTS.UPDATE_PAYMENT, formData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const formData = createFormData({ id });
    const response = await post<ApiResponse>(API_ENDPOINTS.DELETE_PAYMENT, formData);
    return response.data;
  },
};

// Application Installments API Services
export const applicationInstallmentsAPI = {
  getByApplicationId: async (applicationId: string | number): Promise<ApiResponse<any[]>> => {
    // Backend expects x-www-form-urlencoded
    const params = createSearchParams({ application_id: applicationId });
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_APPLICATION_INSTALLMENTS, params);
    return response.data;
  },
  create: async (data: { application_id: string | number; amount: string | number; date: string; note?: string }): Promise<ApiResponse<any>> => {
    const formData = createFormData(data as any);
    const response = await post<ApiResponse<any>>(API_ENDPOINTS.ADD_APPLICATION_INSTALLMENT, formData);
    return response.data;
  },
};

// Insurance Application Installments API Services
export const insuranceApplicationInstallmentsAPI = {
  getByApplicationId: async (applicationInsuranceId: string | number): Promise<ApiResponse<any[]>> => {
    const params = createSearchParams({ application_insurance_id: applicationInsuranceId });
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_INSURANCE_APPLICATION_INSTALLMENTS, params);
    return response.data;
  },
  create: async (data: { application_insurance_id: string | number; amount: string | number; date: string; note?: string }): Promise<ApiResponse<any>> => {
    const formData = createFormData(data as any);
    const response = await post<ApiResponse<any>>(API_ENDPOINTS.ADD_INSURANCE_APPLICATION_INSTALLMENT, formData);
    return response.data;
  },
};

// Marriage Details API Services
export const marriageDetailsAPI = {
  getByMarriageNumber: async (marriageNumber: string): Promise<ApiResponse<any>> => {
    const formData = createFormData({ marriageNumber });
    const response = await post<ApiResponse<any>>(API_ENDPOINTS.GET_MARRIAGE_DETAILS_BY_NUMBER, formData);
    return response.data;
  },
};

// Agent Commission Reports API Services
export const agentCommissionAPI = {
  getPaymentDetails: async (agentId: string): Promise<ApiResponse<any[]>> => {
    const formData = createFormData({ agentId });
    const response = await post<ApiResponse<any[]>>(API_ENDPOINTS.GET_AGENT_PAYMENTS_FOR_DETAILS, formData);
    return response.data;
  },
};

// Janni Delivery Registration API Services
export const janniDeliveryAPI = {
  create: async (data: any): Promise<ApiResponse<any>> => {
    const response = await api.post("/v1/janni-delivery", data);
    return response.data;
  },
  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any>> => {
    const query = filters ? new URLSearchParams(filters).toString() : "";
    const response = await api.get(`/v1/janni-delivery${query ? `?${query}` : ""}`);
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<any>> => {
    const response = await api.get(`/v1/janni-delivery/${id}`);
    return response.data;
  },
  update: async (id: string, data: any): Promise<ApiResponse<any>> => {
    const response = await api.put(`/v1/janni-delivery/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<any>> => {
    const response = await api.delete(`/v1/janni-delivery/${id}`);
    return response.data;
  },
  addInstallment: async (id: string, data: any): Promise<ApiResponse<any>> => {
    const response = await api.post(`/v1/janni-delivery/${id}/installments`, data);
    return response.data;
  },
  verifyEPin: async (pinCode: string): Promise<ApiResponse<any>> => {
    const response = await api.post("/v1/janni-delivery/verify-epin", { pinCode });
    return response.data;
  },
};

// Aawas (Home) Registration API Services
export const aawasAPI = {
  create: async (data: any): Promise<ApiResponse<any>> => {
    const response = await api.post("/v1/aawas", data);
    return response.data;
  },
  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any>> => {
    const query = filters ? new URLSearchParams(filters).toString() : "";
    const response = await api.get(`/v1/aawas${query ? `?${query}` : ""}`);
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<any>> => {
    const response = await api.get(`/v1/aawas/${id}`);
    return response.data;
  },
  update: async (id: string, data: any): Promise<ApiResponse<any>> => {
    const response = await api.put(`/v1/aawas/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<any>> => {
    const response = await api.delete(`/v1/aawas/${id}`);
    return response.data;
  },
  addInstallment: async (id: string, data: any): Promise<ApiResponse<any>> => {
    const response = await api.post(`/v1/aawas/${id}/installments`, data);
    return response.data;
  },
  verifyEPin: async (pinCode: string): Promise<ApiResponse<any>> => {
    const response = await api.post("/v1/aawas/verify-epin", { pinCode });
    return response.data;
  },
};

// Lado Bahin (Muklawa) Registration API Services
export const ladoBahinAPI = {
  create: async (data: any): Promise<ApiResponse<any>> => {
    const response = await api.post("/v1/lado-bahin", data);
    return response.data;
  },
  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any>> => {
    const query = filters ? new URLSearchParams(filters).toString() : "";
    const response = await api.get(`/v1/lado-bahin${query ? `?${query}` : ""}`);
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<any>> => {
    const response = await api.get(`/v1/lado-bahin/${id}`);
    return response.data;
  },
  update: async (id: string, data: any): Promise<ApiResponse<any>> => {
    const response = await api.put(`/v1/lado-bahin/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<any>> => {
    const response = await api.delete(`/v1/lado-bahin/${id}`);
    return response.data;
  },
  addInstallment: async (id: string, data: any): Promise<ApiResponse<any>> => {
    const response = await api.post(`/v1/lado-bahin/${id}/installments`, data);
    return response.data;
  },
  verifyEPin: async (pinCode: string): Promise<ApiResponse<any>> => {
    const response = await api.post("/v1/lado-bahin/verify-epin", { pinCode });
    return response.data;
  },
};

// Dhundhotsav Registration API Services
export const dhundhotsavAPI = {
  create: async (data: any): Promise<ApiResponse<any>> => {
    const response = await api.post("/v1/dhundhotsav", data);
    return response.data;
  },
  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any>> => {
    const query = filters ? new URLSearchParams(filters).toString() : "";
    const response = await api.get(`/v1/dhundhotsav${query ? `?${query}` : ""}`);
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<any>> => {
    const response = await api.get(`/v1/dhundhotsav/${id}`);
    return response.data;
  },
  update: async (id: string, data: any): Promise<ApiResponse<any>> => {
    const response = await api.put(`/v1/dhundhotsav/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<any>> => {
    const response = await api.delete(`/v1/dhundhotsav/${id}`);
    return response.data;
  },
  addInstallment: async (id: string, data: any): Promise<ApiResponse<any>> => {
    const response = await api.post(`/v1/dhundhotsav/${id}/installments`, data);
    return response.data;
  },
  verifyEPin: async (pinCode: string): Promise<ApiResponse<any>> => {
    const response = await api.post("/v1/dhundhotsav/verify-epin", { pinCode });
    return response.data;
  },
};

// ShubhLaxmi Registration API Services
export const shubhLaxmiAPI = {
  create: async (data: any): Promise<ApiResponse<any>> => {
    const response = await api.post("/v1/shubh-laxmi", data);
    return response.data;
  },
  getAll: async (filters?: Record<string, any>): Promise<ApiResponse<any>> => {
    const query = filters ? new URLSearchParams(filters).toString() : "";
    const response = await api.get(`/v1/shubh-laxmi${query ? `?${query}` : ""}`);
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<any>> => {
    const response = await api.get(`/v1/shubh-laxmi/${id}`);
    return response.data;
  },
  update: async (id: string, data: any): Promise<ApiResponse<any>> => {
    const response = await api.put(`/v1/shubh-laxmi/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<any>> => {
    const response = await api.delete(`/v1/shubh-laxmi/${id}`);
    return response.data;
  },
  addInstallment: async (id: string, data: any): Promise<ApiResponse<any>> => {
    const response = await api.post(`/v1/shubh-laxmi/${id}/installments`, data);
    return response.data;
  },
  verifyEPin: async (pinCode: string): Promise<ApiResponse<any>> => {
    const response = await api.post("/v1/shubh-laxmi/verify-epin", { pinCode });
    return response.data;
  },
};

export default api; 