import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { getUploadsBaseUrl, getBackendOrigin, getApiBaseUrl } from "./api-url"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function resolvePhotoUrl(photo?: string): string {
  if (!photo) return ""
  const trimmed = photo.trim()
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed
  }

  // Backend stores paths like /uploads/filename.jpg
  if (trimmed.startsWith("/uploads/")) {
    return `${getBackendOrigin()}${trimmed}`
  }

  const normalized = trimmed.replace(/^\/+/, "")

  if (normalized.startsWith("uploads/")) {
    return `${getBackendOrigin()}/${normalized}`
  }

  // Legacy PHP uploads: /purbiya/api/user/...
  if (normalized.startsWith("user/") || normalized.startsWith("api/user/")) {
    const apiPath = normalized.startsWith("api/") ? normalized : `api/${normalized}`
    return `${getApiBaseUrl().replace(/\/api\/?$/, "")}/${apiPath}`
  }

  return `${getUploadsBaseUrl()}/${normalized}`
}

/** Applicant photo keys — passportPhoto first (PHP API field name). */
export const APPLICANT_PHOTO_FIELD_KEYS = [
  "passportPhoto",
  "passportPhotoUrl",
  "passport_photo",
  "photoUrl",
  "photo",
  "photo_url",
] as const;

/** Nominee photo keys — nomineePassportPhoto first (PHP API field name). */
export const NOMINEE_PHOTO_FIELD_KEYS = [
  "nomineePassportPhoto",
  "nomineePassportPhotoUrl",
  "nomineePhotoUrl",
  "nominee_photo",
  "nominee_passport_photo",
  "nomineePhoto",
] as const;

const DEFAULT_PHOTO_FIELD_KEYS = [
  ...APPLICANT_PHOTO_FIELD_KEYS,
  ...NOMINEE_PHOTO_FIELD_KEYS,
  "profile_image",
  "profileImage",
] as const;

export function getApplicantPhotoPath(
  record: Record<string, unknown> | null | undefined
): string {
  return getPhotoPath(record, APPLICANT_PHOTO_FIELD_KEYS);
}

export function getNomineePhotoPath(
  record: Record<string, unknown> | null | undefined
): string {
  return getPhotoPath(record, NOMINEE_PHOTO_FIELD_KEYS);
}

/** Read the first non-empty string field from an API record. */
export function getRecordField(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  if (!record) return "";
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

/** Read the stored photo path from API records (supports legacy + Prisma field names). */
export function getPhotoPath(
  record: Record<string, unknown> | null | undefined,
  keys: readonly string[] = DEFAULT_PHOTO_FIELD_KEYS
): string {
  if (!record) return "";
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/** Build a browser-ready image URL from a stored upload path. */
export function getDisplayPhotoUrl(photo?: string | null): string {
  return photo ? resolvePhotoUrl(photo) : "";
}

/**
 * Browser-ready image src for an uploaded photo.
 * Returns the direct backend URL (the `/uploads` route is served with a
 * cross-origin resource policy, so no proxy is needed).
 */
export function getProxiedPhotoSrc(photo?: string | null): string {
  return getDisplayPhotoUrl(photo);
}

/**
 * Fetch an uploaded photo and return it as a base64 data URL for embedding in
 * generated PDFs. Resolves relative `/uploads/...` paths to absolute first, so
 * records that store a relative path still produce an image. Returns null on
 * failure (missing/unreachable image) so callers can render without a photo.
 */
export async function getPhotoDataUrl(photo?: string | null): Promise<string | null> {
  if (!photo) return null;
  const trimmed = String(photo).trim();
  if (!trimmed) return null;
  // Already a data URL — nothing to fetch.
  if (trimmed.startsWith("data:")) return trimmed;

  const url = getDisplayPhotoUrl(trimmed);
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("Failed to fetch image:", response.status, response.statusText);
      return null;
    }
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Could not process image:", error);
    return null;
  }
}

// Re-export permission functions from the new permissions system
export {
  getUserRole,
  isAdmin,
  isAgent,
  hasModulePermission,
  hasModuleAccess,
  canCreate,
  canUpdate,
  canDelete,
  getAccessibleModules,
  getUserPermissions,
  getModulePermissions,
  hasAnyPermission
} from "./permissions"

