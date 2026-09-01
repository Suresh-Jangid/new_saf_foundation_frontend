"use client";

import api, { post, syncAuthSession } from "@/lib/api";
import { getBackendOrigin } from "@/lib/api-url";
import {
  EpinRecord,
  EpinFilterParams,
  EpinGeneratePayload,
  EpinAssignPayload,
  EpinValidationResponse,
  EpinConsumePayload,
  EpinBurnPayload,
  EpinAuditItem,
  EpinSummaryCounts,
  EpinAuditResponse,
} from "@/lib/config-types";

export interface EpinListResponse {
  success: boolean;
  data: EpinRecord[];
  summary: EpinSummaryCounts;
  totalCount: number;
  page: number;
  limit: number;
  message?: string;
}

export interface EpinBatchResponse {
  success: boolean;
  generatedCount: number;
  batchNumber?: string;
  pins: string[];
  message?: string;
}

export interface EpinActionResponse {
  success: boolean;
  message: string;
  data?: any;
}

function extractErrorMessage(error: any, defaultMsg: string): string {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.response?.status === 401) {
    return "Authentication required / प्रमाणीकरण आवश्यक है (401)";
  }
  if (error?.response?.status === 403) {
    return "Permission or agent ownership denied / अनुमति अस्वीकृत (403)";
  }
  if (error?.response?.status === 404) {
    return "E-PIN service or record not found / रिकॉर्ड नहीं मिला (404)";
  }
  if (error?.response?.status === 409) {
    return "E-PIN state conflict or already consumed / ई-पिन स्थिति विवाद या पूर्व में प्रयुक्त (409)";
  }
  if (error?.response?.status === 422) {
    return "Invalid input data / अमान्य इनपुट डेटा (422)";
  }
  if (error?.response?.status === 500) {
    return "Backend internal error / सर्वर त्रुटि (500)";
  }
  return error?.message || defaultMsg;
}

/**
 * Strict Backend-Authoritative E-PIN Service
 *
 * NOTE: Zero local simulation or mock success states are permitted for E-PIN operations.
 * State changes, generation, assignment, consumption, and burning MUST be verified
 * by the backend API.
 */
