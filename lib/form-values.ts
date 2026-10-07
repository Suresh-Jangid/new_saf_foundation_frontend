/** API wire-format values shared across all forms (lowercase snake_case). */
export const PAYMENT_MODE = {
  CASH: "cash",
  CHEQUE: "cheque",
  DD: "dd",
  ONLINE: "online",
  RAZORPAY: "razorpay",
  BANK_TRANSFER: "bank_transfer",
  UPI: "upi",
} as const;

export type PaymentModeValue =
  (typeof PAYMENT_MODE)[keyof typeof PAYMENT_MODE];

export const PAYMENT_MODE_OPTIONS: Array<{
  value: PaymentModeValue;
  label: string;
  labelHi?: string;
}> = [
  { value: PAYMENT_MODE.CASH, label: "Cash", labelHi: "नकद" },
  { value: PAYMENT_MODE.CHEQUE, label: "Cheque", labelHi: "चेक" },
  { value: PAYMENT_MODE.DD, label: "D.D.", labelHi: "डी.डी." },
  { value: PAYMENT_MODE.ONLINE, label: "Online", labelHi: "ऑनलाइन" },
  {
    value: PAYMENT_MODE.BANK_TRANSFER,
    label: "Bank Transfer",
    labelHi: "बैंक ट्रांसफर",
  },
  { value: PAYMENT_MODE.UPI, label: "UPI", labelHi: "यूपीआई" },
  { value: PAYMENT_MODE.RAZORPAY, label: "Razorpay", labelHi: "रेज़रपे" },
];

/** Prisma Gender enum wire values used across all forms. */
export const GENDER = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
} as const;

export type GenderValue = (typeof GENDER)[keyof typeof GENDER];

export const GENDER_OPTIONS: Array<{ value: GenderValue; label: string }> = [
  { value: GENDER.MALE, label: "पुरुष / Male" },
  { value: GENDER.FEMALE, label: "महिला / Female" },
  { value: GENDER.OTHER, label: "अन्य / Other" },
];

/**
 * Normalize any gender input (case/locale/legacy variants) to the canonical
 * Prisma enum value. Prevents "Invalid gender" failures from inconsistent casing
 * or values like "male"/"boy"/"पुरुष" reaching the API.
 */
export function normalizeGenderInput(value: unknown): GenderValue {
  if (value === GENDER.MALE || value === GENDER.FEMALE || value === GENDER.OTHER) {
    return value as GenderValue;
  }
  const g = String(value ?? "").trim().toLowerCase();
  if (["male", "m", "boy", "boys", "पुरुष", "लड़का"].includes(g)) return GENDER.MALE;
  if (["female", "f", "girl", "girls", "महिला", "लड़की"].includes(g)) return GENDER.FEMALE;
  return GENDER.OTHER;
}

export function isMale(value: unknown): boolean {
  return normalizeGenderInput(value) === GENDER.MALE;
}

export function isFemale(value: unknown): boolean {
  return normalizeGenderInput(value) === GENDER.FEMALE;
}

export function formatGenderLabel(value: unknown): string {
  const g = normalizeGenderInput(value);
  return GENDER_OPTIONS.find((o) => o.value === g)?.label ?? String(value ?? "");
}

export function normalizePaymentModeInput(value: unknown): PaymentModeValue {
  const mode = String(value || PAYMENT_MODE.CASH)
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  if (mode === "cheque" || mode === "check") return PAYMENT_MODE.CHEQUE;
  if (mode === "dd" || mode === "d.d." || mode === "d.d") return PAYMENT_MODE.DD;
  if (mode === "razorpay") return PAYMENT_MODE.RAZORPAY;
  if (mode === "bank_transfer") return PAYMENT_MODE.BANK_TRANSFER;
  if (mode === "upi") return PAYMENT_MODE.UPI;
  if (mode === "online") return PAYMENT_MODE.ONLINE;
  return PAYMENT_MODE.CASH;
}

export function isRazorpayPaymentMode(value: unknown): boolean {
  return normalizePaymentModeInput(value) === PAYMENT_MODE.RAZORPAY;
}