// Date formatting utilities
export function formatDate(date: string | Date): string {
  if (!date) return ""

  if (typeof date === "string") {
    const trimmed = date.trim()
    if (!trimmed) return ""
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const [year, month, day] = trimmed.split("T")[0].split("-")
      return `${day}-${month}-${year}`
    }
    const parsed = parseDateFromDDMMYYYY(trimmed)
    if (parsed) {
      const day = String(parsed.getDate()).padStart(2, "0")
      const month = String(parsed.getMonth() + 1).padStart(2, "0")
      const year = parsed.getFullYear()
      return `${day}-${month}-${year}`
    }
  }

  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return ""

  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()

  return `${day}-${month}-${year}`
}

export function formatDateForAPI(date: Date | undefined): string {
  if (!date) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateFromDDMMYYYY(dateString: string): Date | undefined {
  if (!dateString) return undefined

  const trimmed = dateString.trim()
  if (!trimmed) return undefined

  // ISO datetime or YYYY-MM-DD from API
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [year, month, day] = trimmed.split("T")[0].split("-").map((part) => parseInt(part, 10))
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month - 1, day)
    }
  }

  // Handle both hyphen and forward slash separators
  const parts = trimmed.split(/[-\/]/)
  if (parts.length !== 3) return undefined
  
  let day, month, year;

  // Check if it's YYYY-MM-DD (first part is 4 digits)
  if (parts[0].length === 4) {
    year = parseInt(parts[0], 10)
    month = parseInt(parts[1], 10) - 1
    day = parseInt(parts[2], 10)
  } else {
    // Assume DD-MM-YYYY
    day = parseInt(parts[0], 10)
    month = parseInt(parts[1], 10) - 1
    year = parseInt(parts[2], 10)
    
    // Handle 2-digit years if necessary (optional, but good for robustness)
    if (year < 100) {
      year += 2000;
    }
  }
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return undefined
  
  return new Date(year, month, day)
}

// Format date for display (dd MMMM, yyyy) - For more readable display
export function formatDateDisplay(date: string | Date): string {
  if (!date) return ""
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return ""
  
  return dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  })
}

// Format date for input fields (yyyy-mm-dd)
export function formatDateForInput(date: string | Date): string {
  if (!date) return ""
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return ""
  
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

// Format date for table display - ensures consistent dd-mm-yyyy format
export function formatDateForTable(date: string | Date): string {
  return formatDate(date)
}

// Validate if a date string is valid
export function isValidDate(date: string | Date): boolean {
  if (!date) return false
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return !isNaN(dateObj.getTime())
}

export function formatCurrency(amount: string | number): string {
  return `₹${Number(amount).toLocaleString("hi-IN")}`
}

/** Standard Mayra association period shown on forms and bond PDF (12 months in Hindi). */
export const MAYRA_ASSOCIATION_DURATION_HI = "बारह महीने"

// Calculate duration between two dates in months and days
export function calculateDuration(startDate: string | Date, endDate: string | Date): string {
  if (!startDate || !endDate) return ""
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return ""
  
  // Ensure start date is before end date for duration display
  const from = start <= end ? start : end;
  const to = start <= end ? end : start;

  let years = 0
  let months = 0
  let days = 0

  // Calculate years and months
  const startYear = from.getFullYear()
  const startMonth = from.getMonth()
  const endYear = to.getFullYear()
  const endMonth = to.getMonth()
  
  years = endYear - startYear
  months = endMonth - startMonth
  
  // Adjust for negative months
  if (months < 0) {
    years -= 1
    months += 12
  }
  
  // Calculate days
  const startDay = from.getDate()
  const endDay = to.getDate()
  
  if (endDay >= startDay) {
    days = endDay - startDay
  } else {
    // Need to borrow from previous month
    const lastMonth = new Date(endYear, endMonth, 0)
    days = lastMonth.getDate() - startDay + endDay
    months -= 1
    
    // Adjust for negative months after borrowing
    if (months < 0) {
      years -= 1
      months += 12
    }
  }
  
  // Format the result
  const yearText = years === 1 ? "साल" : "साल"
  const monthText = months === 1 ? "महीना" : "महीने"
  const dayText = days === 1 ? "दिन" : "दिन"
  
  if (years > 0 && months > 0 && days > 0) {
    return `${years} ${yearText} ${months} ${monthText} ${days} ${dayText}`
  } else if (years > 0 && months > 0) {
    return `${years} ${yearText} ${months} ${monthText}`
  } else if (years > 0 && days > 0) {
    return `${years} ${yearText} ${days} ${dayText}`
  } else if (years > 0) {
    return `${years} ${yearText}`
  } else if (months > 0 && days > 0) {
    return `${months} ${monthText} ${days} ${dayText}`
  } else if (months > 0) {
    return `${months} ${monthText}`
  } else if (days > 0) {
    return `${days} ${dayText}`
  } else {
    return "0 दिन"
  }
}

/**
 * Calculate age based on date of birth
 * @param dateOfBirth - Date of birth (string or Date object)
 * @param referenceDate - Optional reference date (defaults to current date)
 * @returns Age in years as a number, or null if invalid date
 */
export function calculateAge(dateOfBirth: string | Date, referenceDate?: string | Date): number | null {
  if (!dateOfBirth) return null
  
  // Parse the date of birth
  let dob: Date
  if (typeof dateOfBirth === 'string') {
    // Try to parse using existing utility first
    const parsedDob = parseDateFromDDMMYYYY(dateOfBirth)
    if (parsedDob) {
      dob = parsedDob
    } else {
      dob = new Date(dateOfBirth)
    }
  } else {
    dob = dateOfBirth
  }
  
  // Validate the date of birth
  if (isNaN(dob.getTime())) return null
  
  // Parse reference date (default to current date)
  let refDate: Date
  if (referenceDate) {
    if (typeof referenceDate === 'string') {
      const parsedRef = parseDateFromDDMMYYYY(referenceDate)
      if (parsedRef) {
        refDate = parsedRef
      } else {
        refDate = new Date(referenceDate)
      }
    } else {
      refDate = referenceDate
    }
  } else {
    refDate = new Date()
  }
  
  // Validate reference date
  if (isNaN(refDate.getTime())) return null
  
  // Calculate age
  let age = refDate.getFullYear() - dob.getFullYear()
  const monthDiff = refDate.getMonth() - dob.getMonth()
  
  // Adjust age if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < dob.getDate())) {
    age--
  }
  
  // Return null for negative ages (future dates)
  return age < 0 ? null : age
}

