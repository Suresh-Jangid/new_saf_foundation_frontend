/**
 * Static Business Rules Verification for SAF Foundation Phase 8-B:
 * Lado Bahin (Muklawa) Registration Application Frontend
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
console.log('SAF FOUNDATION — PHASE 8-B STATIC BUSINESS ASSERTIONS');
console.log('============================================================\n');

// 1. Check Service Layer File & Contract
console.log('1. Checking Lado Bahin Service Layer (lib/lado-bahin-service.ts)...');
const servicePath = path.join(rootDir, 'lib', 'lado-bahin-service.ts');
assert(fs.existsSync(servicePath), 'lib/lado-bahin-service.ts exists');

if (fs.existsSync(servicePath)) {
  const serviceContent = fs.readFileSync(servicePath, 'utf8');
  assert(serviceContent.includes('/v1/lado-bahin'), 'Service references /v1/lado-bahin base endpoint');
  assert(serviceContent.includes('LADO_BAHIN_300'), 'Service supports LADO_BAHIN_300 account type');
  assert(serviceContent.includes('LADO_BAHIN_1000'), 'Service supports LADO_BAHIN_1000 account type');
  assert(serviceContent.includes('createRegistration'), 'Service has createRegistration method');
  assert(serviceContent.includes('getAllRegistrations'), 'Service has getAllRegistrations method');
  assert(serviceContent.includes('getRegistrationById'), 'Service has getRegistrationById method');
  assert(serviceContent.includes('updateRegistration'), 'Service has updateRegistration method');
  assert(serviceContent.includes('deleteRegistration'), 'Service has deleteRegistration method');
  assert(serviceContent.includes('addInstallment'), 'Service has addInstallment method');
  assert(serviceContent.includes('verifyEPin'), 'Service has verifyEPin method');
}

// 2. Check API Integration (lib/api.ts & lib/services.ts)
console.log('\n2. Checking Central API Integration (lib/api.ts & lib/services.ts)...');
const apiPath = path.join(rootDir, 'lib', 'api.ts');
const apiContent = fs.readFileSync(apiPath, 'utf8');
assert(apiContent.includes('export const ladoBahinAPI'), 'lib/api.ts exports ladoBahinAPI');
assert(apiContent.includes('/v1/lado-bahin'), 'ladoBahinAPI targets /v1/lado-bahin');

const servicesPath = path.join(rootDir, 'lib', 'services.ts');
const servicesContent = fs.readFileSync(servicesPath, 'utf8');
assert(servicesContent.includes('createLadoBahin'), 'APIService includes createLadoBahin helper');
assert(servicesContent.includes('getLadoBahinRegistrations'), 'APIService includes getLadoBahinRegistrations helper');
assert(servicesContent.includes('addLadoBahinInstallment'), 'APIService includes addLadoBahinInstallment helper');

// 3. Check Module Registry & Permissions
console.log('\n3. Checking Module Registry & Permissions...');
const registryPath = path.join(rootDir, 'config', 'module-registry.ts');
const registryContent = fs.readFileSync(registryPath, 'utf8');
assert(registryContent.includes('lado_bahin'), 'Module registry contains lado_bahin entry');
assert(registryContent.includes('/dashboard/lado-bahin'), 'Module registry points to /dashboard/lado-bahin');

const permPath = path.join(rootDir, 'lib', 'permissions.ts');
const permContent = fs.readFileSync(permPath, 'utf8');
assert(permContent.includes('module: "lado_bahin"'), 'AVAILABLE_MODULES includes lado_bahin');

// 4. Check Listing Page (app/dashboard/lado-bahin/page.tsx)
console.log('\n4. Checking Lado Bahin Listing Page...');
const listPath = path.join(rootDir, 'app', 'dashboard', 'lado-bahin', 'page.tsx');
assert(fs.existsSync(listPath), 'app/dashboard/lado-bahin/page.tsx exists');

if (fs.existsSync(listPath)) {
  const listContent = fs.readFileSync(listPath, 'utf8');
  assert(listContent.includes('RoleGuard'), 'List page uses RoleGuard');
  assert(listContent.includes('requiredModule="lado_bahin"'), 'RoleGuard protects with requiredModule="lado_bahin"');
  assert(listContent.includes('₹5,100'), 'List page displays fixed ₹5,100 membership fee');
  assert(listContent.includes('LADO_BAHIN_300') && listContent.includes('300'), 'List page supports independent ₹300 ledger');
  assert(listContent.includes('LADO_BAHIN_1000') && listContent.includes('1000'), 'List page supports independent ₹1,000 ledger');
  assert(!listContent.includes('ageSlab') && !listContent.includes('ageCategory'), 'List page does NOT use age slabs');
}

// 5. Check Registration Form Page (app/dashboard/lado-bahin/add/page.tsx)
console.log('\n5. Checking Lado Bahin Registration Form Page...');
const addPath = path.join(rootDir, 'app', 'dashboard', 'lado-bahin', 'add', 'page.tsx');
assert(fs.existsSync(addPath), 'app/dashboard/lado-bahin/add/page.tsx exists');

if (fs.existsSync(addPath)) {
  const addContent = fs.readFileSync(addPath, 'utf8');
  assert(addContent.includes('RoleGuard'), 'Add page uses RoleGuard');
  assert(addContent.includes('requiredModule="lado_bahin"'), 'RoleGuard protects with requiredModule="lado_bahin"');
  assert(addContent.includes('EpinInputVerifier'), 'Add page uses EpinInputVerifier component');
  assert(addContent.includes('5100'), 'Add page sets 5100 fixed membership fee');
  assert(addContent.includes('FEMALE_POOL'), 'Add page sets pool to FEMALE_POOL');
  assert(addContent.includes('LADO_BAHIN'), 'Add page sets schemeType to LADO_BAHIN');
  assert(addContent.includes('409') || addContent.includes('Duplicate'), 'Add page handles 409 duplicate conflicts');
  assert(!addContent.includes('ageSlab') && !addContent.includes('age-based'), 'Add page does NOT implement age slab or age-based pricing');
}

// 6. Check Detail Page (app/dashboard/lado-bahin/[id]/page.tsx)
console.log('\n6. Checking Lado Bahin Detail Page...');
const detailPath = path.join(rootDir, 'app', 'dashboard', 'lado-bahin', '[id]', 'page.tsx');
assert(fs.existsSync(detailPath), 'app/dashboard/lado-bahin/[id]/page.tsx exists');

if (fs.existsSync(detailPath)) {
  const detailContent = fs.readFileSync(detailPath, 'utf8');
  assert(detailContent.includes('RoleGuard'), 'Detail page uses RoleGuard');
  assert(detailContent.includes('requiredModule="lado_bahin"'), 'RoleGuard protects with requiredModule="lado_bahin"');
  assert(detailContent.includes('₹5,100'), 'Detail page displays ₹5,100 fixed membership fee');
  assert(detailContent.includes('installments300'), 'Detail page maintains separate ₹300 installment list');
  assert(detailContent.includes('installments1000'), 'Detail page maintains separate ₹1,000 installment list');
}

// 7. Check Existing Modules Remain Intact
console.log('\n7. Checking Existing Module Protection...');
const marriagePath = path.join(rootDir, 'app', 'dashboard', 'general-applications', 'page.tsx');
assert(fs.existsSync(marriagePath), 'Existing General Marriage module exists');

const aawasPath = path.join(rootDir, 'app', 'dashboard', 'aawas', 'page.tsx');
assert(fs.existsSync(aawasPath), 'Existing Aawas module exists');

const janniPath = path.join(rootDir, 'app', 'dashboard', 'janni-delivery', 'page.tsx');
assert(fs.existsSync(janniPath), 'Existing Janni Delivery module exists');

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
  console.log('All Phase 8-B static business assertions PASSED successfully!\n');
}
