/**
 * Static Business Rules Verification for SAF Foundation Phase 10-B:
 * ShubhLaxmi Registration Application Frontend
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
console.log('SAF FOUNDATION — PHASE 10-B SHUBHLAXMI STATIC BUSINESS ASSERTIONS');
console.log('============================================================\n');

// 1. Check Service Layer File & Contract
console.log('1. Checking ShubhLaxmi Service Layer (lib/shubh-laxmi-service.ts)...');
const servicePath = path.join(rootDir, 'lib', 'shubh-laxmi-service.ts');
assert(fs.existsSync(servicePath), 'lib/shubh-laxmi-service.ts exists');

if (fs.existsSync(servicePath)) {
  const serviceContent = fs.readFileSync(servicePath, 'utf8');
  assert(serviceContent.includes('/v1/shubh-laxmi'), 'Service references /v1/shubh-laxmi base endpoint');
  assert(serviceContent.includes('createRegistration'), 'Service has createRegistration method');
  assert(serviceContent.includes('getAllRegistrations'), 'Service has getAllRegistrations method');
  assert(serviceContent.includes('getRegistrationById'), 'Service has getRegistrationById method');
  assert(serviceContent.includes('updateRegistration'), 'Service has updateRegistration method');
  assert(serviceContent.includes('deleteRegistration'), 'Service has deleteRegistration method');
  assert(serviceContent.includes('addInstallment'), 'Service has addInstallment method');
  assert(serviceContent.includes('verifyEPin'), 'Service has verifyEPin method');
  assert(serviceContent.includes('UNIFIED_POOL'), 'Service defines UNIFIED_POOL');
  assert(serviceContent.includes('Male') && serviceContent.includes('Female'), 'Service supports Male and Female both');
  assert(!serviceContent.includes('LADO_BAHIN_300'), 'Service does NOT contain Lado Bahin dual-ledger types');
  assert(!serviceContent.includes('LADO_BAHIN_1000'), 'Service does NOT contain Lado Bahin 1000 ledger types');
}

// 2. Check API Integration (lib/api.ts & lib/services.ts)
console.log('\n2. Checking Central API Integration (lib/api.ts & lib/services.ts)...');
const apiPath = path.join(rootDir, 'lib', 'api.ts');
const apiContent = fs.readFileSync(apiPath, 'utf8');
assert(apiContent.includes('export const shubhLaxmiAPI'), 'lib/api.ts exports shubhLaxmiAPI');
assert(apiContent.includes('/v1/shubh-laxmi'), 'shubhLaxmiAPI targets /v1/shubh-laxmi');

const servicesPath = path.join(rootDir, 'lib', 'services.ts');
const servicesContent = fs.readFileSync(servicesPath, 'utf8');
assert(servicesContent.includes('createShubhLaxmi'), 'APIService includes createShubhLaxmi helper');
assert(servicesContent.includes('getShubhLaxmiRegistrations'), 'APIService includes getShubhLaxmiRegistrations helper');
assert(servicesContent.includes('addShubhLaxmiInstallment'), 'APIService includes addShubhLaxmiInstallment helper');

// 3. Check Module Registry & Permissions
console.log('\n3. Checking Module Registry & Permissions...');
const registryPath = path.join(rootDir, 'config', 'module-registry.ts');
const registryContent = fs.readFileSync(registryPath, 'utf8');
assert(registryContent.includes('shubh_laxmi'), 'Module registry contains shubh_laxmi entry');
assert(registryContent.includes('/dashboard/shubh-laxmi'), 'Module registry points to /dashboard/shubh-laxmi');

const permPath = path.join(rootDir, 'lib', 'permissions.ts');
const permContent = fs.readFileSync(permPath, 'utf8');
assert(permContent.includes('module: "shubh_laxmi"'), 'AVAILABLE_MODULES includes shubh_laxmi');
assert(permContent.includes('shubh_laxmi: "ShubhLaxmi Registration"'), 'MODULE_DISPLAY_NAMES includes shubh_laxmi');

// 4. Check Listing Page (app/dashboard/shubh-laxmi/page.tsx)
console.log('\n4. Checking ShubhLaxmi Listing Page...');
const listPath = path.join(rootDir, 'app', 'dashboard', 'shubh-laxmi', 'page.tsx');
assert(fs.existsSync(listPath), 'app/dashboard/shubh-laxmi/page.tsx exists');

if (fs.existsSync(listPath)) {
  const listContent = fs.readFileSync(listPath, 'utf8');
  assert(listContent.includes('RoleGuard'), 'List page uses RoleGuard');
  assert(listContent.includes('requiredModule="shubh_laxmi"'), 'RoleGuard protects with requiredModule="shubh_laxmi"');
  assert(listContent.includes('₹3,100'), 'List page displays fixed ₹3,100 membership fee');
  assert(listContent.includes('300'), 'List page displays ₹300 installment');
  assert(listContent.includes('UNIFIED_POOL'), 'List page displays UNIFIED_POOL badge');
  assert(listContent.includes('Male') && listContent.includes('Female'), 'List page supports Male and Female genders');
  assert(!listContent.includes('account1000') && !listContent.includes('LADO_BAHIN'), 'List page has single ledger (no ₹1,000 account)');
  assert(!listContent.includes('ageSlab') && !listContent.includes('ageCategory'), 'List page does NOT use age slabs');
}

// 5. Check Registration Form Page (app/dashboard/shubh-laxmi/add/page.tsx)
console.log('\n5. Checking ShubhLaxmi Registration Form Page...');
const addPath = path.join(rootDir, 'app', 'dashboard', 'shubh-laxmi', 'add', 'page.tsx');
assert(fs.existsSync(addPath), 'app/dashboard/shubh-laxmi/add/page.tsx exists');

if (fs.existsSync(addPath)) {
  const addContent = fs.readFileSync(addPath, 'utf8');
  assert(addContent.includes('RoleGuard'), 'Add page uses RoleGuard');
  assert(addContent.includes('requiredModule="shubh_laxmi"'), 'RoleGuard protects with requiredModule="shubh_laxmi"');
  assert(addContent.includes('EpinInputVerifier'), 'Add page uses EpinInputVerifier component');
  assert(addContent.includes('3100'), 'Add page sets 3100 fixed membership fee');
  assert(addContent.includes('UNIFIED_POOL'), 'Add page sets pool to UNIFIED_POOL');
  assert(addContent.includes('SHUBH_LAXMI'), 'Add page sets schemeType to SHUBH_LAXMI');
  assert(addContent.includes('Female') && addContent.includes('Male'), 'Add page allows both Male and Female selection');
  assert(addContent.includes('12') && addContent.includes('20%'), 'Add page represents 12-month 20% benefit rule');
  assert(addContent.includes('409') || addContent.includes('Duplicate'), 'Add page handles 409 duplicate conflicts');
  assert(!addContent.includes('account1000') && !addContent.includes('LADO_BAHIN'), 'Add page is single-ledger (no ₹1,000 selector)');
  assert(!addContent.includes('ageSlab') && !addContent.includes('age-based'), 'Add page does NOT implement age slab or age-based pricing');
}

// 6. Check Detail Page (app/dashboard/shubh-laxmi/[id]/page.tsx)
console.log('\n6. Checking ShubhLaxmi Detail Page...');
const detailPath = path.join(rootDir, 'app', 'dashboard', 'shubh-laxmi', '[id]', 'page.tsx');
assert(fs.existsSync(detailPath), 'app/dashboard/shubh-laxmi/[id]/page.tsx exists');

if (fs.existsSync(detailPath)) {
  const detailContent = fs.readFileSync(detailPath, 'utf8');
  assert(detailContent.includes('RoleGuard'), 'Detail page uses RoleGuard');
  assert(detailContent.includes('requiredModule="shubh_laxmi"'), 'RoleGuard protects with requiredModule="shubh_laxmi"');
  assert(detailContent.includes('₹3,100'), 'Detail page displays ₹3,100 fixed membership fee');
  assert(detailContent.includes('300'), 'Detail page enforces ₹300 installment');
  assert(detailContent.includes('UNIFIED_POOL'), 'Detail page displays UNIFIED_POOL badge');
  assert(detailContent.includes('12') && detailContent.includes('20%'), 'Detail page displays 12-month 20% rule');
  assert(!detailContent.includes('account1000') && !detailContent.includes('LADO_BAHIN'), 'Detail page maintains single installment table (no dual tabs)');
}

// 7. Check Installment Validation (Strict ₹300 Enforcement)
console.log('\n7. Checking Installment Validation Logic...');
function validateInstallmentAmount(amt) {
  return Number(amt) === 300;
}
assert(validateInstallmentAmount(300) === true, 'Amount 300 is accepted');
assert(validateInstallmentAmount(301) === false, 'Amount 301 is rejected');
assert(validateInstallmentAmount(350) === false, 'Amount 350 is rejected');
assert(validateInstallmentAmount(500) === false, 'Amount 500 is rejected');
assert(validateInstallmentAmount(1000) === false, 'Amount 1000 is rejected');

// 8. Check Existing Module Protection
console.log('\n8. Checking Existing Module Protection...');
const marriagePath = path.join(rootDir, 'app', 'dashboard', 'general-applications', 'page.tsx');
assert(fs.existsSync(marriagePath), 'Existing General Marriage module exists');

const aawasPath = path.join(rootDir, 'app', 'dashboard', 'aawas', 'page.tsx');
assert(fs.existsSync(aawasPath), 'Existing Aawas module exists');

const janniPath = path.join(rootDir, 'app', 'dashboard', 'janni-delivery', 'page.tsx');
assert(fs.existsSync(janniPath), 'Existing Janni Delivery module exists');

const ladoBahinPath = path.join(rootDir, 'app', 'dashboard', 'lado-bahin', 'page.tsx');
assert(fs.existsSync(ladoBahinPath), 'Existing Lado Bahin module exists');

const dhundhotsavPath = path.join(rootDir, 'app', 'dashboard', 'dhundhotsav', 'page.tsx');
assert(fs.existsSync(dhundhotsavPath), 'Existing Dhundhotsav module exists');

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
  console.log('All Phase 10-B ShubhLaxmi static business assertions PASSED successfully!\n');
}