/**
 * Calculate age with months and days
 * @param dateOfBirth - Date of birth (string or Date object)
 * @param referenceDate - Optional reference date (defaults to current date)
 * @returns Object with years, months, and days, or null if invalid date
 */
export function calculateDetailedAge(dateOfBirth: string | Date, referenceDate?: string | Date): { years: number; months: number; days: number } | null {
  if (!dateOfBirth) return null
  
  // Parse the date of birth
  let dob: Date
  if (typeof dateOfBirth === 'string') {
    const parsedDob = parseDateFromDDMMYYYY(dateOfBirth)
    if (parsedDob) {
      dob = parsedDob
    } else {
      dob = new Date(dateOfBirth)
    }
  } else {
    dob = dateOfBirth
  }
  
  // Validate the date of birth
  if (isNaN(dob.getTime())) return null
  
  // Parse reference date (default to current date)
  let refDate: Date
  if (referenceDate) {
    if (typeof referenceDate === 'string') {
      const parsedRef = parseDateFromDDMMYYYY(referenceDate)
      if (parsedRef) {
        refDate = parsedRef
      } else {
        refDate = new Date(referenceDate)
      }
    } else {
      refDate = referenceDate
    }
  } else {
    refDate = new Date()
  }
  
  // Validate reference date
  if (isNaN(refDate.getTime())) return null
  
  // Calculate the difference
  const diffTime = refDate.getTime() - dob.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  // Return null for negative differences (future dates)
  if (diffDays < 0) return null
  
  // Calculate years, months, and days
  let years = refDate.getFullYear() - dob.getFullYear()
  let months = refDate.getMonth() - dob.getMonth()
  let days = refDate.getDate() - dob.getDate()
  
  // Adjust for negative months or days
  if (days < 0) {
    months--
    const lastMonth = new Date(refDate.getFullYear(), refDate.getMonth() - 1, dob.getDate())
    days = Math.floor((refDate.getTime() - lastMonth.getTime()) / (1000 * 60 * 60 * 24))
  }
  
  if (months < 0) {
    years--
    months += 12
  }
  
  return { years, months, days }
}

/**
 * Format age for display
 * @param age - Age in years
 * @returns Formatted age string
 */
export function formatAge(age: number): string {
  if (age === 0) return "Less than 1 year"
  if (age === 1) return "1 year"
  return `${age} years`
}

