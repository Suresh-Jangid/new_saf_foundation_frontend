/** API wire-format values shared across all forms (lowercase snake_case). */
export const PAYMENT_MODE = {
  CASH: "cash",
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

  if (mode === "razorpay") return PAYMENT_MODE.RAZORPAY;
  if (mode === "bank_transfer") return PAYMENT_MODE.BANK_TRANSFER;
  if (mode === "upi" || mode === "online") return PAYMENT_MODE.UPI;
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
  if (mode === PAYMENT_MODE.UPI) return "bg-purple-100 text-purple-800";
  if (mode === PAYMENT_MODE.BANK_TRANSFER) return "bg-green-100 text-green-800";
  return "bg-gray-100 text-gray-800";
}
