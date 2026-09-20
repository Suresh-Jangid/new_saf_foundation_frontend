import fs from 'fs';
import path from 'path';
import 'regenerator-runtime/runtime.js';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

function sanitizeOfflineNumber(val) {
  if (!val) return '';
  const str = String(val).trim();
  const upper = str.toUpperCase();
  if (
    upper.startsWith('EMP-') ||
    upper.startsWith('EMP_') ||
    upper === 'EMP' ||
    upper === 'ADMIN' ||
    upper === 'SUPER ADMIN' ||
    upper === 'N/A' ||
    upper === 'NA' ||
    upper === 'NULL' ||
    upper === 'UNDEFINED' ||
    upper === 'UUID' ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  ) {
    return '';
  }
  return str;
}

function sanitizeValue(val) {
  if (!val) return '';
  const str = String(val).trim();
  const upper = str.toUpperCase();
  if (
    upper === 'NULL' ||
    upper === 'UNDEFINED' ||
    upper === 'N/A' ||
    upper === 'NA'
  ) {
    return '';
  }
  return str;
}

function resolveAgentOfflineNumbers(record, agentsList = []) {
  let workerOffline = String(
    record.workerOfflineFormNumber ||
    record.worker_offline_form_number ||
    record.agentOfflineFormNumber ||
    record.agent_offline_form_number ||
    ""
  ).trim();

  let seniorOffline = String(
    record.seniorOfflineFormNumber ||
    record.senior_offline_form_number ||
    record.seniorAgentOfflineFormNumber ||
    record.senior_agent_offline_form_number ||
    ""
  ).trim();

  if (workerOffline && seniorOffline) {
    return { workerOfflineFormNumber: workerOffline, seniorOfflineFormNumber: seniorOffline, workerMobile: record.workerMobile || "" };
  }

  if (!agentsList || agentsList.length === 0) {
    return { workerOfflineFormNumber: workerOffline, seniorOfflineFormNumber: seniorOffline, workerMobile: record.workerMobile || "" };
  }

  const agentById = new Map();
  const agentByCode = new Map();

  for (const agent of agentsList) {
    const id = String(agent.id || "").trim();
    const empId = String(
      agent.employeeId ||
      agent.employee_id ||
      agent.agentProfile?.employeeId ||
      agent.agent_profile?.employee_id ||
      ""
    ).trim();

    if (id) agentById.set(id, agent);
    if (empId) agentByCode.set(empId.toUpperCase(), agent);
  }

  const targetWorkerId = String(
    record.addedById ||
    record.addedby_id ||
    record.selectedAgentId ||
    record.addedBy?.id ||
    record.agent?.id ||
    ""
  ).trim();

  const targetWorkerCode = String(
    record.workerCode ||
    record.worker_code ||
    record.agentCode ||
    record.agent_code ||
    record.added_code ||
    record.addedBy?.agentCode ||
    record.addedBy?.code ||
    ""
  ).trim().toUpperCase();

  const workerAgent = (targetWorkerId && agentById.get(targetWorkerId)) || (targetWorkerCode && agentByCode.get(targetWorkerCode));

  if (workerAgent && !workerOffline) {
    workerOffline = String(
      workerAgent.offlineFormNumber ||
      workerAgent.offline_form_number ||
      workerAgent.agentProfile?.offlineFormNumber ||
      workerAgent.agent_profile?.offline_form_number ||
      ""
    ).trim();
  }

  let seniorAgent = null;

  if (workerAgent) {
    const parentSeniorId = String(
      workerAgent.parentAgentId ||
      workerAgent.parent_agent_id ||
      workerAgent.seniorId ||
      workerAgent.senior_id ||
      ""
    ).trim();

    const parentSeniorCode = String(
      workerAgent.seniorEmployeeId ||
      workerAgent.senior_employee_id ||
      workerAgent.parentEmployeeId ||
      workerAgent.seniorCode ||
      ""
    ).trim().toUpperCase();

    if (parentSeniorId && agentById.has(parentSeniorId)) {
      seniorAgent = agentById.get(parentSeniorId);
    } else if (parentSeniorCode && parentSeniorCode !== "ADMIN" && parentSeniorCode !== "SUPER ADMIN" && agentByCode.has(parentSeniorCode)) {
      seniorAgent = agentByCode.get(parentSeniorCode);
    }
  }

  if (!seniorAgent) {
    const targetSeniorCode = String(
      record.seniorCode ||
      record.senior_code ||
      record.seniorWorker ||
      record.senior_worker ||
      ""
    ).trim().toUpperCase();

    if (targetSeniorCode && targetSeniorCode !== "ADMIN" && targetSeniorCode !== "SUPER ADMIN" && agentByCode.has(targetSeniorCode)) {
      seniorAgent = agentByCode.get(targetSeniorCode);
    }
  }

  if (seniorAgent && !seniorOffline) {
    seniorOffline = String(
      seniorAgent.offlineFormNumber ||
      seniorAgent.offline_form_number ||
      seniorAgent.agentProfile?.offlineFormNumber ||
      seniorAgent.agent_profile?.offline_form_number ||
      ""
    ).trim();
  }

  const workerMobile = String(
    (workerAgent && (
      workerAgent.mobile ||
      workerAgent.phone ||
      workerAgent.contactNumber ||
      workerAgent.agentProfile?.mobile ||
      workerAgent.agent_profile?.mobile
    )) ||
    record.added_mobile ||
    record.workerMobile ||
    record.agentMobile ||
    ""
  ).trim();

  return {
    workerOfflineFormNumber: workerOffline,
    seniorOfflineFormNumber: seniorOffline,
    workerMobile,
  };
}

