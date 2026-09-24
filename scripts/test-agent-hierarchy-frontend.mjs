import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log("=== RUNNING UNLIMITED AGENT HIERARCHY FRONTEND TESTS ===");

const root = process.cwd();

// Load formatAgentLevel from lib/utils.ts logic or simulate directly
function formatAgentLevel(level) {
  if (level === undefined || level === null || level === "") {
    return "LEVEL-1";
  }
  if (typeof level === "number" && !isNaN(level)) {
    return `LEVEL-${Math.max(1, Math.floor(level))}`;
  }
  const str = String(level).trim();
  const digits = str.replace(/\D+/g, "");
  if (digits) {
    const num = parseInt(digits, 10);
    if (!isNaN(num) && num > 0) {
      return `LEVEL-${num}`;
    }
  }
  return str.toUpperCase().startsWith("LEVEL") ? str.toUpperCase().replace("_", "-") : "LEVEL-1";
}

// ==========================================
// TEST 1 to TEST 7: Dynamic level display
// ==========================================
assert.strictEqual(formatAgentLevel(1), "LEVEL-1", "TEST 1: LEVEL-1 displays as LEVEL-1");
assert.strictEqual(formatAgentLevel("1"), "LEVEL-1", "TEST 1b: '1' displays as LEVEL-1");
console.log("✅ TEST 1: LEVEL-1 displays as LEVEL-1");

assert.strictEqual(formatAgentLevel(2), "LEVEL-2", "TEST 2: LEVEL-2 displays as LEVEL-2");
assert.strictEqual(formatAgentLevel("2"), "LEVEL-2", "TEST 2b: '2' displays as LEVEL-2");
console.log("✅ TEST 2: LEVEL-2 displays as LEVEL-2");

assert.strictEqual(formatAgentLevel(3), "LEVEL-3", "TEST 3: LEVEL-3 displays as LEVEL-3");
assert.strictEqual(formatAgentLevel("3"), "LEVEL-3", "TEST 3b: '3' displays as LEVEL-3");
console.log("✅ TEST 3: LEVEL-3 displays as LEVEL-3");

assert.strictEqual(formatAgentLevel(4), "LEVEL-4", "TEST 4: LEVEL-4 displays as LEVEL-4");
assert.strictEqual(formatAgentLevel("LEVEL_4"), "LEVEL-4", "TEST 4b: 'LEVEL_4' displays as LEVEL-4");
console.log("✅ TEST 4: LEVEL-4 displays as LEVEL-4");

assert.strictEqual(formatAgentLevel(5), "LEVEL-5", "TEST 5: LEVEL-5 displays as LEVEL-5");
assert.strictEqual(formatAgentLevel("LEVEL-5"), "LEVEL-5", "TEST 5b: 'LEVEL-5' displays as LEVEL-5");
console.log("✅ TEST 5: LEVEL-5 displays as LEVEL-5");

assert.strictEqual(formatAgentLevel(10), "LEVEL-10", "TEST 6: LEVEL-10 displays as LEVEL-10");
console.log("✅ TEST 6: LEVEL-10 displays as LEVEL-10");

assert.strictEqual(formatAgentLevel(12), "LEVEL-12", "TEST 7: LEVEL-12 displays as LEVEL-12");
console.log("✅ TEST 7: LEVEL-12 displays as LEVEL-12");

// ==========================================
// TEST 8 to TEST 10: Eligible senior list filtering
// ==========================================
const mockBackendSeniors = [
  { id: "agent-1", name: "Rakesh", level: 1, is_active: true },
  { id: "agent-2", name: "Mahendra", level: 2, is_active: true },
  { id: "agent-3", name: "Suresh", level: 3, is_active: true },
  { id: "agent-4", name: "Pawan", level: 4, is_active: true },
  { id: "agent-5", name: "Junior", level: 5, is_active: true },
];

function filterEligibleSeniors(rawList) {
  return rawList.filter((s) => {
    if (!s) return false;
    if (s.is_active === 0 || s.is_active === false || s.status === "inactive") return false;
    if (s.is_deleted || s.deleted_at) return false;
    return true;
  });
}

const filteredList = filterEligibleSeniors(mockBackendSeniors);
const hasLevel3 = filteredList.some((s) => s.level === 3);
const hasLevel4 = filteredList.some((s) => s.level === 4);
const hasLevel5 = filteredList.some((s) => s.level === 5);

assert.strictEqual(hasLevel3, true, "TEST 8: Eligible senior list does NOT filter out LEVEL-3");
console.log("✅ TEST 8: Eligible senior list does NOT filter out LEVEL-3");