export function formatPaymentModeLabel(value: unknown): string {
  const mode = normalizePaymentModeInput(value);
  const option = PAYMENT_MODE_OPTIONS.find((item) => item.value === mode);
  return option?.label ?? String(value || "N/A");
}

export function getPaymentModeBadgeClass(value: unknown): string {
  const mode = normalizePaymentModeInput(value);
  if (mode === PAYMENT_MODE.RAZORPAY) return "bg-blue-100 text-blue-800";
  if (mode === PAYMENT_MODE.ONLINE) return "bg-blue-100 text-blue-800";
  if (mode === PAYMENT_MODE.UPI) return "bg-purple-100 text-purple-800";
  if (mode === PAYMENT_MODE.BANK_TRANSFER) return "bg-green-100 text-green-800";
  if (mode === PAYMENT_MODE.CHEQUE) return "bg-amber-100 text-amber-800";
  if (mode === PAYMENT_MODE.DD) return "bg-indigo-100 text-indigo-800";
  return "bg-gray-100 text-gray-800";
}

/**
 * Canonical SAF Foundation Payment Mode Formatter for Form PDFs.
 *
 * Required behavior:
 * "CASH" / "cash" / "Cash" => "Cash"
 * "CHEQUE" / "cheque" / "Cheque" / "CHECK" / "check" => "Cheque"
 * "DD" / "dd" / "D.D." / "d.d." / "D.D" => "D.D."
 * "ONLINE" / "online" / "Online" => "Online"
 * "RAZORPAY" / "razorpay" / "Razorpay" => "Online"
 * "UPI" / "upi" / "Upi" => "Online"
 * "BANK_TRANSFER" / "bank_transfer" / "Bank Transfer" => "Online"
 * Electronic variants: NEFT, RTGS, IMPS, NETBANKING => "Online"
 * Null / undefined / empty string => ""
 * Do NOT throw.
 */
export function formatPaymentModeForPdf(value: unknown): string {
  if (value === undefined || value === null) return "";
  const raw = String(value).trim();
  if (!raw) return "";

  const upper = raw.toUpperCase().replace(/[\s\-_]+/g, "");

  if (upper.includes("CASH")) {
    return "Cash";
  }

  if (upper.includes("CHEQUE") || upper.includes("CHECK")) {
    return "Cheque";
  }

  if (
    upper.replace(/\./g, "") === "DD" ||
    upper.includes("DD") ||
    raw === "D.D." ||
    raw.toLowerCase() === "d.d." ||
    raw === "D.D"
  ) {
    return "D.D.";
  }

  if (
    upper.includes("ONLINE") ||
    upper.includes("RAZORPAY") ||
    upper.includes("RAZOR") ||
    upper.includes("UPI") ||
    upper.includes("BANKTRANSFER") ||
    upper.includes("BANK") ||
    upper.includes("NEFT") ||
    upper.includes("RTGS") ||
    upper.includes("IMPS") ||
    upper.includes("NETBANKING")
  ) {
    return "Online";
  }

  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Parse an unknown amount representation into a clean numeric value.
 * Handles numbers, strings, comma formatting, currency symbols (₹), trailing slashes (/-),
 * decimals, zero, null and undefined.
 * Returns null if the value cannot be parsed to a finite number.
 */
export function parseAmountToNumber(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === "number") {
    return isFinite(val) ? val : null;
  }
  const str = String(val).trim();
  if (!str) return null;
  // Strip currency symbols, commas, slashes, dashes, and whitespace
  const cleaned = str.replace(/[₹,\/\-\s]/g, "").trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return isFinite(num) ? num : null;
}

/**
 * Shared canonical resolver for actual registration / scheme payment amount.
 *
 * Strict priority:
 * 1. paymentAmount
 * 2. payment_amount
 * 3. paidAmount
 * 4. receivedAmount
 * 5. totalAmount
 * 6. total_amount
 * 7. fee
 * 8. membershipFee
 * 9. amount
 * 10. राशि
 *
 * Explicitly EXCLUDES recurring installments (mayraInstallment, installmentAmount, installments[0].amount)
 * to prevent recurring contributions (e.g. ₹300) from overriding registration fees.
 */