/**
 * Format detailed age for display
 * @param detailedAge - Object with years, months, and days
 * @returns Formatted age string
 */
export function formatDetailedAge(detailedAge: { years: number; months: number; days: number }): string {
  const { years, months, days } = detailedAge
  
  const parts: string[] = []
  
  if (years > 0) {
    parts.push(years === 1 ? "1 year" : `${years} years`)
  }
  
  if (months > 0) {
    parts.push(months === 1 ? "1 month" : `${months} months`)
  }
  
  if (days > 0) {
    parts.push(days === 1 ? "1 day" : `${days} days`)
  }
  
  if (parts.length === 0) {
    return "Less than 1 day"
  }
  
  return parts.join(", ")
}

// Phone number validation function
export const validatePhoneNumber = (phone: string): boolean => {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Check if it's a valid Indian phone number (10 digits starting with 6-9)
  const phoneRegex = /^[6-9]\d{9}$/;
  
  return phoneRegex.test(cleanPhone);
};

/** Normalize API `data` from single-record (object) or list (array) responses. */
export function unwrapApiRecord<T = Record<string, unknown>>(data: unknown): T | null {
  if (data == null) return null;
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  if (typeof data === "object") return data as T;
  return null;
}

/** Pick a record by id when API returns a list, or return the object as-is. */
export function unwrapApiRecordById<T extends { id?: string | number }>(
  data: unknown,
  id?: string | number
): T | null {
  if (data == null) return null;
  if (Array.isArray(data)) {
    if (id != null) {
      const match = data.find((item) => String((item as T).id) === String(id));
      return (match as T) ?? null;
    }
    return (data[0] as T) ?? null;
  }
  if (typeof data === "object") return data as T;
  return null;
}

/** Normalize agent API rows (flat or nested user + agentProfile) for add/edit forms. */
export function mapAgentFormRecord(
  record: Record<string, unknown> | null | undefined
): Record<string, string> | null {
  if (!record) return null;

  const profile = (record.agentProfile ?? record.agent_profile ?? {}) as Record<string, unknown>;
  const str = (value: unknown) => (value == null || value === "" ? "" : String(value));
  const dateStr = (value: unknown) => (value ? formatDate(String(value)) : "");

  return {
    id: str(record.id),
    date: dateStr(
      profile.registrationDate ??
        profile.registration_date ??
        record.date ??
        record.createdAt ??
        record.created_at,
    ),
    employee_id: str(profile.employeeId ?? profile.employee_id ?? record.employee_id),
    name: str(record.name),
    fatherName: str(profile.fatherName ?? profile.father_name ?? record.fatherName),
    gotra: str(profile.gotra ?? record.gotra),
    age: str(profile.age ?? record.age),
    village: str(profile.village ?? record.village),
    address: str(profile.address ?? record.address),
    tehsil: str(profile.tehsil ?? record.tehsil),
    district: str(profile.district ?? record.district),
    mobile: str(record.mobile),
    aadhaar: str(profile.aadhaar ?? record.aadhaar),
    bankName: str(profile.bankName ?? profile.bank_name ?? record.bankName),
    accountNumber: str(profile.accountNumber ?? profile.account_number ?? record.accountNumber),
    ifsc: str(profile.ifscCode ?? profile.ifsc_code ?? profile.ifsc ?? record.ifsc),
    nomineeName: str(profile.nomineeName ?? profile.nominee_name ?? record.nomineeName),
    nomineeMobile: str(profile.nomineeMobile ?? profile.nominee_mobile ?? record.nomineeMobile),
    nomineeRelation: str(profile.nomineeRelation ?? profile.nominee_relation ?? record.nomineeRelation),
    workArea: str(profile.workArea ?? profile.work_area ?? record.workArea),
    gender: str(profile.gender ?? record.gender),
    dateOfBirth: dateStr(profile.dateOfBirth ?? profile.date_of_birth ?? record.dateOfBirth),
    doj: dateStr(profile.dateOfJoining ?? profile.date_of_joining ?? profile.doj ?? record.doj),
    designation: str(profile.designation ?? record.designation),
    password: "",
    profile_image: str(
      record.profile_image ??
        profile.profileImageUrl ??
        profile.profile_image_url ??
        profile.profile_image
    ),
  };
}

function formatListingDate(value: unknown): string {
  if (!value) return "";
  return formatDate(String(value));
}