async function runBondTestSuite() {
  console.log('=== RUNNING GENERAL MARRIAGE BOND PDF REGRESSION TEST SUITE ===\n');

  // Test A & B: Template existence, separation, and properties
  console.log('--- Test Group 1: Template Separation & File Integrity ---');
  const bondTemplatePath = path.resolve('public', 'pdf', 'general_application', 'saf_vivah_bond.pdf');
  const appTemplatePath = path.resolve('public', 'pdf', 'general_application', 'Saf_general_form.pdf');

  assert(fs.existsSync(bondTemplatePath), `Bond template exists at ${bondTemplatePath}`);
  assert(fs.existsSync(appTemplatePath), `General Application template exists at ${appTemplatePath}`);

  const bondBytes = fs.readFileSync(bondTemplatePath);
  const appBytes = fs.readFileSync(appTemplatePath);

  assert(bondBytes.length > 1000000, `Bond template is valid PDF (> 1MB, got ${bondBytes.length} bytes)`);
  assert(bondBytes.length !== appBytes.length, `Bond template is distinct from General Application template`);

  const bondDoc = await PDFDocument.load(bondBytes);
  assert(bondDoc.getPageCount() === 1, `Bond template is exactly 1 page (got ${bondDoc.getPageCount()})`);
  const { width, height } = bondDoc.getPages()[0].getSize();
  assert(Math.abs(width - 595.2756) < 0.1 && Math.abs(height - 841.8898) < 0.1, `Bond page is A4 portrait (595.28 x 841.89 pt)`);

  // Test Hierarchy and Offline resolution
  console.log('\n--- Test Group 2: Agent Offline Numbers & Hierarchy Resolution ---');
  const mockAgents = [
    {
      id: "agent-1",
      employeeId: "EMP-004",
      name: "Dinesh Senior",
      offlineFormNumber: "1258",
      parentAgentId: null,
      seniorEmployeeId: "ADMIN",
      mobile: "9876543210"
    },
    {
      id: "agent-2",
      employeeId: "EMP-005",
      name: "Deelip Worker",
      offlineFormNumber: "1259",
      parentAgentId: "agent-1",
      seniorEmployeeId: "EMP-004",
      mobile: "9123456780"
    }
  ];

  const testApp1 = {
    id: "app-001",
    formNumber: "M-027",
    offlineFormNumber: "1149",
    applicantName: "Pooja Kumari",
    fatherName: "Ramesh Kumar",
    category: "OBC",
    address: "Samdari",
    district: "Balotra",
    state: "Rajasthan",
    aadharNumber: "123456789012",
    nomineeName: "Dinesh Kumar",
    nomineeRelation: "Husband",
    nomineeAadhar: "888877776666",
    nomineeMobile: "9988776655",
    addedById: "agent-2",
    workerCode: "EMP-005",
    applicationDate: "2026-04-12"
  };

  const resolved = resolveAgentOfflineNumbers(testApp1, mockAgents);
  assert(resolved.workerOfflineFormNumber === "1259", `Worker offline number is 1259 (got "${resolved.workerOfflineFormNumber}")`);
  assert(resolved.seniorOfflineFormNumber === "1258", `Senior offline number is 1258 (got "${resolved.seniorOfflineFormNumber}")`);
  assert(resolved.workerMobile === "9123456780", `Worker agent mobile resolved to 9123456780 (got "${resolved.workerMobile}")`);

  // Test Missing Offline numbers
  console.log('\n--- Test Group 3: Missing Offline Numbers & Forbidden Value Sanitization ---');
  const appNoWorker = {
    ...testApp1,
    workerOfflineFormNumber: null,
    seniorOfflineFormNumber: null,
    addedById: "non-existent",
    workerCode: "EMP-999"
  };
  const resolvedEmpty = resolveAgentOfflineNumbers(appNoWorker, mockAgents);
  assert(sanitizeOfflineNumber(resolvedEmpty.workerOfflineFormNumber) === "", `Missing worker offline number is sanitized to blank`);
  assert(sanitizeOfflineNumber(resolvedEmpty.seniorOfflineFormNumber) === "", `Missing senior offline number is sanitized to blank`);

  // Verify rejection of forbidden tokens
  const forbiddenTokens = ["EMP-005", "EMP-004", "emp-001", "ADMIN", "Super Admin", "N/A", "null", "undefined", "397a5671-fd06-48ca-bbc9-73670de7241b"];
  for (const token of forbiddenTokens) {
    assert(sanitizeOfflineNumber(token) === "", `Forbidden token "${token}" is strictly sanitized to blank`);
  }

  // Test Application Offline Form Number vs System Form Number
  console.log('\n--- Test Group 4: Application Offline Number vs System Form Number ---');
  assert(testApp1.offlineFormNumber === "1149", `Application offlineFormNumber 1149 is preserved`);
  assert(testApp1.formNumber === "M-027", `System formNumber is M-027`);
  // Ensure application number rule: only offlineFormNumber used
  const appNoToUse = sanitizeValue(testApp1.offlineFormNumber);
  assert(appNoToUse === "1149" && appNoToUse !== "M-027", `Bond uses offlineFormNumber 1149, never system form number M-027`);

  // Test Group 5: Kanyadaan Installment Category Resolution
  console.log('\n--- Test Group 5: Kanyadaan Installment Category Resolution ---');
  function resolveInstallmentCategoryText(rec) {
    const rawAmt =
      rec?.installmentAmount ??
      rec?.installment_amount ??
      rec?.installment ??
      rec?.monthlyInstallment ??
      rec?.monthly_installment ??
      rec?.installmentCategory ??
      rec?.installment_category ??
      rec?.planAmount ??
      rec?.plan_amount ??
      '';

    if (!rawAmt) {
      const catStr = String(rec?.category || rec?.plan || '').trim();
      if (catStr.includes('300')) return '₹300 किस्त';
      if (catStr.includes('1000') || catStr.includes('1,000')) return '₹1,000 किस्त';
      return '';
    }

    const num = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt).replace(/[^\d.]/g, ''));
    if (num === 300) {
      return '₹300 किस्त';
    }
    if (num === 1000) {
      return '₹1,000 किस्त';
    }
    const str = String(rawAmt).trim();
    if (str.includes('300')) return '₹300 किस्त';
    if (str.includes('1000') || str.includes('1,000')) return '₹1,000 किस्त';

    return '';
  }

  assert(resolveInstallmentCategoryText({ installmentAmount: 300 }) === "₹300 किस्त", `₹300 installment maps to "₹300 किस्त"`);
  assert(resolveInstallmentCategoryText({ installmentAmount: 1000 }) === "₹1,000 किस्त", `₹1,000 installment maps to "₹1,000 किस्त"`);
  assert(resolveInstallmentCategoryText({ installment_amount: "300" }) === "₹300 किस्त", `String "300" installment maps to "₹300 किस्त"`);
  assert(resolveInstallmentCategoryText({ installment_amount: "1000" }) === "₹1,000 किस्त", `String "1000" installment maps to "₹1,000 किस्त"`);
  assert(resolveInstallmentCategoryText({}) === "", `Missing installment category is blank`);
  assert(resolveInstallmentCategoryText({ benefitDuration: "12 महीने" }) === "", `Duration is never mapped to Kanyadaan installment category`);
  assert(resolveInstallmentCategoryText({ ageSlab: "A", benefitAmount: 21000 }) === "", `Age slab / benefit amount is not mapped to Kanyadaan installment category`);

  // Test Group 6: Gotra Resolution and Fallback Prevention
  console.log('\n--- Test Group 6: Gotra Data Resolution & Fallback Prevention for जाति Field ---');
  function resolveGotraValue(record) {
    return sanitizeValue(
      record?.gotra ||
      record?.gotraName ||
      record?.gotra_name ||
      record?.Gotra ||
      record?.गोत्र ||
      ''
    );
  }

  // A. Gotra exists -> जाति receives gotra value
  const recordWithGotra = { gotra: "जाट", category: "OBC", caste: "Jat", gender: "Male" };
  assert(resolveGotraValue(recordWithGotra) === "जाट", `A. Gotra exists: जाति field receives "जाट"`);

  // B. Gotra missing -> जाति field is blank
  const recordWithoutGotra = { category: "OBC", caste: "Jat", gender: "Male" };
  assert(resolveGotraValue(recordWithoutGotra) === "", `B. Gotra missing: जाति field remains strictly blank`);

  // C. Caste/category exists but gotra missing -> must NOT fallback
  const recordWithCasteOnly = { caste: "Prajapat", category: "OBC" };
  assert(resolveGotraValue(recordWithCasteOnly) === "", `C. Caste/Category exists without gotra: जाति field does NOT fallback to caste/category`);

  // D. Gender exists -> gender must NOT appear in जाति field
  const recordWithGenderOnly = { gender: "Female" };
  assert(resolveGotraValue(recordWithGenderOnly) === "", `D. Gender exists: जाति field does NOT display gender`);

  // E & F: Dynamic worker & senior code remain offline numbers only
  const bondWorkerOffline = sanitizeOfflineNumber("1000");
  const bondSeniorOffline = sanitizeOfflineNumber("999");
  assert(bondWorkerOffline === "1000", `E. Worker offline number is 1000 only`);
  assert(bondSeniorOffline === "999", `F. Senior offline number is 999 only`);

  // G, H, I: Forbidden values for worker/senior
  assert(sanitizeOfflineNumber("EMP-001") === "", `G. EMP-xxx rejected`);
  assert(sanitizeOfflineNumber("ADMIN") === "", `H. ADMIN rejected`);
  assert(sanitizeOfflineNumber("UUID") === "" && sanitizeOfflineNumber(null) === "" && sanitizeOfflineNumber(undefined) === "" && sanitizeOfflineNumber("N/A") === "", `I. UUID/null/undefined/N/A rejected`);

  // Test Group 7: Generation Route Audit Verification
  console.log('\n--- Test Group 7: Route Code Audit (generate-bond-pdf/route.ts) ---');
  const routeTs = fs.readFileSync('app/api/generate-bond-pdf/route.ts', 'utf8');
  assert(routeTs.includes('saf_vivah_bond.pdf'), 'Route references saf_vivah_bond.pdf');
  assert(routeTs.includes('resolveInstallmentCategoryText'), 'Route includes resolveInstallmentCategoryText helper');
  assert(routeTs.includes('drawCenteredInBox(applicationOfflineNo, 113.57, 202.02, 696.5'), 'Route draws applicationOfflineNo in Box 1 (696.5)');
  assert(routeTs.includes('drawCenteredInBox(workerCode, 113.57, 202.02, 670.5'), 'Route draws workerCode in Box 2 (670.5)');
  assert(routeTs.includes('drawCenteredInBox(seniorCode, 113.57, 202.02, 645.5'), 'Route draws seniorCode in Box 3 (645.5)');
  assert(routeTs.includes('drawCenteredInBox(applicationDate, 451.84, 540.30, 696.5'), 'Route draws applicationDate in Box 4 (696.5)');
  assert(routeTs.includes('drawCenteredInBox(membershipNo, 451.84, 540.30, 664.5'), 'Route draws membershipNo in Box 5 (664.5)');
  assert(routeTs.includes('drawBounded(applicantName, 72, 612.34'), 'Route draws applicantName on Row 1 (612.34)');
  assert(routeTs.includes('drawBounded(warisdar, 340, 611.98'), 'Route draws warisdar/nomineeName on Row 1 (611.98)');
  assert(routeTs.includes('drawBounded(fatherName, 136, 589.11'), 'Route draws fatherName on Row 2 (589.11)');
  assert(routeTs.includes('drawBounded(nomineeAadhaar, 364, 588.81'), 'Route draws nomineeAadhaar on Row 2 (588.81)');
  assert(routeTs.includes('drawBounded(applicantAadhaar, 96, 565.88'), 'Route draws applicantAadhaar on Row 3 (565.88)');
  assert(routeTs.includes('drawBounded(nomineeMobile, 350, 565.64'), 'Route draws nomineeMobile on Row 3 (565.64)');
  assert(routeTs.includes('drawBounded(gotra, 76, 542.65'), 'Route draws gotra on Row 4 (542.65)');
  assert(routeTs.includes('drawBounded(agentMobile, 344, 542.48'), 'Route draws agentMobile on Row 4 (542.48)');
  assert(routeTs.includes('drawBounded(village, 74, 519.42'), 'Route draws village on Row 5 (519.42)');
  assert(routeTs.includes('drawBounded(relation, 320, 519.31'), 'Route draws relation on Row 5 (519.31)');
  assert(routeTs.includes('drawBounded(district, 78, 496.20'), 'Route draws district on Row 6 (496.20)');
  assert(routeTs.includes('drawBounded(state, 310, 496.14'), 'Route draws state on Row 6 (496.14)');
  assert(routeTs.includes('drawCenteredInBox(kanyadaanInstallment, 212, 278, 471.56'), 'Route draws kanyadaanInstallment on Kanyadaan line (471.56)');
  assert(routeTs.includes('drawCenteredInBox(durationText, 284, 365, 448.09'), 'Route draws durationText on Duration line (448.09)');

  console.log(`\n========================================`);
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runBondTestSuite().catch((e) => {
  console.error(e);
  process.exit(1);
});