export function resolveCanonicalPaymentAmount(
  record?: unknown,
  body?: unknown
): number | null {
  const keys = [
    "paymentAmount",
    "payment_amount",
    "paidAmount",
    "receivedAmount",
    "totalAmount",
    "total_amount",
    "fee",
    "membershipFee",
    "amount",
    "राशि",
  ] as const;

  const sources: any[] = [];
  if (record && typeof record === "object") {
    sources.push(record);
    if ((record as any).record && typeof (record as any).record === "object") {
      sources.push((record as any).record);
    }
    if ((record as any).data && typeof (record as any).data === "object") {
      sources.push((record as any).data);
    }
  }
  if (body && typeof body === "object") {
    sources.push(body);
    if ((body as any).record && typeof (body as any).record === "object") {
      sources.push((body as any).record);
    }
    if ((body as any).data && typeof (body as any).data === "object") {
      sources.push((body as any).data);
    }
  }

  for (const key of keys) {
    for (const src of sources) {
      if (src && key in src) {
        const val = src[key];
        const parsed = parseAmountToNumber(val);
        if (parsed !== null) {
          return parsed;
        }
      }
    }
  }

  return null;
}

/**
 * Converts a non-negative integer into Hindi words according to the Indian Numbering System.
 * Matches existing SAF Foundation implementation across receipts and bulk EMI schedules.
 */
export function numberToHindiWords(num: number): string {
  if (num === 0) return "शून्य";

  const ones = [
    "", "एक", "दो", "तीन", "चार", "पाँच", "छः", "सात", "आठ", "नौ",
    "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह",
    "सत्रह", "अठारह", "उन्नीस",
  ];

  const tens = [
    "", "", "बीस", "तीस", "चालीस", "पचास",
    "साठ", "सत्तर", "अस्सी", "नब्बे",
  ];

  const scales = ["", "हज़ार", "लाख", "करोड़"];

  function chunkToWords(n: number): string {
    let str = "";
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " सौ ";
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + " ";
    }
    return str.trim();
  }

  let words = "";
  const parts: number[] = [];
  parts.push(num % 1000);
  num = Math.floor(num / 1000);

  while (num > 0) {
    parts.push(num % 100);
    num = Math.floor(num / 100);
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] > 0) {
      words += chunkToWords(parts[i]) + " " + scales[i] + " ";
    }
  }

  return words.trim();
}

/**
 * Formats an amount value into standard Hindi amount words with suffix "रुपये मात्र".
 * Handles numbers, strings, comma/currency formatted inputs, null/undefined, and decimals (Math.floor).
 * Returns empty string if value is null/undefined or unparseable.
 */
export function formatAmountToHindiWords(value: unknown): string {
  const num = parseAmountToNumber(value);
  if (num === null) return "";
  const integerPart = Math.floor(num);
  const words = numberToHindiWords(integerPart);
  return words ? `${words} रुपये मात्र` : "";
}

/**
 * Formats a numeric amount for PDF display with Indian locale grouping and "/-" suffix.
 * e.g. 11000 -> "11,000/-"
 */
export function formatNumericAmountForPdf(value: unknown): string {
  const num = parseAmountToNumber(value);
  if (num === null) return "";
  const integerPart = Math.floor(num);
  return `${integerPart.toLocaleString("en-IN")}/-`;
}

/**
 * Sanitizes a single filename part according to SAF Foundation dynamic filename rules.
 * Preserves alphanumeric, hyphen, underscore, and Devanagari Hindi characters (\u0900-\u097F).
 * Converts everything else to '_', collapses consecutive underscores, and trims leading/trailing underscores.
 * Empty, null, undefined, "null", "undefined", "NaN", "unknown" resolve to empty string.
 */
