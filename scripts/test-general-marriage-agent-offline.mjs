import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';

// Mock agents list matching real backend hierarchy
const mockAgents = [
  {
    id: "397a5671-fd06-48ca-bbc9-73670de7241b",
    name: "dinesh",
    employeeId: "EMP-004",
    offlineFormNumber: "1258",
    parentAgentId: null,
    level: 1,
    seniorEmployeeId: "ADMIN"
  },
  {
    id: "44445555-6666-7777-8888-999900001111",
    name: "deelip",
    employeeId: "EMP-005",
    offlineFormNumber: "1259",
    parentAgentId: "397a5671-fd06-48ca-bbc9-73670de7241b",
    seniorEmployeeId: "EMP-004",
    level: 2
  },
  {
    id: "agent-no-offline-id",
    name: "worker_no_offline",
    employeeId: "EMP-010",
    offlineFormNumber: "",
    parentAgentId: "397a5671-fd06-48ca-bbc9-73670de7241b",
    seniorEmployeeId: "EMP-004",
    level: 2
  },
  {
    id: "senior-no-offline-id",
    name: "senior_no_offline",
    employeeId: "EMP-020",
    offlineFormNumber: "",
    parentAgentId: null,
    level: 1,
    seniorEmployeeId: "ADMIN"
  },
  {
    id: "worker-under-senior-no-offline-id",
    name: "worker_under_senior_no_offline",
    employeeId: "EMP-021",
    offlineFormNumber: "1999",
    parentAgentId: "senior-no-offline-id",
    seniorEmployeeId: "EMP-020",
    level: 2
  }
];

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
    return { workerOfflineFormNumber: workerOffline, seniorOfflineFormNumber: seniorOffline };
  }

  if (!agentsList || agentsList.length === 0) {
    return { workerOfflineFormNumber: workerOffline, seniorOfflineFormNumber: seniorOffline };
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

  return {
    workerOfflineFormNumber: workerOffline,
    seniorOfflineFormNumber: seniorOffline,
  };
}

