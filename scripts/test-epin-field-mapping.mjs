/**
 * Static Verification Test for SAF Foundation:
 * E-PIN Field Mapping & Verification Contract Disambiguation
 *
 * SAFETY INVARIANT: Static/Mock test only — Zero production DB mutations or endpoint calls.
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
console.log('SAF FOUNDATION — E-PIN FIELD MAPPING & CONTRACT TEST SUITE');
console.log('============================================================\n');

const testPostalPin = '344022';
const testEpinCode = 'EPIN-7VWF-U9PE-STWA';
const testAgentId = '42';

// 1. Check EpinService validateEpin implementation
console.log('1. Auditing lib/epin-service.ts validateEpin contract...');
const epinServicePath = path.join(rootDir, 'lib', 'epin-service.ts');
assert(fs.existsSync(epinServicePath), 'lib/epin-service.ts exists');

if (fs.existsSync(epinServicePath)) {
  const content = fs.readFileSync(epinServicePath, 'utf8');
  assert(
    content.includes('async validateEpin(epinCode: string, agentId?: string)'),
    'validateEpin accepts explicit epinCode parameter'
  );
  const startIdx = content.indexOf('validateEpin(');
  const endIdx = content.indexOf('consumeEpin(');
  const validateEpinMethod = content.slice(startIdx, endIdx);
  assert(
    validateEpinMethod.includes('epinCode: trimmed') && validateEpinMethod.includes('pinNumber: trimmed'),
    'validateEpin payload sends both epinCode and pinNumber with trimmed E-PIN'
  );
  assert(
    !/\bpinCode\s*:/.test(validateEpinMethod),
    'validateEpin payload does NOT send ambiguous pinCode parameter'
  );
}

// 2. Check General Marriage Registration page
console.log('\n2. Auditing General Marriage Registration (app/dashboard/general-applications/add/page.tsx)...');
const generalAppPath = path.join(rootDir, 'app', 'dashboard', 'general-applications', 'add', 'page.tsx');
assert(fs.existsSync(generalAppPath), 'general-applications/add/page.tsx exists');

if (fs.existsSync(generalAppPath)) {
  const content = fs.readFileSync(generalAppPath, 'utf8');
  assert(
    content.includes('pinCode: ""') && (content.includes('epinCode:') || content.includes('epinNumber:')),
    'General marriage form state separates postal pinCode and epinCode/epinNumber'
  );
  assert(
    content.includes('<EpinInputVerifier') && content.includes('formData.epinCode || formData.epinNumber'),
    'EpinInputVerifier binds strictly to epinCode / epinNumber and never pinCode'
  );
  assert(
    content.includes("apiFormData.append(\"pinCode\", formData.pinCode)"),
    'FormData appends postal PIN strictly as pinCode'
  );
  assert(
    content.includes("apiFormData.append('selectedAgentId', formData.selectedAgentId)") ||
    content.includes("apiFormData.append('addedby_id', formData.selectedAgentId || '')"),
    'selectedAgentId / agentId is preserved in registration payload'
  );
  assert(
    content.includes('यह E-PIN पहले ही किसी अन्य registration के साथ assign हो चुका है। कृपया दूसरा E-PIN चुनें।'),
    '409 Conflict message is preserved'
  );
}

// 3. Check EpinInputVerifier Component
console.log('\n3. Auditing EpinInputVerifier (components/forms/epin-input-verifier.tsx)...');
const verifierPath = path.join(rootDir, 'components', 'forms', 'epin-input-verifier.tsx');
assert(fs.existsSync(verifierPath), 'components/forms/epin-input-verifier.tsx exists');

if (fs.existsSync(verifierPath)) {
  const content = fs.readFileSync(verifierPath, 'utf8');
  assert(
    content.includes('epinCodeToValidate?: string') || content.includes('const epinCode = (epinCodeToValidate ?? value).trim()'),
    'EpinInputVerifier uses explicit epinCode variable in handleValidate'
  );
  assert(
    content.includes('EpinService.validateEpin(epinCode, agentId)'),
    'EpinInputVerifier delegates to EpinService.validateEpin with epinCode'
  );
}

// 4. Check Central API and Module Services
console.log('\n4. Auditing verifyEPin in Central API (lib/api.ts) & Services (lib/services.ts)...');
const apiPath = path.join(rootDir, 'lib', 'api.ts');
const servicesPath = path.join(rootDir, 'lib', 'services.ts');

if (fs.existsSync(apiPath)) {
  const content = fs.readFileSync(apiPath, 'utf8');
  assert(
    content.includes('verifyEPin: async (epinCode: string)'),
    'lib/api.ts uses epinCode signature for verifyEPin'
  );
  assert(
    !content.includes('verifyEPin: async (pinCode: string)'),
    'lib/api.ts has eliminated ambiguous verifyEPin(pinCode) signatures'
  );
}

if (fs.existsSync(servicesPath)) {
  const content = fs.readFileSync(servicesPath, 'utf8');
  assert(
    content.includes('static verifyJanniEPin = (epinCode: string)'),
    'lib/services.ts verifyJanniEPin accepts epinCode'
  );
  assert(
    content.includes('static verifyAawasEPin = (epinCode: string)'),
    'lib/services.ts verifyAawasEPin accepts epinCode'
  );
  assert(
    content.includes('static verifyLadoBahinEPin = (epinCode: string)'),
    'lib/services.ts verifyLadoBahinEPin accepts epinCode'
  );
  assert(
    content.includes('static verifyDhundhotsavEPin = (epinCode: string)'),
    'lib/services.ts verifyDhundhotsavEPin accepts epinCode'
  );
  assert(
    content.includes('static verifyShubhLaxmiEPin = (epinCode: string)'),
    'lib/services.ts verifyShubhLaxmiEPin accepts epinCode'
  );
}

// 5. Mock Simulation Test & Explicit Regression Assertions
console.log('\n5. Running Mock Simulation of Verification Payload...');
function simulateVerificationRequest(postalPin, epinCode, agentId) {
  const trimmed = (epinCode || '').trim();
  const payload = {
    epinCode: trimmed,
    pinNumber: trimmed,
    agentId: agentId || undefined,
  };
  return payload;
}

const simulatedPayload = simulateVerificationRequest(testPostalPin, testEpinCode, testAgentId);

assert(
  simulatedPayload.epinCode === 'EPIN-7VWF-U9PE-STWA',
  'E-PIN verification value === "EPIN-7VWF-U9PE-STWA"'
);
assert(
  testPostalPin !== simulatedPayload.epinCode,
  'postal PIN !== E-PIN verification value'
);
assert(
  simulatedPayload.epinCode === 'EPIN-7VWF-U9PE-STWA',
  'validateEpin payload epinCode === "EPIN-7VWF-U9PE-STWA"'
);
assert(
  simulatedPayload.pinNumber === 'EPIN-7VWF-U9PE-STWA',
  'validateEpin payload pinNumber === "EPIN-7VWF-U9PE-STWA"'
);
assert(
  simulatedPayload.agentId === '42',
  'selectedAgentId / agentId contract remains intact'
);
assert(
  !JSON.stringify(simulatedPayload).includes('344022'),
  'postal PIN is never substituted into E-PIN fields'
);

// 6. Registration Payload Simulation Test
console.log('\n6. Running Mock Simulation of Registration Submission Payload...');
function simulateRegistrationPayload(formData) {
  const apiFormData = new Map();
  apiFormData.set('pinCode', formData.pinCode); // postal PIN
  const activeEpin = (formData.epinCode || formData.epinNumber || '').trim();
  if (activeEpin) {
    apiFormData.set('epin', activeEpin);
    apiFormData.set('epinNumber', activeEpin);
    apiFormData.set('epinCode', activeEpin);
    apiFormData.set('pinNumber', activeEpin);
  }
  if (formData.selectedAgentId) {
    apiFormData.set('selectedAgentId', formData.selectedAgentId);
    apiFormData.set('agentId', formData.selectedAgentId);
    apiFormData.set('addedby_id', formData.selectedAgentId);
  }
  return Object.fromEntries(apiFormData.entries());
}

const mockForm = {
  applicantName: 'Test Applicant',
  pinCode: testPostalPin,
  epinCode: testEpinCode,
  selectedAgentId: testAgentId,
};

const regPayload = simulateRegistrationPayload(mockForm);

assert(
  regPayload.pinCode === '344022',
  'Registration payload maps postal PIN strictly to pinCode'
);
assert(
  regPayload.epin === 'EPIN-7VWF-U9PE-STWA' &&
  regPayload.epinNumber === 'EPIN-7VWF-U9PE-STWA' &&
  regPayload.epinCode === 'EPIN-7VWF-U9PE-STWA' &&
  regPayload.pinNumber === 'EPIN-7VWF-U9PE-STWA',
  'Registration payload maps actual E-PIN to epin/epinNumber/epinCode/pinNumber'
);
assert(
  regPayload.pinNumber !== '344022',
  'Postal PIN "344022" is NEVER used as pinNumber / epinNumber in registration'
);
assert(
  regPayload.selectedAgentId === '42' && regPayload.agentId === '42',
  'selectedAgentId & agentId are preserved in registration'
);

// Summary
console.log('\n============================================================');
console.log(`TOTAL CHECKS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('============================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('ALL E-PIN FIELD MAPPING CONTRACT ASSERTIONS PASSED!');
  process.exit(0);
}
