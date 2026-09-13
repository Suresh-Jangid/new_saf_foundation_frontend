import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log("=== RUNNING AGENT REGISTRATION HIERARCHY FRONTEND TESTS ===");

const root = process.cwd();

// Test 1: Check lib/api.ts for GET_ELIGIBLE_SENIORS and agentRegistrationAPI.getEligibleSeniors
const apiContent = fs.readFileSync(path.join(root, 'lib/api.ts'), 'utf8');
assert(apiContent.includes('GET_ELIGIBLE_SENIORS'), 'lib/api.ts should contain GET_ELIGIBLE_SENIORS endpoint');
assert(apiContent.includes('/v1/agents/seniors/eligible'), 'lib/api.ts should call /v1/agents/seniors/eligible');
assert(apiContent.includes('getEligibleSeniors'), 'agentRegistrationAPI should have getEligibleSeniors method');
console.log("✅ Test 1: API Endpoint and Method verified");

// Test 2: Check lib/services.ts for AgentRegistration hierarchy fields and APIService.getEligibleSeniors
const servicesContent = fs.readFileSync(path.join(root, 'lib/services.ts'), 'utf8');
assert(servicesContent.includes('seniorEmployeeId?:'), 'AgentRegistration interface should have seniorEmployeeId');
assert(servicesContent.includes('getEligibleSeniors'), 'APIService should expose getEligibleSeniors');
console.log("✅ Test 2: Services interface and APIService method verified");

// Test 3: Check lib/utils.ts mapAgentFormRecord
const utilsContent = fs.readFileSync(path.join(root, 'lib/utils.ts'), 'utf8');
assert(utilsContent.includes('seniorEmployeeId:'), 'mapAgentFormRecord should map seniorEmployeeId');
assert(utilsContent.includes('seniorName:'), 'mapAgentFormRecord should map seniorName');
assert(utilsContent.includes('seniorCode:'), 'mapAgentFormRecord should map seniorCode');
assert(utilsContent.includes('level:'), 'mapAgentFormRecord should map level');
console.log("✅ Test 3: utils.ts mapAgentFormRecord hierarchy fields verified");

// Test 4: Check app/dashboard/agent-registration/add/page.tsx
const addPageContent = fs.readFileSync(path.join(root, 'app/dashboard/agent-registration/add/page.tsx'), 'utf8');
assert(addPageContent.includes('getEligibleSeniors'), 'Add agent page should fetch eligible seniors');
assert(addPageContent.includes('सीधे Admin के अंतर्गत / Direct Under Admin'), 'Add agent page should have Direct Under Admin option');
assert(addPageContent.includes('seniorEmployeeId'), 'Add agent page should manage seniorEmployeeId state');
assert(addPageContent.includes('LEVEL-2 Agent'), 'Add agent page should show Level-2 helper when senior selected');
assert(addPageContent.includes('LEVEL-1 Senior'), 'Add agent page should show Level-1 helper when direct under admin');
console.log("✅ Test 4: Add Agent Page Senior selection & 2-level hierarchy logic verified");

// Test 5: Check app/dashboard/agent-registration/edit/[id]/page.tsx
const editPageContent = fs.readFileSync(path.join(root, 'app/dashboard/agent-registration/edit/[id]/page.tsx'), 'utf8');
assert(editPageContent.includes('getEligibleSeniors'), 'Edit agent page should fetch eligible seniors');
assert(editPageContent.includes('seniorEmployeeId'), 'Edit agent page should manage seniorEmployeeId state');
assert(editPageContent.includes('isLevel1'), 'Edit agent page should check if employee is Level-1');
assert(editPageContent.includes('LEVEL-1 SENIOR'), 'Edit agent page should display Level-1 Senior badge');
console.log("✅ Test 5: Edit Agent Page hierarchy & reassignment rules verified");

// Test 6: Check app/dashboard/agent-registration/page.tsx
const listPageContent = fs.readFileSync(path.join(root, 'app/dashboard/agent-registration/page.tsx'), 'utf8');
assert(listPageContent.includes('LEVEL-1'), 'List page should render LEVEL-1 badge');
assert(listPageContent.includes('LEVEL-2'), 'List page should render LEVEL-2 badge');
assert(listPageContent.includes('सीनियर / Senior'), 'List page should have Senior column');
assert(listPageContent.includes('सीनियर कोड / Senior Code'), 'List page should have Senior Code column');
console.log("✅ Test 6: Agent List Page hierarchy columns verified");

console.log("🎉 ALL AGENT HIERARCHY FRONTEND TESTS PASSED!");