export function sanitizeFilenamePart(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "undefined" || lower === "null" || lower === "nan" || lower === "unknown") {
    return "";
  }
  return raw
    .replace(/[^a-zA-Z0-9_\-\u0900-\u097F]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export interface PdfFilenameSource {
  applicantName?: string | null;
  applicant_name?: string | null;
  name?: string | null;
  fullName?: string | null;
  full_name?: string | null;

  offlineFormNumber?: string | null;
  offline_form_number?: string | null;
  formNumber?: string | null;
  form_number?: string | null;
  membershipNumber?: string | null;

  workerOfflineFormNumber?: string | null;
  worker_offline_form_number?: string | null;
  agentOfflineFormNumber?: string | null;
  agent_offline_form_number?: string | null;
  workerCode?: string | null;
  agentCode?: string | null;

  seniorOfflineFormNumber?: string | null;
  senior_offline_form_number?: string | null;
  seniorAgentOfflineFormNumber?: string | null;
  senior_agent_offline_form_number?: string | null;
  seniorCode?: string | null;
  uplineCode?: string | null;

  [key: string]: any;
}

export interface BuildPdfFilenameOptions {
  prefix?: string;
  suffix?: string;
  fallbackBase?: string;
}

function resolveFirstFilenamePart(
  record: PdfFilenameSource | null | undefined,
  keys: string[]
): string {
  if (!record || typeof record !== "object") return "";
  for (const k of keys) {
    if (k in record && record[k] !== undefined && record[k] !== null) {
      const sanitized = sanitizeFilenamePart(record[k]);
      if (sanitized) return sanitized;
    }
  }
  return "";
}

/**
 * Builds a standardized PDF filename from dynamic record attributes:
 * <ApplicantName>_<OfflineFormNumber>_<AgentCode>_<UplineAgentCode>.pdf
 *
 * Missing fields are omitted without double underscores or dangling underscores.
 * Preserves Devanagari Hindi characters.
 * Defaults to "SAF_DOCUMENT.pdf" if all parts are empty.
 */
export function buildPdfFilename(
  record?: PdfFilenameSource | null,
  options?: BuildPdfFilenameOptions
): string {
  const name = resolveFirstFilenamePart(record, [
    "applicantName",
    "applicant_name",
    "name",
    "fullName",
    "full_name",
    "आवेदक_का_नाम",
  ]);

  const form = resolveFirstFilenamePart(record, [
    "offlineFormNumber",
    "offline_form_number",
    "formNumber",
    "form_number",
    "membershipNumber",
    "सदस्यता_क्रमांक",
    "क्रमांक",
    "bimaNumber",
    "bima_number",
    "बीमा_नंबर",
  ]);

  const agent = resolveFirstFilenamePart(record, [
    "workerOfflineFormNumber",
    "worker_offline_form_number",
    "agentOfflineFormNumber",
    "agent_offline_form_number",
    "workerCode",
    "agentCode",
    "कार्यकर्ता_कोड",
    "codeNumber",
    "code_number",
    "कोड_नंबर",
  ]);

  const upline = resolveFirstFilenamePart(record, [
    "seniorOfflineFormNumber",
    "senior_offline_form_number",
    "seniorAgentOfflineFormNumber",
    "senior_agent_offline_form_number",
    "seniorCode",
    "uplineCode",
    "सीनियर_कोड",
  ]);

  const parts = [name, form, agent, upline].filter(Boolean);
  const prefix = sanitizeFilenamePart(options?.prefix);
  const suffix = sanitizeFilenamePart(options?.suffix);
  const fallback = sanitizeFilenamePart(options?.fallbackBase);

  let core = parts.join("_");
  if (!core) {
    core = fallback || (prefix || suffix ? "" : "SAF_DOCUMENT");
  }

  const allParts = [prefix, core, suffix].filter(Boolean);
  const baseName = allParts.join("_") || "SAF_DOCUMENT";
  const cleanBase = baseName
    .replace(/\.pdf$/i, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `${cleanBase || "SAF_DOCUMENT"}.pdf`;
}

/**
 * Generates an RFC-compliant Content-Disposition header with UTF-8 encoding
 * to prevent invalid header errors with Unicode/Hindi characters.
 */
export function buildContentDispositionHeader(filename: string): string {
  const encodedFilename = encodeURIComponent(filename);
  return `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`;
}

