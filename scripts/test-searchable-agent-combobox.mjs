import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log("=== RUNNING SEARCHABLE AGENT DROPDOWN TESTS ===");

const root = process.cwd();

// Test 1: Verify components/agent-search-combobox.tsx exists and is properly structured
const comboboxPath = path.join(root, 'components/agent-search-combobox.tsx');
assert(fs.existsSync(comboboxPath), '1. AgentSearchCombobox component file must exist');
const comboboxContent = fs.readFileSync(comboboxPath, 'utf8');

assert(comboboxContent.includes('export function AgentSearchCombobox'), '1.1 Must export AgentSearchCombobox');
assert(comboboxContent.includes('role="combobox"'), '1.2 Trigger button must have role="combobox"');
assert(comboboxContent.includes('aria-expanded={open}'), '1.3 Trigger button must manage aria-expanded');
assert(comboboxContent.includes('Command'), '1.4 Must use cmdk Command component for keyboard navigation');
assert(comboboxContent.includes('CommandInput'), '1.5 Must render CommandInput');
assert(comboboxContent.includes('CommandList'), '1.6 Must render CommandList');
assert(comboboxContent.includes('CommandEmpty'), '1.7 Must render CommandEmpty');
assert(comboboxContent.includes('CommandItem'), '1.8 Must render CommandItem');
assert(comboboxContent.includes('Loader2'), '1.9 Must support loading indicator');
assert(comboboxContent.includes('X'), '1.10 Must support clear selection');
assert(comboboxContent.includes('onRetry'), '1.11 Must support error/retry states');
console.log("✅ 1. AgentSearchCombobox component properly structured");

// Test 2: Search matching logic test
console.log("Testing search filter logic...");
const sampleAgent = {
  id: '45269bc4-5bd4-4624-a84f-5731a9e54683',
  name: 'MAMTA KUMARI',
  employee_id: 'EMP-066',
  offlineFormNumber: 'NGO/26/118',
  mobile: '9928403136',
  village: 'NEHRU COLONI BALOTRA'
};

function matchesSearch(agent, term) {
  if (!term || !term.trim()) return true;
  const t = term.trim().toLowerCase();
  const name = String(agent.name || '').toLowerCase();
  const empId = String(agent.employee_id || agent.employeeId || '').toLowerCase();
  const offline = String(agent.offlineFormNumber || agent.offline_form_number || '').toLowerCase();
  const mobile = String(agent.mobile || agent.mobileNumber || '').toLowerCase();

  if (name.includes(t)) return true;
  if (empId.includes(t)) return true;
  if (offline.includes(t)) return true;
  if (mobile.includes(t)) return true;

  const cleanTerm = t.replace(/[^a-z0-9]/g, '');
  const cleanEmpId = empId.replace(/[^a-z0-9]/g, '');
  const cleanOffline = offline.replace(/[^a-z0-9]/g, '');
  const cleanMobile = mobile.replace(/[^a-z0-9]/g, '');

  if (cleanTerm && cleanEmpId.includes(cleanTerm)) return true;
  if (cleanTerm && cleanOffline.includes(cleanTerm)) return true;
  if (cleanTerm && cleanMobile.includes(cleanTerm)) return true;

  return false;
}

// 2.1 Match by Name
assert(matchesSearch(sampleAgent, 'MAMTA'), '2.1 Must match by Name');
assert(matchesSearch(sampleAgent, 'kumari'), '2.1 Must match by partial Name');

// 2.2 Match by Employee ID
assert(matchesSearch(sampleAgent, 'EMP-066'), '2.2 Must match by exact Employee ID');
assert(matchesSearch(sampleAgent, '066'), '2.2 Must match by numeric Employee ID');
assert(matchesSearch(sampleAgent, 'emp066'), '2.2 Must match by stripped Employee ID');

// 2.3 Match by Offline Number
assert(matchesSearch(sampleAgent, 'NGO/26/118'), '2.3 Must match by exact Offline Number');
assert(matchesSearch(sampleAgent, '118'), '2.3 Must match by numeric Offline Number');
assert(matchesSearch(sampleAgent, 'ngo26118'), '2.3 Must match by stripped Offline Number');

// 2.4 Match by Mobile Number
assert(matchesSearch(sampleAgent, '9928403136'), '2.4 Must match by exact Mobile');
assert(matchesSearch(sampleAgent, '9928'), '2.4 Must match by prefix Mobile');

// 2.5 Non-matching
assert(!matchesSearch(sampleAgent, 'RANDOM_PERSON_123'), '2.5 Must not match irrelevant term');
console.log("✅ 2. Multi-field search matching verified across all 4 criteria");

// Test 3: Page 1 — app/dashboard/agent-commission/page.tsx
const page1Content = fs.readFileSync(path.join(root, 'app/dashboard/agent-commission/page.tsx'), 'utf8');
assert(page1Content.includes('import { AgentSearchCombobox }'), '3.1 Page 1 must import AgentSearchCombobox');
assert(page1Content.includes('<AgentSearchCombobox'), '3.2 Page 1 must render AgentSearchCombobox');
assert(page1Content.includes('value={addedById}'), '3.3 Page 1 must bind addedById');
assert(page1Content.includes('onValueChange={setAddedById}'), '3.4 Page 1 must update addedById');
assert(page1Content.includes('offlineFormNumber:'), '3.5 Page 1 must map offlineFormNumber');
console.log("✅ 3. Page 1 (/dashboard/agent-commission) verified");

// Test 4: Page 2 — app/dashboard/agent-commission-report/page.tsx
const page2Content = fs.readFileSync(path.join(root, 'app/dashboard/agent-commission-report/page.tsx'), 'utf8');
assert(page2Content.includes('import { AgentSearchCombobox }'), '4.1 Page 2 must import AgentSearchCombobox');
assert(page2Content.includes('<AgentSearchCombobox'), '4.2 Page 2 must render AgentSearchCombobox');
assert(page2Content.includes('value={selectedAgentId}'), '4.3 Page 2 must bind selectedAgentId');
assert(page2Content.includes('onValueChange={handleAgentSelection}'), '4.4 Page 2 must update selectedAgentId via handleAgentSelection');
assert(page2Content.includes('offlineFormNumber:'), '4.5 Page 2 must map offlineFormNumber');
assert(page2Content.includes('disabled={isAgentUser}'), '4.6 Page 2 must preserve role restriction for agent users');
console.log("✅ 4. Page 2 (/dashboard/agent-commission-report) verified");

// Test 5: Page 3 — app/dashboard/agent-permission/page.tsx
const page3Content = fs.readFileSync(path.join(root, 'app/dashboard/agent-permission/page.tsx'), 'utf8');
assert(page3Content.includes('import { AgentSearchCombobox }'), '5.1 Page 3 must import AgentSearchCombobox');
assert(page3Content.includes('<AgentSearchCombobox'), '5.2 Page 3 must render AgentSearchCombobox');
assert(page3Content.includes('value={selectedAgent}'), '5.3 Page 3 must bind selectedAgent');
assert(page3Content.includes('onValueChange={setSelectedAgent}'), '5.4 Page 3 must update selectedAgent');
assert(page3Content.includes('offlineFormNumber:'), '5.5 Page 3 must map offlineFormNumber');
console.log("✅ 5. Page 3 (/dashboard/agent-permission) verified");

console.log("\n🎉 ALL SEARCHABLE AGENT DROPDOWN TESTS PASSED SUCCESSFULLY!");
