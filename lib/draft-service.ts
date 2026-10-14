/**
 * SAF Foundation — Centralized Registration Draft Service
 *
 * Provides safe, user-scoped, persistent draft management across all registration modules.
 * - Strict User/Agent isolation (User A cannot view or edit User B's drafts)
 * - Safe sanitization (strips credentials/secrets, minimizes sensitive data)
 * - Anti-duplication (repeated saves update the existing draft by ID)
 * - Zero side effects: does NOT consume E-PINs, create payments, or call final registration APIs
 */

export interface RegistrationDraft<T = Record<string, any>> {
  id: string;
  moduleKey: string;
  moduleTitle: string;
  applicantName: string;
  mobile: string;
  formData: T;
  userId: string;
  userRole?: string;
  createdAt: string;
  updatedAt: string;
  status: "DRAFT" | "COMPLETED";
}

export interface SaveDraftOptions {
  draftId?: string;
  applicantName?: string;
  mobile?: string;
  moduleTitle?: string;
}

const STORAGE_PREFIX = "saf_drafts_v1_";

/**
 * Get the current user identifier to ensure strict RBAC / tenant isolation
 */
function getCurrentUserScope(): { userId: string; userRole: string } {
  if (typeof window === "undefined") {
    return { userId: "server", userRole: "unknown" };
  }

  try {
    const userRaw = localStorage.getItem("user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (user?.id || user?._id || user?.email) {
        return {
          userId: String(user.id || user._id || user.email),
          userRole: localStorage.getItem("userRole") || "user",
        };
      }
    }

    const agentRaw = localStorage.getItem("agent");
    if (agentRaw) {
      const agent = JSON.parse(agentRaw);
      if (agent?.id || agent?._id || agent?.mobile) {
        return {
          userId: `agent_${agent.id || agent._id || agent.mobile}`,
          userRole: "agent",
        };
      }
    }

    const token = localStorage.getItem("token");
    if (token) {
      // Use short hash of token as fallback user scope
      return {
        userId: `token_user_${token.slice(-12)}`,
        userRole: localStorage.getItem("userRole") || "authenticated",
      };
    }
  } catch {
    // Ignore JSON errors
  }

  return { userId: "anonymous_session", userRole: "guest" };
}

/**
 * Sanitize form payload before persisting to drafts:
 * - Removes passwords, API keys, auth tokens, secret credentials
 * - Serializes File objects safely (retains filename & size metadata without corrupting storage)
 */