/** Normalize suraksha bima API rows for listing/edit UI. */
export function mapSurakshaBimaListingRecord(record: Record<string, unknown>) {
  const insuranceApp = (record.insuranceApplication as Record<string, unknown>) || {};
  const deducted10 = Number(record.deducted10Percent ?? record.deducted_10_percent ?? 0);
  const deducted25 = Number(record.deducted25Percent ?? record.deducted_25_percent ?? 0);
  const deductionPercent =
    deducted25 > 0 ? "25" : deducted10 > 0 ? "10" : String(record.deductionPercent ?? "10");
  const deductionAmount = deducted25 > 0 ? deducted25 : deducted10;

  return {
    ...record,
    id: String(record.id ?? ""),
    date: formatListingDate(record.date),
    codeNumber: String(record.codeNumber ?? record.code_number ?? ""),
    bimaNumber: String(record.bimaNumber ?? record.bima_number ?? ""),
    applicantName: String(record.applicantName ?? record.applicant_name ?? ""),
    fatherName: String(record.fatherName ?? record.father_name ?? ""),
    wifeOf: String(record.wifeOf ?? record.wife_of ?? ""),
    gotra: String(record.gotra ?? ""),
    address: String(record.address ?? ""),
    membershipJoinDate: formatListingDate(record.membershipJoinDate ?? record.membership_join_date),
    associatedUntil: formatListingDate(record.associatedUntil ?? record.associated_until),
    permanentFee: String(record.permanentFee ?? record.permanent_fee ?? ""),
    installmentAmount: String(record.installmentAmount ?? record.installment_amount ?? ""),
    totalGrantAmount: String(record.totalGrantAmount ?? record.total_grant_amount ?? ""),
    totalMembersServing: String(record.totalMembersServing ?? record.total_members_serving ?? ""),
    rate200: String(record.rate200 ?? record.rate_200 ?? ""),
    deducted10Percent: String(deducted10),
    deducted25Percent: String(deducted25),
    totalPaidAmount: String(record.totalPaidAmount ?? record.total_paid_amount ?? ""),
    deductionPercent,
    deductionAmount: String(deductionAmount),
    gender: String(record.gender ?? insuranceApp.gender ?? ""),
    createdAt: String(record.createdAt ?? record.created_at ?? ""),
  };
}

// Get current user's addedby and addedby_id information
export function getCurrentUserInfo() {
  if (typeof window === 'undefined') {
    return { addedby: 'admin', addedby_id: 1 };
  }

  const userRole = localStorage.getItem("userRole") || "admin";
  
  if (userRole === "admin") {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return { addedby: user.name || "admin", addedby_id: user.id || 1 };
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
    return { addedby: "admin", addedby_id: 1 };
  } else if (userRole === "agent") {
    const agentData = localStorage.getItem("agent");
    if (agentData) {
      try {
        const agent = JSON.parse(agentData);
        return { addedby: 'agent', addedby_id: agent.id || agent.agent_id || 1 };
      } catch (error) {
        console.error("Error parsing agent data:", error);
        return { addedby: 'agent', addedby_id: 1 };
      }
    }
  }
  
  return { addedby: 'admin', addedby_id: 1 };
}

/**
 * Convert a File object to base64 data URL for PDF generation
 * @param file - The file to convert
 * @returns Promise<string> - Base64 data URL
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

/**
 * Process image data for PDF generation - handles URLs, base64, and File objects
 * @param imageData - Can be a URL, base64 string, or File object
 * @returns Promise<string | null> - Base64 data URL or null if processing fails
 */
export const processImageForPDF = async (imageData: string | File | null | undefined): Promise<string | null> => {
  if (!imageData) return null;
  
  try {
    // If it's a File object, convert to base64
    if (imageData instanceof File) {
      return await fileToBase64(imageData);
    }
    
    // If it's a string
    if (typeof imageData === 'string') {
      // If it's already base64, return as is
      if (imageData.startsWith('data:')) {
        return imageData;
      }
      
      // If it's a URL, fetch and convert to base64
      if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
        try {
          const response = await fetch(imageData);
          if (!response.ok) {
            console.warn('Failed to fetch image from URL:', response.statusText);
            return null;
          }
          
          const blob = await response.blob();
          return await fileToBase64(new File([blob], 'image.jpg', { type: blob.type }));
        } catch (error) {
          console.warn('Error fetching image from URL:', error);
          return null;
        }
      }
    }
  } catch (error) {
    console.warn('Error processing image for PDF:', error);
  }
  
  return null;
};