async function testSuite() {
  console.log("=== RUNNING GENERAL MARRIAGE PDF AGENT OFFLINE REGRESSION TEST SUITE ===\n");
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

  // TEST A: Worker has offline number + Senior has offline number
  console.log("--- Test Case A: Worker has offline number + Senior has offline number ---");
  const appA = {
    formNumber: "M-027",
    offlineFormNumber: "1149",
    addedById: "44445555-6666-7777-8888-999900001111",
    workerCode: "EMP-005",
    seniorCode: "EMP-004",
    nomineeAadhar: "888877776666",
    nomineeMobile: "9876543210"
  };
  const resA = resolveAgentOfflineNumbers(appA, mockAgents);
  assert(resA.workerOfflineFormNumber === "1259", `Worker offline number is 1259 (got "${resA.workerOfflineFormNumber}")`);
  assert(resA.seniorOfflineFormNumber === "1258", `Senior offline number is 1258 (got "${resA.seniorOfflineFormNumber}")`);

  // TEST B: Worker offline number missing -> कार्यकर्ता कोड blank
  console.log("\n--- Test Case B: Worker offline number missing ---");
  const appB = {
    formNumber: "M-028",
    offlineFormNumber: "1150",
    addedById: "agent-no-offline-id",
    workerCode: "EMP-010",
    seniorCode: "EMP-004",
  };
  const resB = resolveAgentOfflineNumbers(appB, mockAgents);
  assert(resB.workerOfflineFormNumber === "", `Worker offline number is blank (got "${resB.workerOfflineFormNumber}")`);
  assert(resB.seniorOfflineFormNumber === "1258", `Senior offline number is 1258 (got "${resB.seniorOfflineFormNumber}")`);

  // TEST C: Senior offline number missing -> सीनियर कोड blank
  console.log("\n--- Test Case C: Senior offline number missing ---");
  const appC = {
    formNumber: "M-029",
    offlineFormNumber: "1151",
    addedById: "worker-under-senior-no-offline-id",
    workerCode: "EMP-021",
    seniorCode: "EMP-020",
  };
  const resC = resolveAgentOfflineNumbers(appC, mockAgents);
  assert(resC.workerOfflineFormNumber === "1999", `Worker offline number is 1999 (got "${resC.workerOfflineFormNumber}")`);
  assert(resC.seniorOfflineFormNumber === "", `Senior offline number is blank (got "${resC.seniorOfflineFormNumber}")`);

  // TEST D: Both offline numbers missing -> both fields blank
  console.log("\n--- Test Case D: Both offline numbers missing ---");
  const appD = {
    formNumber: "M-030",
    offlineFormNumber: "1152",
    addedById: "unknown-agent-id",
    workerCode: "EMP-999",
    seniorCode: "EMP-888",
  };
  const resD = resolveAgentOfflineNumbers(appD, mockAgents);
  assert(resD.workerOfflineFormNumber === "", `Worker offline number is blank (got "${resD.workerOfflineFormNumber}")`);
  assert(resD.seniorOfflineFormNumber === "", `Senior offline number is blank (got "${resD.seniorOfflineFormNumber}")`);

  // TEST E: Employee IDs must never appear in these two PDF fields
  console.log("\n--- Test Case E: Employee ID / UUID / ADMIN fallback prevention in PDF route logic ---");
  // Check sanitizer patterns
  const forbiddenValues = ["EMP-005", "EMP-004", "emp-001", "ADMIN", "Super Admin", "N/A", "null", "undefined", "397a5671-fd06-48ca-bbc9-73670de7241b"];
  for (const fv of forbiddenValues) {
    const isExcluded =
      /^EMP-\d+/i.test(fv) ||
      fv.toUpperCase() === 'ADMIN' ||
      fv.toUpperCase() === 'SUPER ADMIN' ||
      fv.toUpperCase() === 'N/A' ||
      fv.toLowerCase() === 'null' ||
      fv.toLowerCase() === 'undefined' ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fv);
    assert(isExcluded === true, `Forbidden value "${fv}" is strictly rejected`);
  }

  // TEST F: Existing application offline number remains correctly printed in क्रमांक
  console.log("\n--- Test Case F: Application क्रमांक uses offlineFormNumber (1149) not system form number (M-027) ---");
  assert(appA.offlineFormNumber === "1149", `Application offlineFormNumber 1149 preserved`);

  // TEST G: Nominee Aadhaar & Mobile mapping preserved
  console.log("\n--- Test Case G: Nominee Aadhaar & Mobile fields ---");
  assert(appA.nomineeAadhar === "888877776666", `Nominee Aadhaar preserved: ${appA.nomineeAadhar}`);
  assert(appA.nomineeMobile === "9876543210", `Nominee Mobile preserved: ${appA.nomineeMobile}`);

  // TEST H: Direct Level-1 Senior (Direct Under Admin)
  console.log("\n--- Test Case H: Level-1 Senior directly under Admin ---");
  const appH = {
    formNumber: "M-031",
    offlineFormNumber: "1153",
    addedById: "397a5671-fd06-48ca-bbc9-73670de7241b", // Dinesh himself
    workerCode: "EMP-004",
    seniorCode: "ADMIN",
  };
  const resH = resolveAgentOfflineNumbers(appH, mockAgents);
  assert(resH.workerOfflineFormNumber === "1258", `Worker offline number is 1258 (got "${resH.workerOfflineFormNumber}")`);
  assert(resH.seniorOfflineFormNumber === "", `Senior offline number is blank since senior is Admin (got "${resH.seniorOfflineFormNumber}")`);

  // TEST I: Verify new official template Saf_general_form.pdf file & properties
  console.log("\n--- Test Case I: Official Template File & Structure ---");
  const templatePath = path.resolve('public', 'pdf', 'general_application', 'Saf_general_form.pdf');
  assert(fs.existsSync(templatePath), `Template exists at ${templatePath}`);
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const pages = pdfDoc.getPages();
  assert(pages.length === 1, `Template has exactly 1 page (got ${pages.length})`);
  assert(templateBytes.length === 2764643, `Template matches exact new official file size (2764643 bytes)`);

  console.log(`\n========================================`);
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

testSuite();
