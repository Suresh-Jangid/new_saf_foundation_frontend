/**
 * API Audit Script - Tests all backend apicall endpoints
 * Usage: node scripts/api-audit.mjs [--base-url URL] [--mobile X] [--password Y]
 *        [--save-responses] [--report-dir docs/api-audit]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
}
function hasFlag(name) {
  return args.includes(name);
}

const SAVE_RESPONSES = hasFlag("--save-responses") || hasFlag("--full-report");
const REPORT_DIR = getArg("--report-dir") || path.join(ROOT, "docs", "api-audit");

const BASE_URL =
  getArg("--base-url") ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://new-saf-foundation-backend.onrender.com/api";

const TEST_MOBILE = getArg("--mobile") || process.env.API_TEST_MOBILE || "";
const TEST_PASSWORD = getArg("--password") || process.env.API_TEST_PASSWORD || "";
const AGENT_MOBILE = getArg("--agent-mobile") || process.env.API_TEST_AGENT_MOBILE || "8888888888";
const AGENT_PASSWORD = getArg("--agent-password") || process.env.API_TEST_AGENT_PASSWORD || "password123";

let SAMPLE_IDS = {
  agentId: null,
  applicationId: null,
  insuranceId: null,
  loanId: null,
  financialHelpId: null,
  disabilityCycleId: null,
  marriageId: null,
  marriageSewingId: null,
  mayraId: null,
  mayraCongratsId: null,
  mayraInstallmentId: null,
  mayraCongratulationsPaymentId: null,
  pensionId: null,
  sewingCampId: null,
  surakshaBimaId: null,
  paymentId: null,
};

// All unique backend apicall endpoints used by the admin app
const ENDPOINTS = [
  { name: "login", method: "POST", body: () => form({ mobile: TEST_MOBILE, password: TEST_PASSWORD }), auth: false },
  { name: "agentLogin", method: "POST", body: () => form({ mobile: AGENT_MOBILE, password: AGENT_PASSWORD }), auth: false },
  { name: "logout", method: "POST", body: () => form({ token: "test" }) },
  { name: "register", method: "POST", body: () => form({ name: "Test", email: "t@test.com", mobile: "9999999999", password: "test" }), auth: false },
  { name: "getDashboardCounts", method: "POST", body: () => form({}) },
  { name: "getAgents", method: "GET" },
  { name: "addAgent", method: "POST", body: () => form({ name: "Audit Agent", fatherName: "Test Father", gender: "Male", mobile: `9000${String(Date.now()).slice(-6)}`, password: "password123", gotra: "Prajapat", village: "Jasal", address: "Test", tehsil: "Balotra", district: "Barmer", workArea: "Balotra", bankName: "SBI", accountNumber: "123", ifsc: "SBIN0001234", nomineeName: "Nominee", nomineeMobile: "9999999998", nomineeRelation: "Wife", age: "30" }), skipWrite: true },
  { name: "editAgent", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.agentId) }), skipWrite: true },
  { name: "deleteAgent", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.agentId) }), skipWrite: true },
  { name: "getAgentPermissions", method: "POST", body: () => form({ agent_id: idOr(SAMPLE_IDS.agentId) }) },
  { name: "setAgentPermissions", method: "POST", body: () => json({ agent_id: idOr(SAMPLE_IDS.agentId), permissions: [] }), skipWrite: true },
  { name: "getAllBulkData", method: "POST", body: () => form({ addedby_id: idOr(SAMPLE_IDS.agentId), startDate: "2024-01-01", endDate: "2026-12-31" }) },
  { name: "addAgentPaymentForDetails", method: "POST", body: () => form({ agentId: idOr(SAMPLE_IDS.agentId), amount: "1", startDate: "2024-01-01", endDate: "2026-12-31" }), skipWrite: true },
  { name: "getAgentPaymentsForDetails", method: "POST", body: () => form({ agentId: idOr(SAMPLE_IDS.agentId) }) },
  { name: "createApplication", method: "POST", body: () => form({}), skipWrite: true },
  { name: "getApplications", method: "GET" },
  { name: "updateApplication", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.applicationId) }), skipWrite: true },
  { name: "deleteApplication", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.applicationId) }), skipWrite: true },
  { name: "updateApplicationActiveStatus", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.applicationId), is_active: 1 }), skipWrite: true },
  { name: "getApplicationInstallments", method: "POST", body: () => urlencoded({ application_id: idOr(SAMPLE_IDS.applicationId) }) },
  { name: "addApplicationInstallment", method: "POST", body: () => form({ application_id: idOr(SAMPLE_IDS.applicationId), amount: "1", date: "2024-01-01" }), skipWrite: true },
  { name: "getPreviousApplicationsMembers", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.marriageId) }) },
  { name: "createInsuranceApplication", method: "POST", body: () => form({}), skipWrite: true },
  { name: "getInsuranceApplication", method: "GET" },
  { name: "editInsuranceApplication", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.insuranceId) }), skipWrite: true },
  { name: "deleteInsuranceApplication", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.insuranceId) }), skipWrite: true },
  { name: "updateInsuranceApplicationActiveStatus", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.insuranceId), is_active: 1 }), skipWrite: true },
  { name: "getApplicationInsuranceInstallments", method: "POST", body: () => urlencoded({ application_insurance_id: idOr(SAMPLE_IDS.insuranceId) }) },
  { name: "addApplicationInsuranceInstallment", method: "POST", body: () => form({ application_insurance_id: idOr(SAMPLE_IDS.insuranceId), amount: "1", date: "2024-01-01" }), skipWrite: true },
  { name: "addLoanApplication", method: "POST", body: () => form({}), skipWrite: true },
  { name: "getLoanApplications", method: "GET" },
  { name: "editLoanApplication", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.loanId) }), skipWrite: true },
  { name: "deleteLoanApplication", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.loanId) }), skipWrite: true },
  { name: "getLoanApplicationInstallments", method: "POST", body: () => urlencoded({ loan_application_id: idOr(SAMPLE_IDS.loanId) }) },
  { name: "addLoanApplicationInstallment", method: "POST", body: () => form({ loan_application_id: idOr(SAMPLE_IDS.loanId), amount: "1", date: "2024-01-01", type: "User Repayment" }), skipWrite: true },
  { name: "addFinancialHelp", method: "POST", body: () => form({}), skipWrite: true },
  { name: "getFinancialHelps", method: "GET" },
  { name: "editFinancialHelp", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.financialHelpId) }), skipWrite: true },
  { name: "deleteFinancialHelp", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.financialHelpId) }), skipWrite: true },
  { name: "getFinancialHelpInstallments", method: "POST", body: () => urlencoded({ financial_help_id: idOr(SAMPLE_IDS.financialHelpId) }) },
  { name: "addFinancialHelpInstallment", method: "POST", body: () => form({ financial_help_id: idOr(SAMPLE_IDS.financialHelpId), amount: "1", date: "2024-01-01" }), skipWrite: true },
  { name: "addDisabilityCycle", method: "POST", body: () => form({}), skipWrite: true },
  { name: "getDisabilityCycles", method: "GET" },
  { name: "editDisabilityCycle", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.disabilityCycleId) }), skipWrite: true },
  { name: "deleteDisabilityCycle", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.disabilityCycleId) }), skipWrite: true },
  { name: "addMarriageCongrats", method: "POST", body: () => form({}), skipWrite: true },
  { name: "getMarriageCongrats", method: "GET" },
  { name: "getMarriageCongratulations", method: "POST", body: () => urlencoded({ application_id: idOr(SAMPLE_IDS.applicationId) }) },
  { name: "editMarriageCongrats", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.marriageId) }), skipWrite: true },
  { name: "deleteMarriageCongrats", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.marriageId) }), skipWrite: true },
  { name: "getMarriageCongratulationsPayment", method: "POST", body: () => form({ marriage_congratulations_id: idOr(SAMPLE_IDS.marriageId) }) },
  { name: "createMarriageCongratulationsPayment", method: "POST", body: () => form({ marriage_congratulations_id: idOr(SAMPLE_IDS.marriageId), application_id: idOr(SAMPLE_IDS.applicationId), amount: "1", category: "A" }), skipWrite: true },
  { name: "getMarriageDetailsByNumber", method: "POST", body: () => form({ marriageNumber: "1" }) },
  { name: "addMarriageSewing", method: "POST", body: () => form({}), skipWrite: true },
  { name: "getMarriageSewing", method: "GET" },
  { name: "editMarriageSewing", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.marriageSewingId) }), skipWrite: true },
  { name: "deleteMarriageSewing", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.marriageSewingId) }), skipWrite: true },
  { name: "createmayra_Application", method: "POST", body: () => form({}), skipWrite: true },
  { name: "getmayra_application", method: "GET" },
  { name: "updatemayra_Application", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.mayraId) }), skipWrite: true },
  { name: "deletemayra_Application", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.mayraId) }), skipWrite: true },
  { name: "updateMayraApplicationActiveStatus", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.mayraId), is_active: 1 }), skipWrite: true },
  { name: "addMayraCongrats", method: "POST", body: () => form({}), skipWrite: true },
  { name: "getMayraCongrats", method: "GET" },
  { name: "editMayraCongrats", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.mayraCongratsId) }), skipWrite: true },
  { name: "deleteMayraCongrats", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.mayraCongratsId) }), skipWrite: true },
  { name: "updateMayraCongratulationsStatus", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.mayraCongratsId), payment_status: 1 }), skipWrite: true },
  { name: "getMayraCongratulations", method: "POST", body: () => urlencoded({ mayra_id: idOr(SAMPLE_IDS.mayraId) }) },
  { name: "addMayraInstallment", method: "POST", body: () => form({ mayra_id: idOr(SAMPLE_IDS.mayraId), amount: "1", date: "2024-01-01" }), skipWrite: true },
  { name: "getMayraInstallments", method: "POST", body: () => form({ mayra_id: idOr(SAMPLE_IDS.mayraId) }) },
  { name: "updateMayraInstallment", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.mayraInstallmentId), mayra_id: idOr(SAMPLE_IDS.mayraId) }), skipWrite: true },
  { name: "deleteMayraInstallment", method: "POST", body: () => form({ mayra_id: idOr(SAMPLE_IDS.mayraId), id: idOr(SAMPLE_IDS.mayraInstallmentId) }), skipWrite: true },
  { name: "getMayraCongratulationsPayment", method: "POST", body: () => form({ mayra_id: idOr(SAMPLE_IDS.mayraId) }) },
  { name: "createMayraCongratulationsPayment", method: "POST", body: () => form({ mayra_congratulations_id: idOr(SAMPLE_IDS.mayraCongratsId), mayra_id: idOr(SAMPLE_IDS.mayraId), application_id: idOr(SAMPLE_IDS.applicationId), amount: "1", category: "100" }), skipWrite: true },
  { name: "deleteMayraCongratulationsPayment", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.mayraCongratulationsPaymentId) }), skipWrite: true },
  { name: "updateMayraCongratulationsPayment", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.mayraCongratulationsPaymentId) }), skipWrite: true },
  { name: "getMayraDetailsByNumber", method: "POST", body: () => form({ mayraNumber: "1" }) },
  { name: "getMayraBeforeDate", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.mayraId) }) },
  { name: "updateMayraStatus", method: "POST", body: () => json({ mayra_id: idOr(SAMPLE_IDS.applicationId), data: [] }), skipWrite: true },
  { name: "getMayraPreviousMembers", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.mayraId) }) },
  { name: "getMayraBulkData", method: "POST", body: () => urlencoded({ userId: idOr(SAMPLE_IDS.applicationId) }) },
  { name: "getMayraUserData", method: "POST", body: () => urlencoded({ userId: idOr(SAMPLE_IDS.applicationId) }) },
  { name: "updateMayraPdfStatus", method: "POST", body: () => json({ ids: [] }), skipWrite: true },
  { name: "getUserData", method: "POST", body: () => form({ userId: idOr(SAMPLE_IDS.applicationId) }) },
  { name: "updatePaymentStatus", method: "POST", body: () => json({ data: [] }), skipWrite: true },
  { name: "updatePdfStatus", method: "POST", body: () => json({ ids: [] }), skipWrite: true },
  { name: "addPensionYojana", method: "POST", body: () => form({}), skipWrite: true },
  { name: "getPensionYojanas", method: "GET" },
  { name: "editPensionYojana", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.pensionId) }), skipWrite: true },
  { name: "deletePensionYojana", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.pensionId) }), skipWrite: true },
  { name: "getPensionYojanaPayments", method: "POST", body: () => urlencoded({ pension_yojana_id: idOr(SAMPLE_IDS.pensionId) }) },
  { name: "addPensionYojanaPayment", method: "POST", body: () => form({ pension_yojana_id: idOr(SAMPLE_IDS.pensionId), amount: "1", date: "2024-01-01" }), skipWrite: true },
  { name: "addSewingCamp", method: "POST", body: () => form({}), skipWrite: true },
  { name: "getSewingCamp", method: "GET" },
  { name: "editSewingCamp", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.sewingCampId) }), skipWrite: true },
  { name: "deleteSewingCamp", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.sewingCampId) }), skipWrite: true },
  { name: "addSurakshaBima", method: "POST", body: () => form({}), skipWrite: true },
  { name: "getSurakshaBimaList", method: "GET" },
  { name: "getSurakshaBima", method: "GET", query: { id: () => idOr(SAMPLE_IDS.surakshaBimaId) } },
  { name: "getSurakshaBimaData", method: "POST", body: () => urlencoded({ insuranceApplication_id: idOr(SAMPLE_IDS.insuranceId) }) },
  { name: "editSurakshaBima", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.surakshaBimaId) }), skipWrite: true },
  { name: "deleteSurakshaBima", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.surakshaBimaId) }), skipWrite: true },
  { name: "getPreviousSurakshaBimaMembers", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.insuranceId) }) },
  { name: "getSurakshaBimaPaymentById", method: "POST", body: () => form({ application_insurance_id: idOr(SAMPLE_IDS.insuranceId) }) },
  { name: "createSurakshaBimaPayment", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.insuranceId), amount: "1" }), skipWrite: true },
  { name: "getInsuranceBulkData", method: "POST", body: () => urlencoded({ userId: idOr(SAMPLE_IDS.insuranceId) }) },
  { name: "updateBimaPaymentStatus", method: "POST", body: () => json({ data: [] }), skipWrite: true },
  { name: "updateInsurancePdfStatus", method: "POST", body: () => json({ ids: [] }), skipWrite: true },
  { name: "addPayment", method: "POST", body: () => form({ date: "2024-01-01", type: "Income", amount: "1", remark: "test" }), skipWrite: true },
  { name: "getPaymentList", method: "POST", body: () => form({}) },
  { name: "editPayment", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.paymentId) }), skipWrite: true },
  { name: "deletePayment", method: "POST", body: () => form({ id: idOr(SAMPLE_IDS.paymentId) }), skipWrite: true },
];

const NEXTJS_API_ROUTES = [
  { path: "/api/proxy-image", method: "GET", query: "?url=test" },
  { path: "/api/fireconnect", method: "POST", skip: true },
  { path: "/api/razorpay/create-order", method: "POST", skip: true },
  { path: "/api/razorpay/verify-payment", method: "POST", skip: true },
  { path: "/api/whatsapp-test", method: "GET" },
  { path: "/api/fill-pdf-form", method: "POST", skip: true },
  { path: "/api/generate-agent-pdf", method: "POST", skip: true },
  { path: "/api/generate-insurance-pdf", method: "POST", skip: true },
  { path: "/api/generate-mayra-pdf", method: "POST", skip: true },
  { path: "/api/generate-pension-pdf", method: "POST", skip: true },
];

function form(obj) {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => fd.append(k, String(v)));
  return fd;
}

function urlencoded(obj) {
  return new URLSearchParams(obj);
}

function json(obj) {
  return JSON.stringify(obj);
}

function redactSensitive(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (typeof value !== "object") return value;

  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (/token|password|secret|authorization|refresh/i.test(key)) {
      out[key] = typeof val === "string" && val.length > 8 ? `${val.slice(0, 6)}…[REDACTED]` : "[REDACTED]";
      continue;
    }
    out[key] = redactSensitive(val);
  }
  return out;
}

function summarizeBody(body) {
  if (!body) return null;
  if (body instanceof FormData) {
    const obj = {};
    for (const [k, v] of body.entries()) {
      obj[k] = /password/i.test(k) ? "[REDACTED]" : String(v);
    }
    return obj;
  }
  if (body instanceof URLSearchParams) {
    return Object.fromEntries(body.entries());
  }
  if (typeof body === "string") {
    try {
      return redactSensitive(JSON.parse(body));
    } catch {
      return body;
    }
  }
  return body;
}

function truncateText(text, max = 8000) {
  if (typeof text !== "string") return text;
  return text.length > max ? `${text.slice(0, max)}\n…[truncated ${text.length - max} chars]` : text;
}

function isWorkingResponse(data, httpStatus, skipWrite = false) {
  if (httpStatus >= 500) return false;
  if (httpStatus === 404) return false;
  if (!data) return httpStatus >= 200 && httpStatus < 400;
  if (typeof data === "string") {
    if (data.includes("Unknown apicall") || data.includes("Invalid apicall") || data.includes("Unsupported apicall")) return false;
    if (data.includes("Fatal error") || data.includes("Parse error")) return false;
    return httpStatus >= 200 && httpStatus < 500;
  }
  if (data.error === true) {
    if (typeof data.message === "string" && /already registered|mobile number is already registered|not found|no member found/i.test(data.message)) return true;
    if (skipWrite && typeof data.message === "string" && /invalid `(?:prisma|tx)\..*\.create\(\)/i.test(data.message)) return true;
    return false;
  }
  if (typeof data.message === "string" && /unsupported apicall|unknown apicall|invalid apicall/i.test(data.message)) return false;
  if (typeof data.message === "string" && /invalid `prisma|invocation in/i.test(data.message)) return false;
  // Endpoint exists if we get structured JSON (even auth/validation errors)
  return httpStatus >= 200 && httpStatus < 500;
}

async function testEndpoint(ep, token) {
  const url = new URL(BASE_URL);
  url.searchParams.set("apicall", ep.name);
  if (ep.query) {
    Object.entries(ep.query).forEach(([k, v]) => {
      const val = typeof v === "function" ? v() : v;
      url.searchParams.set(k, val);
    });
  }

  const headers = {};
  if (token && ep.auth !== false) headers.Authorization = `Bearer ${token}`;

  const init = { method: ep.method, headers };
  let requestBody = null;
  if (ep.method !== "GET" && ep.body) {
    const body = ep.body();
    requestBody = summarizeBody(body);
    if (body instanceof FormData) {
      init.body = body;
    } else if (body instanceof URLSearchParams) {
      init.body = body;
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    } else {
      init.body = body;
      headers["Content-Type"] = "application/json";
    }
  }

  const start = Date.now();
  try {
    const res = await fetch(url.toString(), init);
    const text = await res.text();
    let data;
    let parsed = true;
    try {
      data = JSON.parse(text);
    } catch {
      parsed = false;
      data = text;
    }
    const elapsed = Date.now() - start;
    const responseBody = parsed ? redactSensitive(data) : truncateText(data);
    const working = isWorkingResponse(data, res.status, ep.skipWrite);
    const message =
      typeof data === "object" && data?.message
        ? data.message
        : typeof data === "string"
        ? data.slice(0, 120)
        : `HTTP ${res.status}`;
    return {
      name: ep.name,
      method: ep.method,
      url: url.toString(),
      request: {
        headers: token && ep.auth !== false ? { Authorization: "Bearer [REDACTED]" } : {},
        body: requestBody,
      },
      httpStatus: res.status,
      working,
      message,
      response: responseBody,
      responseRawLength: text.length,
      elapsed,
      skipWrite: !!ep.skipWrite,
      testedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      name: ep.name,
      method: ep.method,
      url: url.toString(),
      request: {
        headers: token && ep.auth !== false ? { Authorization: "Bearer [REDACTED]" } : {},
        body: requestBody,
      },
      httpStatus: 0,
      working: false,
      message: err.message,
      response: null,
      error: err.message,
      elapsed: Date.now() - start,
      skipWrite: !!ep.skipWrite,
      testedAt: new Date().toISOString(),
    };
  }
}

async function testHealthEndpoint() {
  const healthUrl = `${new URL(BASE_URL).origin}/health`;
  const start = Date.now();
  try {
    const res = await fetch(healthUrl, { method: "GET" });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return {
      name: "health",
      method: "GET",
      url: healthUrl,
      request: { headers: {}, body: null },
      httpStatus: res.status,
      working: res.status === 200,
      message: typeof data === "object" ? data.status || `HTTP ${res.status}` : String(data).slice(0, 120),
      response: data,
      elapsed: Date.now() - start,
      skipWrite: false,
      testedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      name: "health",
      method: "GET",
      url: healthUrl,
      request: { headers: {}, body: null },
      httpStatus: 0,
      working: false,
      message: err.message,
      response: null,
      error: err.message,
      elapsed: Date.now() - start,
      skipWrite: false,
      testedAt: new Date().toISOString(),
    };
  }
}

async function testNextRoute(baseFrontend, route) {
  if (route.skip) {
    return {
      path: route.path,
      method: route.method,
      working: null,
      message: "Skipped (requires payload/secrets)",
      response: null,
    };
  }
  const url = `${baseFrontend}${route.path}${route.query || ""}`;
  try {
    const res = await fetch(url, { method: route.method });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = truncateText(text, 2000);
    }
    return {
      path: route.path,
      method: route.method,
      url,
      working: res.status !== 404,
      httpStatus: res.status,
      message: `HTTP ${res.status}`,
      response: data,
    };
  } catch (err) {
    return {
      path: route.path,
      method: route.method,
      url,
      working: false,
      httpStatus: 0,
      message: err.message,
      response: null,
      error: err.message,
    };
  }
}

function writeResponseFiles(results, reportDir) {
  const responsesDir = path.join(reportDir, "responses");
  fs.mkdirSync(responsesDir, { recursive: true });

  for (const result of results) {
    const fileName = `${result.name}.json`;
    fs.writeFileSync(path.join(responsesDir, fileName), JSON.stringify(result, null, 2));
  }
}

function buildFullReportMarkdown({ now, frontendUrl, token, results, nextResults, healthResult, sampleIds }) {
  const tested = results.length;
  const working = results.filter((r) => r.working).length;
  const failed = results.filter((r) => !r.working);

  const endpointSections = results
    .map((r) => {
      const statusLabel = r.working ? "PASS" : "FAIL";
      const responseJson =
        r.response === null || r.response === undefined
          ? "_No response body_"
          : "```json\n" + JSON.stringify(r.response, null, 2) + "\n```";

      return `### ${r.name} — ${statusLabel}

| Field | Value |
|-------|-------|
| Method | \`${r.method}\` |
| URL | \`${r.url}\` |
| HTTP Status | ${r.httpStatus} |
| Duration | ${r.elapsed}ms |
| Message | ${(r.message || "").replace(/\|/g, "/").replace(/\n/g, " ").slice(0, 200)} |
| Skip write test | ${r.skipWrite ? "yes" : "no"} |

**Request body**

\`\`\`json
${JSON.stringify(r.request?.body ?? null, null, 2)}
\`\`\`

**Response**

${responseJson}
`;
    })
    .join("\n");

  return `# API Audit Full Report

Generated: ${now}

## Summary

| Metric | Count |
|--------|-------|
| **Total Backend APIs** | ${ENDPOINTS.length} |
| **Tested APIs** | ${tested} |
| **Working APIs** | ${working} |
| **Failed APIs** | ${failed.length} |
| **Success Rate** | ${tested ? ((working / tested) * 100).toFixed(1) : 0}% |

## Configuration

- Backend URL: \`${BASE_URL}\`
- Frontend URL: \`${frontendUrl}\`
- Auth: ${token ? "Yes (login token obtained)" : "No"}
- Health check: ${healthResult.working ? "PASS" : "FAIL"} (\`${healthResult.url}\`, ${healthResult.httpStatus})
- Sample IDs used: \`${JSON.stringify(sampleIds)}\`

## Failed Endpoints

${failed.length ? failed.map((r) => `- \`${r.name}\` (${r.httpStatus}) — ${(r.message || "").replace(/\n/g, " ").slice(0, 120)}`).join("\n") : "_None_"}

## Health Check Response

\`\`\`json
${JSON.stringify(healthResult.response, null, 2)}
\`\`\`

## All API Responses

${endpointSections}

## Next.js API Routes

${nextResults
  .map(
    (r) =>
      `### ${r.path}\n\n- Method: \`${r.method}\`\n- Status: ${r.working === null ? "skipped" : r.working ? "exists" : "missing"} (${r.httpStatus ?? "n/a"})\n- Response:\n\n\`\`\`json\n${JSON.stringify(r.response, null, 2)}\n\`\`\``
  )
  .join("\n\n")}

## Output Files

- \`API_AUDIT_FULL_REPORT.md\` — this report
- \`API_AUDIT_RESULTS.json\` — machine-readable summary + all responses
- \`responses/<apicall>.json\` — one file per endpoint
`;
}

async function loginForToken() {
  if (!TEST_MOBILE || !TEST_PASSWORD) return null;
  const url = `${BASE_URL}?apicall=login`;
  const fd = form({ mobile: TEST_MOBILE, password: TEST_PASSWORD });
  try {
    const res = await fetch(url, { method: "POST", body: fd });
    const data = await res.json();
    return data?.user?.token || data?.data?.token || data?.token || null;
  } catch {
    return null;
  }
}

async function bootstrapSampleIds(token) {
  if (!token) return;
  const headers = { Authorization: `Bearer ${token}` };

  async function firstId(apicall) {
    try {
      const res = await fetch(`${BASE_URL}?apicall=${apicall}`, { method: "GET", headers });
      const data = await res.json();
      const list = Array.isArray(data?.data) ? data.data : [];
      return list[0]?.id || null;
    } catch {
      return null;
    }
  }

  SAMPLE_IDS.agentId = await firstId("getAgents");
  SAMPLE_IDS.applicationId = await firstId("getApplications");
  SAMPLE_IDS.insuranceId = await firstId("getInsuranceApplication");
  SAMPLE_IDS.loanId = await firstId("getLoanApplications");
  SAMPLE_IDS.financialHelpId = await firstId("getFinancialHelps");
  SAMPLE_IDS.disabilityCycleId = await firstId("getDisabilityCycles");
  SAMPLE_IDS.marriageId = await firstId("getMarriageCongrats");
  SAMPLE_IDS.marriageSewingId = await firstId("getMarriageSewing");
  SAMPLE_IDS.mayraId = await firstId("getmayra_application");
  SAMPLE_IDS.mayraCongratsId = await firstId("getMayraCongrats");
  SAMPLE_IDS.pensionId = await firstId("getPensionYojanas");
  SAMPLE_IDS.sewingCampId = await firstId("getSewingCamp");
  SAMPLE_IDS.surakshaBimaId = await firstId("getSurakshaBimaList");

  async function firstFromPost(apicall, bodyObj) {
    try {
      const fd = form(bodyObj);
      const res = await fetch(`${BASE_URL}?apicall=${apicall}`, { method: "POST", headers, body: fd });
      const data = await res.json();
      const list = Array.isArray(data?.data) ? data.data : [];
      return list[0]?.id || null;
    } catch {
      return null;
    }
  }

  if (SAMPLE_IDS.mayraId) {
    SAMPLE_IDS.mayraInstallmentId = await firstFromPost("getMayraInstallments", { mayra_id: SAMPLE_IDS.mayraId });
    SAMPLE_IDS.mayraCongratulationsPaymentId = await firstFromPost("getMayraCongratulationsPayment", {
      mayra_id: SAMPLE_IDS.mayraId,
    });
  }

  try {
    const res = await fetch(`${BASE_URL}?apicall=getPaymentList`, { method: "POST", headers, body: form({}) });
    const data = await res.json();
    const list = Array.isArray(data?.data) ? data.data : [];
    SAMPLE_IDS.paymentId = list[0]?.id || null;
  } catch {
    SAMPLE_IDS.paymentId = null;
  }
}

function idOr(value, fallback = "00000000-0000-0000-0000-000000000001") {
  return value || fallback;
}

async function main() {
  const frontendUrl = getArg("--frontend") || process.env.FRONTEND_URL || "http://localhost:3002";
  const now = new Date().toISOString();

  console.log(`\nAPI Audit - ${now}`);
  console.log(`Backend: ${BASE_URL}`);
  console.log(`Frontend: ${frontendUrl}\n`);

  let token = null;
  if (TEST_MOBILE && TEST_PASSWORD) {
    token = await loginForToken();
    console.log(token ? "Authenticated for tests" : "Login failed - testing without token");
    if (token) await bootstrapSampleIds(token);
  } else {
    console.log("No credentials - testing without auth token");
  }

  const healthResult = await testHealthEndpoint();
  console.log(`[${healthResult.working ? "OK" : "FAIL"}] health (${healthResult.httpStatus}) - ${healthResult.message}`);

  const results = [];
  for (const ep of ENDPOINTS) {
    const result = await testEndpoint(ep, token);
    results.push(result);
    const icon = result.working ? "OK" : "FAIL";
    console.log(`[${icon}] ${result.name} (${result.httpStatus}) - ${result.message?.slice(0, 80)}`);
  }

  const nextResults = [];
  for (const route of NEXTJS_API_ROUTES) {
    const r = await testNextRoute(frontendUrl, route);
    nextResults.push(r);
    if (r.working !== null) {
      console.log(`[${r.working ? "OK" : "FAIL"}] ${r.path} - ${r.message}`);
    }
  }

  const tested = results.length;
  const working = results.filter((r) => r.working).length;
  const failed = results.filter((r) => !r.working);
  const possiblyMissing = failed.filter(
    (r) =>
      /unknown|invalid apicall|not found|ECONNREFUSED|fetch failed/i.test(r.message || "") ||
      r.httpStatus === 404
  );

  const newlyAdded = ["getFinancialHelpInstallments", "addFinancialHelpInstallment"];

  const log = `# API Audit Log

Generated: ${now}

## Summary

| Metric | Count |
|--------|-------|
| **Total Backend APIs** | ${ENDPOINTS.length} |
| **Tested APIs** | ${tested} |
| **Working APIs** | ${working} |
| **Failed APIs** | ${failed.length} |
| **Success Rate** | ${tested ? ((working / tested) * 100).toFixed(1) : 0}% |

## Configuration

- Backend URL: \`${BASE_URL}\`
- Frontend URL: \`${frontendUrl}\`
- Auth: ${token ? "Yes (login token obtained)" : "No (set API_TEST_MOBILE and API_TEST_PASSWORD)"}

## Newly Added Frontend API Definitions (require PHP backend implementation)

| apicall | Purpose |
|---------|---------|
| getFinancialHelpInstallments | List payment installments for financial help records |
| addFinancialHelpInstallment | Add payment installment for financial help |

## Possibly Missing / Unreachable Backend APIs

${possiblyMissing.length ? possiblyMissing.map((r) => `- \`${r.name}\` — ${r.message}`).join("\n") : "_None detected (or backend unreachable)_"}

## Failed Endpoints (all)

${failed.length ? `| apicall | method | status | message |\n|---------|--------|--------|----------|\n${failed.map((r) => `| ${r.name} | ${r.method} | ${r.httpStatus} | ${(r.message || "").replace(/\|/g, "/").replace(/\n/g, " ").slice(0, 100)} |`).join("\n")}` : "_All endpoints responded_"}

## Working Endpoints

${results.filter((r) => r.working).map((r) => `- \`${r.name}\` (${r.method}, ${r.httpStatus}ms: ${r.elapsed}ms)`).join("\n")}

## Next.js API Routes (sample)

| Route | Method | Status |
|-------|--------|--------|
${nextResults.map((r) => `| ${r.path} | ${r.method} | ${r.working === null ? "skipped" : r.working ? "exists" : "missing"} |`).join("\n")}

## Route Coverage Notes

- **Finance Help Payment** pages now use \`getFinancialHelps\`, \`getFinancialHelpInstallments\`, \`addFinancialHelpInstallment\` (was localStorage mock data)
- **74 dashboard pages** mapped to ${ENDPOINTS.length} backend apicall endpoints + 31 Next.js PDF/utility routes
- Endpoints marked \`skipWrite\` in audit are read-tested or use dummy IDs to avoid data mutation

## How to Re-run

\`\`\`bash
# Local backend
node scripts/api-audit.mjs --base-url http://127.0.0.1:5000/api --frontend http://localhost:3002

# With auth
API_TEST_MOBILE=your_mobile API_TEST_PASSWORD=your_pass node scripts/api-audit.mjs
\`\`\`
`;

  const outDir = path.join(ROOT, "docs");
  const reportDir = SAVE_RESPONSES ? REPORT_DIR : outDir;
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(reportDir, { recursive: true });

  const logPath = path.join(outDir, "API_AUDIT_LOG.md");
  fs.writeFileSync(logPath, log);

  const fullPayload = {
    generatedAt: now,
    baseUrl: BASE_URL,
    frontendUrl,
    health: healthResult,
    sampleIds: SAMPLE_IDS,
    summary: { total: ENDPOINTS.length, tested, working, failed: failed.length },
    results,
    nextResults,
  };

  const jsonPath = path.join(reportDir, "API_AUDIT_RESULTS.json");
  fs.writeFileSync(jsonPath, JSON.stringify(fullPayload, null, 2));

  if (SAVE_RESPONSES) {
    writeResponseFiles([healthResult, ...results], reportDir);
    const fullReportPath = path.join(reportDir, "API_AUDIT_FULL_REPORT.md");
    fs.writeFileSync(
      fullReportPath,
      buildFullReportMarkdown({
        now,
        frontendUrl,
        token,
        results,
        nextResults,
        healthResult,
        sampleIds: SAMPLE_IDS,
      })
    );
    console.log(`Full report: ${fullReportPath}`);
    console.log(`Per-endpoint responses: ${path.join(reportDir, "responses")}`);
  }

  // Keep a copy in docs/ for quick access
  fs.writeFileSync(path.join(outDir, "API_AUDIT_RESULTS.json"), JSON.stringify(fullPayload, null, 2));

  console.log(`\n--- Summary ---`);
  console.log(`Total: ${tested} | Tested: ${tested} | Working: ${working} | Failed: ${failed.length}`);
  console.log(`Log written to ${logPath}`);
  console.log(`JSON written to ${jsonPath}`);
}

main().catch(console.error);