export const EpinService = {
  /**
   * Fetch E-PIN Inventory with Filters
   * Primary: GET /api/v1/epins
   * Secondary Fallback: POST ?apicall=getEpins
   */
  async getInventory(params?: EpinFilterParams): Promise<EpinListResponse> {
    syncAuthSession();
    try {
      const query = new URLSearchParams();
      if (params?.status && params.status !== "ALL") query.append("status", params.status);
      if (params?.agentId) query.append("agentId", params.agentId);
      if (params?.search) query.append("search", params.search);
      if (params?.batchNumber) query.append("batchNumber", params.batchNumber);
      if (params?.schemeAmount) query.append("schemeAmount", String(params.schemeAmount));
      if (params?.schemeTypeId) query.append("schemeTypeId", params.schemeTypeId);
      if (params?.poolId) query.append("poolId", params.poolId);
      if (params?.page) query.append("page", String(params.page));
      if (params?.limit) query.append("limit", String(params.limit));

      const queryString = query.toString() ? `?${query.toString()}` : "";

      // 1. Primary RESTful Endpoint
      let response: any = await api
        .get(`${getBackendOrigin()}/api/v1/epins${queryString}`)
        .catch((err) => {
          if (err?.response?.status && err.response.status !== 404) {
            throw err;
          }
          return null;
        });

      // 2. Secondary Fallback Query Dispatcher
      if (!response?.data) {
        response = await post(`?apicall=getEpins`, params).catch(() => null);
      }

      if (response?.data && (response.data.status || response.data.success)) {
        const rawList = Array.isArray(response.data.data)
          ? response.data.data
          : Array.isArray(response.data.epins)
          ? response.data.epins
          : [];

        const records: EpinRecord[] = rawList.map((item: any) => ({
          id: String(item.id || item.pinNumber || item.pin_number),
          pinNumber: String(item.pinNumber || item.pin_number || item.code || item.pinCode || ""),
          pinCode: item.pinCode || item.pin_code,
          batchNumber: item.batchNumber || item.batch_number,
          schemeTypeId: item.schemeTypeId || item.scheme_type_id,
          schemeCode: item.schemeCode || item.scheme_code,
          slabCode: item.slabCode || item.slab_code,
          schemeAmount: Number(item.schemeAmount ?? item.scheme_amount ?? item.amount ?? 0),
          amount: Number(item.amount ?? item.schemeAmount ?? 0),
          poolId: item.poolId || item.pool_id,
          status: (item.status?.toUpperCase() as any) || "ACTIVE",
          assignedAgentId: item.assignedAgentId || item.assigned_agent_id || item.agent_id,
          assignedAgentName: item.assignedAgentName || item.assigned_agent_name || item.agent_name,
          assignedDate: item.assignedDate || item.assigned_date || item.assignedAt,
          assignedAt: item.assignedAt || item.assignedDate,
          applicationId: item.applicationId || item.application_id || item.usedByApplicationId,
          applicantName: item.applicantName || item.applicant_name || item.usedByApplicantName,
          usedByApplicationId: item.usedByApplicationId || item.used_by_application_id || item.applicationId,
          usedByApplicantName: item.usedByApplicantName || item.used_by_applicant_name || item.applicant_name,
          usedDate: item.usedDate || item.used_date || item.usedAt,
          usedAt: item.usedAt || item.usedDate,
          burntReason: item.burntReason || item.burnt_reason || item.reason,
          burntDate: item.burntDate || item.burnt_date || item.burntAt,
          burntAt: item.burntAt || item.burntDate,
          createdAt: item.createdAt || item.created_at || new Date().toISOString(),
          updatedAt: item.updatedAt || item.updated_at,
        }));

        // Compute summary counts from actual backend records
        const summary: EpinSummaryCounts = response.data.summary || {
          total: records.length,
          active: records.filter((r) => r.status === "ACTIVE").length,
          assigned: records.filter((r) => r.status === "ASSIGNED").length,
          used: records.filter((r) => r.status === "USED").length,
          burnt: records.filter((r) => r.status === "BURNT").length,
        };

        return {
          success: true,
          data: records,
          summary,
          totalCount: Number(response.data.totalCount || records.length),
          page: Number(params?.page || 1),
          limit: Number(params?.limit || 50),
        };
      }

      return {
        success: false,
        data: [],
        summary: { total: 0, active: 0, assigned: 0, used: 0, burnt: 0 },
        totalCount: 0,
        page: Number(params?.page || 1),
        limit: Number(params?.limit || 50),
        message: response?.data?.message || "E-PIN service unavailable / रिकॉर्ड लोड नहीं हो सके",
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        summary: { total: 0, active: 0, assigned: 0, used: 0, burnt: 0 },
        totalCount: 0,
        page: 1,
        limit: 50,
        message: extractErrorMessage(error, "Connection error to E-PIN service"),
      };
    }
  },

  /**
   * Batch Generate E-PINs (Admin Only)
   * Primary: POST /api/v1/epins/generate
   * Secondary Fallback: POST ?apicall=generateEpins
   */
  async generateBatch(payload: EpinGeneratePayload): Promise<EpinBatchResponse> {
    syncAuthSession();
    try {
      let response: any = await api
        .post(`${getBackendOrigin()}/api/v1/epins/generate`, payload)
        .catch((err) => {
          if (err?.response?.status && err.response.status !== 404) {
            throw err;
          }
          return null;
        });

      if (!response?.data) {
        response = await post("?apicall=generateEpins", payload).catch(() => null);
      }

      if (response?.data && (response.data.status || response.data.success)) {
        const rawPins = response.data.pins || response.data.data?.pins || response.data.data || response.data.epins || [];
        const pins: string[] = Array.isArray(rawPins)
          ? rawPins
              .map((p: any) =>
                typeof p === "string"
                  ? p
                  : String(p?.pinNumber || p?.pin_number || p?.pinCode || p?.code || p?.id || "")
              )
              .filter(Boolean)
          : [];

        const generatedCount = Number(
          response.data.generatedCount ||
            response.data.count ||
            (pins.length > 0 ? pins.length : payload.count)
        );

        return {
          success: true,
          generatedCount,
          batchNumber: response.data.batchNumber || response.data.batch_number,
          pins,
          message: response.data.message || `Successfully generated ${generatedCount} E-PIN vouchers`,
        };
      }

      return {
        success: false,
        generatedCount: 0,
        pins: [],
        message: response?.data?.message || "Failed to generate E-PIN batch from backend",
      };
    } catch (error: any) {
      return {
        success: false,
        generatedCount: 0,
        pins: [],
        message: extractErrorMessage(error, "E-PIN generation service unavailable"),
      };
    }
  },

  /**
   * Assign Batch of E-PINs to Agent (Admin Only)
   * Primary: POST /api/v1/epins/assign
   * Secondary Fallback: POST ?apicall=assignEpins
   */
  async assignToAgent(payload: EpinAssignPayload): Promise<EpinActionResponse> {
    syncAuthSession();
    try {
      let response: any = await api
        .post(`${getBackendOrigin()}/api/v1/epins/assign`, payload)
        .catch((err) => {
          if (err?.response?.status && err.response.status !== 404) {
            throw err;
          }
          return null;
        });

      if (!response?.data) {
        response = await post("?apicall=assignEpins", payload).catch(() => null);
      }

      if (response?.data && (response.data.status || response.data.success)) {
        return {
          success: true,
          message: response.data.message || `Assigned ${payload.epinIds.length} E-PIN(s) successfully`,
          data: response.data.data,
        };
      }

      return {
        success: false,
        message: response?.data?.message || "Failed to assign E-PINs to agent",
      };
    } catch (error: any) {
      return {
        success: false,
        message: extractErrorMessage(error, "E-PIN assignment service unavailable"),
      };
    }
  },

  /**
   * Validate E-PIN Voucher for Beneficiary Registration
   * Primary: POST /api/v1/epins/validate
   * Secondary Fallback: POST ?apicall=validateEpin
   *
   * SECURITY RULE: Never return valid=true without backend confirmation.
   */
  async validateEpin(pinNumber: string, agentId?: string): Promise<EpinValidationResponse> {
    const trimmed = (pinNumber || "").trim();
    if (!trimmed) {
      return {
        valid: false,
        pinNumber: "",
        message: "कृपया ई-पिन दर्ज करें / Please enter E-PIN",
        code: "INVALID",
      };
    }

    syncAuthSession();
    try {
      const payload = { pinNumber: trimmed, agentId };

      let response: any = await api
        .post(`${getBackendOrigin()}/api/v1/epins/validate`, payload)
        .catch((err) => {
          if (err?.response?.status && err.response.status !== 404) {
            throw err;
          }
          return null;
        });

      if (!response?.data) {
        response = await post("?apicall=validateEpin", payload).catch(() => null);
      }

      if (response?.data) {
        const res = response.data;
        const isValid = Boolean(res.valid || res.status === "ACTIVE" || res.status === "ASSIGNED" || res.success === true);
        const epinData = res.data || res.epin || {};

        let code: EpinValidationResponse["code"] = "VALID";
        if (!isValid) {
          const status = (res.status || epinData.status || "").toUpperCase();
          if (status === "USED") code = "ALREADY_USED";
          else if (status === "BURNT") code = "BURNT";
          else if (status === "NOT_ASSIGNED") code = "NOT_ASSIGNED";
          else if (status === "UNAUTHORIZED") code = "UNAUTHORIZED";
          else code = "INVALID";
        }

        return {
          valid: isValid,
          status: epinData.status || res.status,
          pinNumber: trimmed,
          schemeAmount: Number(epinData.schemeAmount || epinData.amount || res.schemeAmount || 0),
          amount: Number(epinData.amount || epinData.schemeAmount || res.schemeAmount || 0),
          schemeTypeId: epinData.schemeTypeId || epinData.scheme_type_id,
          schemeCode: epinData.schemeCode || epinData.scheme_code,
          assignedAgentId: epinData.assignedAgentId || epinData.assigned_agent_id,
          assignedAgentName: epinData.assignedAgentName || epinData.assigned_agent_name,
          message: res.message || (isValid ? "E-PIN is valid / ई-पिन मान्य है" : "E-PIN is invalid or unavailable"),
          code,
        };
      }

      return {
        valid: false,
        pinNumber: trimmed,
        message: "E-PIN verification service unavailable / सत्यापन सेवा अनुपलब्ध है",
        code: "UNAVAILABLE",
      };
    } catch (error: any) {
      const msg = extractErrorMessage(error, "E-PIN validation failed");
      let code: EpinValidationResponse["code"] = "UNAVAILABLE";
      if (error?.response?.status === 403) code = "UNAUTHORIZED";
      if (error?.response?.status === 409) code = "ALREADY_USED";
      if (error?.response?.status === 422) code = "INVALID";

      return {
        valid: false,
        pinNumber: trimmed,
        message: msg,
        code,
      };
    }
  },

  /**
   * Consume E-PIN (Atomic Beneficiary Application Linking)
   * Primary: POST /api/v1/epins/consume
   * Secondary Fallback: POST ?apicall=consumeEpin
   */
  async consumeEpin(payload: EpinConsumePayload): Promise<EpinActionResponse> {
    syncAuthSession();
    try {
      let response: any = await api
        .post(`${getBackendOrigin()}/api/v1/epins/consume`, payload)
        .catch((err) => {
          if (err?.response?.status && err.response.status !== 404) {
            throw err;
          }
          return null;
        });

      if (!response?.data) {
        response = await post("?apicall=consumeEpin", payload).catch(() => null);
      }

      if (response?.data && (response.data.status || response.data.success)) {
        return {
          success: true,
          message: response.data.message || "E-PIN successfully consumed and linked",
          data: response.data.data,
        };
      }

      return {
        success: false,
        message: response?.data?.message || "Failed to consume E-PIN voucher",
      };
    } catch (error: any) {
      return {
        success: false,
        message: extractErrorMessage(error, "E-PIN consumption service unavailable"),
      };
    }
  },

  /**
   * Burn / Invalidate E-PIN (Admin Only, Irreversible)
   * Primary: POST /api/v1/epins/burn
   * Secondary Fallback: POST ?apicall=burnEpin
   */
  async burnEpin(payload: EpinBurnPayload): Promise<EpinActionResponse> {
    syncAuthSession();
    try {
      let response: any = await api
        .post(`${getBackendOrigin()}/api/v1/epins/burn`, payload)
        .catch((err) => {
          if (err?.response?.status && err.response.status !== 404) {
            throw err;
          }
          return null;
        });

      if (!response?.data) {
        response = await post("?apicall=burnEpin", payload).catch(() => null);
      }

      if (response?.data && (response.data.status || response.data.success)) {
        return {
          success: true,
          message: response.data.message || "E-PIN has been permanently burnt/invalidated",
          data: response.data.data,
        };
      }

      return {
        success: false,
        message: response?.data?.message || "Failed to burn E-PIN from backend",
      };
    } catch (error: any) {
      return {
        success: false,
        message: extractErrorMessage(error, "E-PIN invalidation service unavailable"),
      };
    }
  },

  /**
   * Get E-PIN Audit History
   * Primary: GET /api/v1/epins/audit
   * Secondary Fallback: POST ?apicall=getEpinAudit
   */
  async getAuditHistory(epinId?: string): Promise<EpinAuditResponse> {
    syncAuthSession();
    try {
      const url = epinId
        ? `${getBackendOrigin()}/api/v1/epins/${epinId}/history`
        : `${getBackendOrigin()}/api/v1/epins/audit`;

      let response: any = await api.get(url).catch((err) => {
        if (err?.response?.status && err.response.status !== 404) {
          throw err;
        }
        return null;
      });

      if (!response?.data) {
        response = await post("?apicall=getEpinAudit", { epinId }).catch(() => null);
      }

      if (response?.data && (response.data.status || response.data.success)) {
        const rawList = Array.isArray(response.data.data)
          ? response.data.data
          : Array.isArray(response.data.history)
          ? response.data.history
          : [];

        const items: EpinAuditItem[] = rawList.map((item: any) => ({
          id: String(item.id || Math.random()),
          epinId: String(item.epinId || item.epin_id || epinId || ""),
          pinNumber: String(item.pinNumber || item.pin_number || ""),
          action: item.action || (item.fromStatus ? `${item.fromStatus} → ${item.toStatus}` : "STATUS_CHANGE"),
          previousState: item.fromStatus || item.previousState || item.previous_state,
          newState: item.toStatus || item.newState || item.new_state || item.status || "ACTIVE",
          actorId: item.performedById || item.actorId || item.actor_id || item.user_id || item.performedBy?.id,
          actorName: item.performedBy?.name || item.actorName || item.actor_name || item.user_name,
          actorRole: item.performedBy?.role || item.actorRole || item.actor_role || item.role,
          remarks: item.remarks || item.reason,
          metadata: item.metadata,
          createdAt: item.timestamp || item.createdAt || item.created_at || new Date().toISOString(),
        }));

        return {
          success: true,
          data: items,
        };
      }

      return {
        success: false,
        data: [],
        message: response?.data?.message || "Audit history unavailable",
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: extractErrorMessage(error, "Error retrieving audit history"),
      };
    }
  },
};

export default EpinService;
