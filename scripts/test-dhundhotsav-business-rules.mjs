/**
 * Static Business Rules Verification for SAF Foundation Phase 9-B:
 * Dhundhotsav Registration Application Frontend
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('\n============================================================');
console.log('SAF FOUNDATION — PHASE 9-B DHUNDHOTSAV STATIC BUSINESS ASSERTIONS');
console.log('============================================================\n');

// 1. Check Service Layer File & Contract
console.log('1. Checking Dhundhotsav Service Layer (lib/dhundhotsav-service.ts)...');
const servicePath = path.join(rootDir, 'lib', 'dhundhotsav-service.ts');
assert(fs.existsSync(servicePath), 'lib/dhundhotsav-service.ts exists');

if (fs.existsSync(servicePath)) {
  const serviceContent = fs.readFileSync(servicePath, 'utf8');
  assert(serviceContent.includes('/v1/dhundhotsav'), 'Service references /v1/dhundhotsav base endpoint');
  assert(serviceContent.includes('createRegistration'), 'Service has createRegistration method');
  assert(serviceContent.includes('getAllRegistrations'), 'Service has getAllRegistrations method');
  assert(serviceContent.includes('getRegistrationById'), 'Service has getRegistrationById method');
  assert(serviceContent.includes('updateRegistration'), 'Service has updateRegistration method');
  assert(serviceContent.includes('deleteRegistration'), 'Service has deleteRegistration method');
  assert(serviceContent.includes('addInstallment'), 'Service has addInstallment method');
  assert(serviceContent.includes('verifyEPin'), 'Service has verifyEPin method');
  assert(!serviceContent.includes('LADO_BAHIN_300'), 'Service does NOT contain Lado Bahin dual-ledger types');
  assert(!serviceContent.includes('LADO_BAHIN_1000'), 'Service does NOT contain Lado Bahin 1000 ledger types');
}

// 2. Check API Integration (lib/api.ts & lib/services.ts)
console.log('\n2. Checking Central API Integration (lib/api.ts & lib/services.ts)...');
const apiPath = path.join(rootDir, 'lib', 'api.ts');
const apiContent = fs.readFileSync(apiPath, 'utf8');
assert(apiContent.includes('export const dhundhotsavAPI'), 'lib/api.ts exports dhundhotsavAPI');
assert(apiContent.includes('/v1/dhundhotsav'), 'dhundhotsavAPI targets /v1/dhundhotsav');

const servicesPath = path.join(rootDir, 'lib', 'services.ts');
const servicesContent = fs.readFileSync(servicesPath, 'utf8');
assert(servicesContent.includes('createDhundhotsav'), 'APIService includes createDhundhotsav helper');
assert(servicesContent.includes('getDhundhotsavRegistrations'), 'APIService includes getDhundhotsavRegistrations helper');
assert(servicesContent.includes('addDhundhotsavInstallment'), 'APIService includes addDhundhotsavInstallment helper');

// 3. Check Module Registry & Permissions
console.log('\n3. Checking Module Registry & Permissions...');
const registryPath = path.join(rootDir, 'config', 'module-registry.ts');
const registryContent = fs.readFileSync(registryPath, 'utf8');
assert(registryContent.includes('dhundhotsav'), 'Module registry contains dhundhotsav entry');
assert(registryContent.includes('/dashboard/dhundhotsav'), 'Module registry points to /dashboard/dhundhotsav');

const permPath = path.join(rootDir, 'lib', 'permissions.ts');
const permContent = fs.readFileSync(permPath, 'utf8');
assert(permContent.includes('module: "dhundhotsav"'), 'AVAILABLE_MODULES includes dhundhotsav');
assert(permContent.includes('dhundhotsav: "Dhundhotsav Registration"'), 'MODULE_DISPLAY_NAMES includes dhundhotsav');

// 4. Check Listing Page (app/dashboard/dhundhotsav/page.tsx)
console.log('\n4. Checking Dhundhotsav Listing Page...');
const listPath = path.join(rootDir, 'app', 'dashboard', 'dhundhotsav', 'page.tsx');
assert(fs.existsSync(listPath), 'app/dashboard/dhundhotsav/page.tsx exists');

if (fs.existsSync(listPath)) {
  const listContent = fs.readFileSync(listPath, 'utf8');
  assert(listContent.includes('RoleGuard'), 'List page uses RoleGuard');
  assert(listContent.includes('requiredModule="dhundhotsav"'), 'RoleGuard protects with requiredModule="dhundhotsav"');
  assert(listContent.includes('₹5,100'), 'List page displays fixed ₹5,100 membership fee');
  assert(listContent.includes('300'), 'List page displays ₹300 installment');
  assert(!listContent.includes('account1000') && !listContent.includes('LADO_BAHIN'), 'List page has single ledger (no ₹1,000 account)');
  assert(!listContent.includes('ageSlab') && !listContent.includes('ageCategory'), 'List page does NOT use age slabs');
}

// 5. Check Registration Form Page (app/dashboard/dhundhotsav/add/page.tsx)
console.log('\n5. Checking Dhundhotsav Registration Form Page...');
const addPath = path.join(rootDir, 'app', 'dashboard', 'dhundhotsav', 'add', 'page.tsx');
assert(fs.existsSync(addPath), 'app/dashboard/dhundhotsav/add/page.tsx exists');

if (fs.existsSync(addPath)) {
  const addContent = fs.readFileSync(addPath, 'utf8');
  assert(addContent.includes('RoleGuard'), 'Add page uses RoleGuard');
  assert(addContent.includes('requiredModule="dhundhotsav"'), 'RoleGuard protects with requiredModule="dhundhotsav"');
  assert(addContent.includes('EpinInputVerifier'), 'Add page uses EpinInputVerifier component');
  assert(addContent.includes('5100'), 'Add page sets 5100 fixed membership fee');
  assert(addContent.includes('MALE_POOL'), 'Add page sets pool to MALE_POOL');
  assert(addContent.includes('DHUNDHOTSAV'), 'Add page sets schemeType to DHUNDHOTSAV');
  assert(addContent.includes('409') || addContent.includes('Duplicate'), 'Add page handles 409 duplicate conflicts');
  assert(!addContent.includes('account1000') && !addContent.includes('LADO_BAHIN'), 'Add page is single-ledger (no ₹1,000 selector)');
  assert(!addContent.includes('ageSlab') && !addContent.includes('age-based'), 'Add page does NOT implement age slab or age-based pricing');
}

// 6. Check Detail Page (app/dashboard/dhundhotsav/[id]/page.tsx)
console.log('\n6. Checking Dhundhotsav Detail Page...');
const detailPath = path.join(rootDir, 'app', 'dashboard', 'dhundhotsav', '[id]', 'page.tsx');
assert(fs.existsSync(detailPath), 'app/dashboard/dhundhotsav/[id]/page.tsx exists');

if (fs.existsSync(detailPath)) {
  const detailContent = fs.readFileSync(detailPath, 'utf8');
  assert(detailContent.includes('RoleGuard'), 'Detail page uses RoleGuard');
  assert(detailContent.includes('requiredModule="dhundhotsav"'), 'RoleGuard protects with requiredModule="dhundhotsav"');
  assert(detailContent.includes('₹5,100'), 'Detail page displays ₹5,100 fixed membership fee');
  assert(detailContent.includes('300'), 'Detail page enforces ₹300 installment');
  assert(!detailContent.includes('account1000') && !detailContent.includes('LADO_BAHIN'), 'Detail page maintains single installment table (no dual tabs)');
}

// 7. Check Existing Module Protection
console.log('\n7. Checking Existing Module Protection...');
const marriagePath = path.join(rootDir, 'app', 'dashboard', 'general-applications', 'page.tsx');
assert(fs.existsSync(marriagePath), 'Existing General Marriage module exists');

const aawasPath = path.join(rootDir, 'app', 'dashboard', 'aawas', 'page.tsx');
assert(fs.existsSync(aawasPath), 'Existing Aawas module exists');

const janniPath = path.join(rootDir, 'app', 'dashboard', 'janni-delivery', 'page.tsx');
assert(fs.existsSync(janniPath), 'Existing Janni Delivery module exists');

const ladoBahinPath = path.join(rootDir, 'app', 'dashboard', 'lado-bahin', 'page.tsx');
assert(fs.existsSync(ladoBahinPath), 'Existing Lado Bahin module exists');

const mayraPath = path.join(rootDir, 'app', 'dashboard', 'mayra-registration', 'page.tsx');
assert(fs.existsSync(mayraPath), 'Existing Mayra module exists');

const epinPath = path.join(rootDir, 'app', 'dashboard', 'epin-management', 'page.tsx');
assert(fs.existsSync(epinPath), 'Existing E-PIN Management module exists');

console.log('\n============================================================');
console.log(`TOTAL CHECKS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('============================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('All Phase 9-B Dhundhotsav static business assertions PASSED successfully!\n');
}