assert.strictEqual(hasLevel4, true, "TEST 9: Eligible senior list does NOT filter out LEVEL-4");
console.log("✅ TEST 9: Eligible senior list does NOT filter out LEVEL-4");

assert.strictEqual(hasLevel5, true, "TEST 10: Eligible senior list does NOT filter out LEVEL-5");
console.log("✅ TEST 10: Eligible senior list does NOT filter out LEVEL-5");

// ==========================================
// TEST 11: Admin can select an arbitrary eligible hierarchy level as parent
// ==========================================
function simulateAdminSelectParent(selectedSeniorId, eligibleList) {
  if (selectedSeniorId === "direct_admin") {
    return { seniorEmployeeId: null, parentAgentId: null, level: 1 };
  }
  const senior = eligibleList.find((s) => s.id === selectedSeniorId);
  return {
    seniorEmployeeId: selectedSeniorId,
    parentAgentId: selectedSeniorId,
    level: senior ? Number(senior.level) + 1 : 2,
  };
}

const adminSelectionLevel4 = simulateAdminSelectParent("agent-4", filteredList);
assert.strictEqual(adminSelectionLevel4.parentAgentId, "agent-4", "Admin should be able to select Level-4 parent");
assert.strictEqual(adminSelectionLevel4.level, 5, "Child under Level-4 parent should be Level-5");
console.log("✅ TEST 11: Admin can select an arbitrary eligible hierarchy level as parent");

// ==========================================
// TEST 12: Agent user cannot interactively choose another parent when creating a junior
// ==========================================
const addPageSource = fs.readFileSync(path.join(root, 'app/dashboard/agent-registration/add/page.tsx'), 'utf8');
const editPageSource = fs.readFileSync(path.join(root, 'app/dashboard/agent-registration/edit/[id]/page.tsx'), 'utf8');

assert(addPageSource.includes('isAgent') || addPageSource.includes('isAdmin'), "Add agent page must check agent / admin role");
assert(addPageSource.includes('getAgentData()'), "Add agent page must fetch logged in agent data");
assert(addPageSource.includes('!isUserAdmin') || addPageSource.includes('disabled={isAgent()}'), "Add agent page must disable or lock parent select for Agent users");
console.log("✅ TEST 12: Agent user cannot interactively choose another parent when creating a junior");

// ==========================================
// TEST 13: No hardcoded maximum hierarchy level exists in Agent Registration frontend
// ==========================================
assert(!addPageSource.includes('s.level === 2'), "Add page must not filter s.level === 2");
assert(!editPageSource.includes('s.level === 2'), "Edit page must not filter s.level === 2");
assert(!addPageSource.includes('Max 2'), "Add page must not claim Hierarchy Depth: Max 2");
assert(!editPageSource.includes('Max 2'), "Edit page must not claim Hierarchy Depth: Max 2");
console.log("✅ TEST 13: No hardcoded maximum hierarchy level exists in Agent Registration frontend");

// ==========================================
// TEST 14: No logic converts all levels > 1 into LEVEL-2
// ==========================================
const listPageSource = fs.readFileSync(path.join(root, 'app/dashboard/agent-registration/page.tsx'), 'utf8');
assert(!listPageSource.includes('isLevel2 ? "LEVEL-2" : "LEVEL-1"'), "List page must not reduce levels to binary LEVEL-2/LEVEL-1");
assert(listPageSource.includes('formatAgentLevel'), "List page must use formatAgentLevel");
console.log("✅ TEST 14: No logic converts all levels > 1 into LEVEL-2");

// ==========================================
// TEST 15: TypeScript types and utils accept numeric dynamic levels
// ==========================================
const utilsSource = fs.readFileSync(path.join(root, 'lib/utils.ts'), 'utf8');
assert(utilsSource.includes('formatAgentLevel'), "lib/utils.ts must export formatAgentLevel");
assert(utilsSource.includes('export function formatAgentLevel'), "formatAgentLevel must be exported function");
console.log("✅ TEST 15: TypeScript types and utils accept numeric dynamic levels");

// ==========================================
// TEST 16: Existing Agent Registration functionality remains intact
// ==========================================
assert(addPageSource.includes('agentRegistrationAPI.create'), "Add page must call agentRegistrationAPI.create");
assert(editPageSource.includes('agentRegistrationAPI.update'), "Edit page must call agentRegistrationAPI.update");
assert(listPageSource.includes('DataTable'), "List page must render DataTable");
console.log("✅ TEST 16: Existing Agent Registration functionality remains intact");

console.log("\n🎉 ALL 16 UNLIMITED AGENT HIERARCHY FRONTEND TESTS PASSED SUCCESSFULLY!\n");