function sanitizeFormData(data: any): any {
  if (!data || typeof data !== "object") return data;

  const forbiddenKeys = ["password", "confirmPassword", "token", "apiKey", "secret", "cvv", "cardNumber"];

  if (Array.isArray(data)) {
    return data.map(sanitizeFormData);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (forbiddenKeys.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
      continue; // Skip sensitive security fields
    }

    // Handle File / Blob instances safely
    if (typeof File !== "undefined" && val instanceof File) {
      sanitized[key] = {
        _isFile: true,
        name: val.name,
        size: val.size,
        type: val.type,
      };
    } else if (typeof Blob !== "undefined" && val instanceof Blob) {
      sanitized[key] = {
        _isBlob: true,
        size: val.size,
        type: val.type,
      };
    } else if (typeof val === "object" && val !== null) {
      sanitized[key] = sanitizeFormData(val);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

export const DraftService = {
  /**
   * Get storage key scoped to current user
   */
  getStorageKey(userId?: string): string {
    const scope = userId || getCurrentUserScope().userId;
    return `${STORAGE_PREFIX}${scope}`;
  },

  /**
   * Load all drafts belonging to current authenticated user
   */
  getAllDrafts(moduleFilter?: string): RegistrationDraft[] {
    if (typeof window === "undefined") return [];

    try {
      const key = this.getStorageKey();
      const raw = localStorage.getItem(key);
      if (!raw) return [];

      let drafts: RegistrationDraft[] = JSON.parse(raw);
      if (!Array.isArray(drafts)) drafts = [];

      // Filter out completed drafts and sort latest first
      drafts = drafts.filter((d) => d.status !== "COMPLETED");
      drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      if (moduleFilter) {
        return drafts.filter((d) => d.moduleKey === moduleFilter);
      }

      return drafts;
    } catch (error) {
      console.error("[DraftService] Error loading drafts:", error);
      return [];
    }
  },

  /**
   * Get a single draft by its ID
   */
  getDraft(draftId: string): RegistrationDraft | null {
    if (!draftId || typeof window === "undefined") return null;

    try {
      const all = this.getAllDrafts();
      return all.find((d) => d.id === draftId) || null;
    } catch {
      return null;
    }
  },

  /**
   * Get the most recent draft for a given module
   */
  getLatestDraftForModule(moduleKey: string): RegistrationDraft | null {
    if (!moduleKey || typeof window === "undefined") return null;

    const moduleDrafts = this.getAllDrafts(moduleKey);
    return moduleDrafts.length > 0 ? moduleDrafts[0] : null;
  },

  /**
   * Save or update a draft.
   * If `draftId` is provided, updates that draft; otherwise creates a new draft record.
   */
  saveDraft<T = Record<string, any>>(
    moduleKey: string,
    formData: T,
    options: SaveDraftOptions = {}
  ): RegistrationDraft<T> {
    if (typeof window === "undefined") {
      throw new Error("Drafts can only be saved in the client browser environment");
    }

    const { userId, userRole } = getCurrentUserScope();
    const key = this.getStorageKey(userId);
    const now = new Date().toISOString();

    let allDrafts: RegistrationDraft[] = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) allDrafts = JSON.parse(raw) || [];
      if (!Array.isArray(allDrafts)) allDrafts = [];
    } catch {
      allDrafts = [];
    }

    const sanitizedData = sanitizeFormData(formData);

    // Extract applicant name and mobile if not explicitly provided
    const applicantName =
      options.applicantName ||
      (formData as any)?.applicantName ||
      (formData as any)?.name ||
      (formData as any)?.fullName ||
      "अनाम आवेदक (Draft)";

    const mobile =
      options.mobile ||
      (formData as any)?.mobile ||
      (formData as any)?.mobileNumber ||
      (formData as any)?.phone ||
      "";

    const moduleTitle = options.moduleTitle || moduleKey;

    let targetDraftId = options.draftId;
    let existingIndex = -1;

    if (targetDraftId) {
      existingIndex = allDrafts.findIndex((d) => d.id === targetDraftId);
    } else {
      // Check if an existing uncompleted draft for this module exists
      const existingLatest = allDrafts.find((d) => d.moduleKey === moduleKey && d.status === "DRAFT");
      if (existingLatest) {
        targetDraftId = existingLatest.id;
        existingIndex = allDrafts.findIndex((d) => d.id === targetDraftId);
      }
    }

    let savedDraft: RegistrationDraft<T>;

    if (existingIndex >= 0) {
      // Update existing draft in-place without creating duplicate records
      savedDraft = {
        ...allDrafts[existingIndex],
        formData: sanitizedData,
        applicantName: String(applicantName),
        mobile: String(mobile),
        updatedAt: now,
      };
      allDrafts[existingIndex] = savedDraft as any;
    } else {
      // Create new draft
      const newId = targetDraftId || `draft_${moduleKey}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      savedDraft = {
        id: newId,
        moduleKey,
        moduleTitle,
        applicantName: String(applicantName),
        mobile: String(mobile),
        formData: sanitizedData,
        userId,
        userRole,
        createdAt: now,
        updatedAt: now,
        status: "DRAFT",
      };
      allDrafts.unshift(savedDraft as any);
    }

    // Keep max 25 drafts per user to maintain localStorage hygiene
    if (allDrafts.length > 25) {
      allDrafts = allDrafts.slice(0, 25);
    }

    localStorage.setItem(key, JSON.stringify(allDrafts));

    return savedDraft;
  },

  /**
   * Discard/Delete a specific draft by ID
   */
  deleteDraft(draftId: string): boolean {
    if (!draftId || typeof window === "undefined") return false;

    try {
      const key = this.getStorageKey();
      const raw = localStorage.getItem(key);
      if (!raw) return false;

      let allDrafts: RegistrationDraft[] = JSON.parse(raw);
      if (!Array.isArray(allDrafts)) return false;

      const filtered = allDrafts.filter((d) => d.id !== draftId);
      localStorage.setItem(key, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error("[DraftService] Error deleting draft:", error);
      return false;
    }
  },

  /**
   * Discard all drafts for a given module
   */
  clearDraftsForModule(moduleKey: string): void {
    if (!moduleKey || typeof window === "undefined") return;

    try {
      const key = this.getStorageKey();
      const raw = localStorage.getItem(key);
      if (!raw) return;

      let allDrafts: RegistrationDraft[] = JSON.parse(raw);
      if (!Array.isArray(allDrafts)) return;

      const filtered = allDrafts.filter((d) => d.moduleKey !== moduleKey);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (error) {
      console.error("[DraftService] Error clearing drafts for module:", error);
    }
  },

  /**
   * Mark draft completed upon successful Final Submit
   */
  markDraftCompleted(draftId?: string | null): void {
    if (!draftId || typeof window === "undefined") return;
    this.deleteDraft(draftId);
  },
};
