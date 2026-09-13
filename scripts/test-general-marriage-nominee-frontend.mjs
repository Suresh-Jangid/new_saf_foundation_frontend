import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('============================================================');
console.log('SAF FOUNDATION — GENERAL MARRIAGE NOMINEE FRONTEND TEST SUITE');
console.log('============================================================\n');

let passCount = 0;
let failCount = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
    failCount++;
  }
}

async function runTests() {
  const addPagePath = path.join(process.cwd(), 'app', 'dashboard', 'general-applications', 'add', 'page.tsx');
  const editPagePath = path.join(process.cwd(), 'app', 'dashboard', 'general-applications', 'edit', '[id]', 'page.tsx');
  const servicesPath = path.join(process.cwd(), 'lib', 'services.ts');
  const listPagePath = path.join(process.cwd(), 'app', 'dashboard', 'general-applications', 'page.tsx');
  const routePath = path.join(process.cwd(), 'app', 'api', 'fill-pdf-form', 'route.ts');

  console.log('1. Static Code Audit: General Applications Add Page...');
  const addContent = fs.readFileSync(addPagePath, 'utf8');

  it('Add Page: Form State includes nomineeAadhar and nomineeMobile', () => {
    assert.ok(addContent.includes('nomineeAadhar: string;'), 'Must have nomineeAadhar in formData type');
    assert.ok(addContent.includes('nomineeMobile: string;'), 'Must have nomineeMobile in formData type');
    assert.ok(addContent.includes('nomineeAadhar: "",'), 'Must initialize nomineeAadhar as empty string');
    assert.ok(addContent.includes('nomineeMobile: "",'), 'Must initialize nomineeMobile as empty string');
  });

  it('Add Page: Nominee Aadhaar & Mobile UI inputs rendered with correct labels, placeholders, maxLength, and inputMode', () => {
    assert.ok(addContent.includes('नॉमिनी का आधार नं. / Nominee Aadhaar Number'), 'Must render Nominee Aadhaar bilingual label');
    assert.ok(addContent.includes('12 अंकों का आधार दर्ज करें'), 'Must render Nominee Aadhaar placeholder');
    assert.ok(addContent.includes('नॉमिनी मोबाइल नं. / Nominee Mobile Number'), 'Must render Nominee Mobile bilingual label');
    assert.ok(addContent.includes('10 अंकों का मोबाइल दर्ज करें'), 'Must render Nominee Mobile placeholder');
    assert.ok(addContent.includes('maxLength={12}'), 'Must specify maxLength 12 for Aadhaar');
    assert.ok(addContent.includes('maxLength={10}'), 'Must specify maxLength 10 for Mobile');
    assert.ok(addContent.includes('inputMode="numeric"'), 'Must specify numeric inputMode');
  });

  it('Add Page: Validation enforces exactly 12 digits for Nominee Aadhaar when entered', () => {
    assert.ok(addContent.includes('formData.nomineeAadhar && formData.nomineeAadhar.trim()'), 'Validation must be conditional on presence');
    assert.ok(addContent.includes('nomineeAadharDigits.length !== 12'), 'Must check exactly 12 digits for nominee Aadhaar');
    assert.ok(addContent.includes('नॉमिनी का आधार 12 अंकों का होना चाहिए'), 'Must show correct toast error message for invalid nominee Aadhaar');
  });

  it('Add Page: Validation enforces exactly 10 digits for Nominee Mobile when entered', () => {
    assert.ok(addContent.includes('formData.nomineeMobile && formData.nomineeMobile.trim()'), 'Validation must be conditional on presence');
    assert.ok(addContent.includes('nomineeMobileDigits.length !== 10'), 'Must check exactly 10 digits for nominee Mobile');
    assert.ok(addContent.includes('नॉमिनी मोबाइल नंबर 10 अंकों का होना चाहिए'), 'Must show correct toast error message for invalid nominee Mobile');
  });

  it('Add Page: executeSubmit appends nomineeAadhar and nomineeMobile (with aliases) to FormData', () => {
    assert.ok(addContent.includes('apiFormData.append("nomineeAadhar", nomineeAadharDigits)'), 'Must append nomineeAadhar');
    assert.ok(addContent.includes('apiFormData.append("nominee_aadhar", nomineeAadharDigits)'), 'Must append nominee_aadhar alias');
    assert.ok(addContent.includes('apiFormData.append("nomineeAadhaar", nomineeAadharDigits)'), 'Must append nomineeAadhaar alias');
    assert.ok(addContent.includes('apiFormData.append("nomineeMobile", nomineeMobileDigits)'), 'Must append nomineeMobile');
    assert.ok(addContent.includes('apiFormData.append("nominee_mobile", nomineeMobileDigits)'), 'Must append nominee_mobile alias');
    assert.ok(addContent.includes('apiFormData.append("nomineePhone", nomineeMobileDigits)'), 'Must append nomineePhone alias');
  });

  console.log('\n2. Static Code Audit: General Applications Edit Page...');
  const editContent = fs.readFileSync(editPagePath, 'utf8');

  it('Edit Page: GeneralApplicationFormData & Form State includes nomineeAadhar and nomineeMobile', () => {
    assert.ok(editContent.includes('nomineeAadhar?: string;'), 'Must have nomineeAadhar in GeneralApplicationFormData');
    assert.ok(editContent.includes('nomineeMobile?: string;'), 'Must have nomineeMobile in GeneralApplicationFormData');
    assert.ok(editContent.includes('nomineeAadhar: "",'), 'Must initialize nomineeAadhar');
    assert.ok(editContent.includes('nomineeMobile: "",'), 'Must initialize nomineeMobile');
  });

  it('Edit Page: fetchAllData prefills nomineeAadhar and nomineeMobile from API record with full alias fallback', () => {
    assert.ok(editContent.includes('record.nomineeAadhar ||'), 'Prefill must check record.nomineeAadhar');
    assert.ok(editContent.includes('record.nomineeAadhaar ||'), 'Prefill must check record.nomineeAadhaar');
    assert.ok(editContent.includes('record.nominee_aadhar ||'), 'Prefill must check record.nominee_aadhar');
    assert.ok(editContent.includes('record.nomineeMobile ||'), 'Prefill must check record.nomineeMobile');
    assert.ok(editContent.includes('record.nominee_mobile ||'), 'Prefill must check record.nominee_mobile');
    assert.ok(editContent.includes('record.nomineePhone ||'), 'Prefill must check record.nomineePhone');
  });

  it('Edit Page: Validation enforces 12-digit Aadhaar and 10-digit Mobile rules', () => {
    assert.ok(editContent.includes('nomineeAadharDigits.length !== 12'), 'Edit must validate 12 digits for nominee Aadhaar');
    assert.ok(editContent.includes('nomineeMobileDigits.length !== 10'), 'Edit must validate 10 digits for nominee Mobile');
  });

  it('Edit Page: executeSubmit includes nomineeAadhar and nomineeMobile in buildEditFormData update payload', () => {
    assert.ok(editContent.includes('nomineeAadhar: nomineeAadharDigits'), 'Edit payload must include nomineeAadhar');
    assert.ok(editContent.includes('nomineeMobile: nomineeMobileDigits'), 'Edit payload must include nomineeMobile');
    assert.ok(editContent.includes('nominee_aadhar: nomineeAadharDigits'), 'Edit payload must include nominee_aadhar');
    assert.ok(editContent.includes('nominee_mobile: nomineeMobileDigits'), 'Edit payload must include nominee_mobile');
  });

  it('Edit Page: Nominee UI renders 4-column responsive grid with matching labels and placeholders', () => {
    assert.ok(editContent.includes('नॉमिनी का आधार नं. / Nominee Aadhaar Number'), 'Edit UI must render Nominee Aadhaar label');
    assert.ok(editContent.includes('12 अंकों का आधार दर्ज करें'), 'Edit UI must render Nominee Aadhaar placeholder');
    assert.ok(editContent.includes('नॉमिनी मोबाइल नं. / Nominee Mobile Number'), 'Edit UI must render Nominee Mobile label');
    assert.ok(editContent.includes('10 अंकों का मोबाइल दर्ज करें'), 'Edit UI must render Nominee Mobile placeholder');
  });

  console.log('\n3. Static Code Audit: lib/services.ts and PDF Integration...');
  const servicesContent = fs.readFileSync(servicesPath, 'utf8');
  const listContent = fs.readFileSync(listPagePath, 'utf8');
  const routeContent = fs.readFileSync(routePath, 'utf8');

  it('lib/services.ts: GeneralApplication interface declares nomineeAadhar and nomineeMobile', () => {
    assert.ok(servicesContent.includes('nomineeAadhar?: string | null;'), 'GeneralApplication must have nomineeAadhar');
    assert.ok(servicesContent.includes('nomineeMobile?: string | null;'), 'GeneralApplication must have nomineeMobile');
  });

  it('PDF Integration: fill-pdf-form route and list page mapToHindiFields map nominee fields exclusively from nominee source', () => {
    assert.ok(routeContent.includes("'nomineeAadhaar'"), 'Route must include nomineeAadhaar');
    assert.ok(routeContent.includes("'nomineeMobile'"), 'Route must include nomineeMobile');
    assert.ok(listContent.includes('नामिनी_का_आधार:'), 'List page mapToHindiFields must map नामिनी_का_आधार');
    assert.ok(listContent.includes('नामिनी_का_मोबाइल:'), 'List page mapToHindiFields must map नामिनी_का_मोबाइल');
    assert.ok(!listContent.includes('नामिनी_का_आधार: record.aadharNumber'), 'Must NEVER map nominee Aadhaar to applicant aadharNumber');
    assert.ok(!listContent.includes('नामिनी_का_मोबाइल: record.mobile'), 'Must NEVER map nominee Mobile to applicant mobile');
  });

  console.log('\n4. Functional Simulation: Form State & Validation Logic...');

  // Test simulation: Client validation logic
  const simulateValidation = (data) => {
    const mobileDigits = (data.mobile || '').replace(/\D/g, '');
    const aadharDigits = (data.aadharNumber || '').replace(/\D/g, '');

    if (mobileDigits.length !== 10) {
      return { valid: false, error: 'invalid_applicant_mobile' };
    }
    if (aadharDigits.length !== 12) {
      return { valid: false, error: 'invalid_applicant_aadhar' };
    }
    if (!data.selectedAgentId) {
      return { valid: false, error: 'missing_worker' };
    }

    if (data.nomineeAadhar && data.nomineeAadhar.trim()) {
      const nomineeAadharDigits = data.nomineeAadhar.replace(/\D/g, '');
      if (nomineeAadharDigits.length !== 12) {
        return { valid: false, error: 'invalid_nominee_aadhar' };
      }
    }

    if (data.nomineeMobile && data.nomineeMobile.trim()) {
      const nomineeMobileDigits = data.nomineeMobile.replace(/\D/g, '');
      if (nomineeMobileDigits.length !== 10) {
        return { valid: false, error: 'invalid_nominee_mobile' };
      }
    }

    return { valid: true };
  };

  it('Simulation: Valid full application with 12-digit nominee Aadhaar and 10-digit nominee Mobile passes', () => {
    const res = simulateValidation({
      mobile: '9876543210',
      aadharNumber: '890456789012',
      selectedAgentId: '1',
      nomineeAadhar: '123456789012',
      nomineeMobile: '9876543211',
    });
    assert.strictEqual(res.valid, true);
  });

  it('Simulation: Valid application with blank optional nominee fields passes', () => {
    const res = simulateValidation({
      mobile: '9876543210',
      aadharNumber: '890456789012',
      selectedAgentId: '1',
      nomineeAadhar: '',
      nomineeMobile: '',
    });
    assert.strictEqual(res.valid, true);
  });

  it('Simulation: Nominee Aadhaar with 11 digits is blocked', () => {
    const res = simulateValidation({
      mobile: '9876543210',
      aadharNumber: '890456789012',
      selectedAgentId: '1',
      nomineeAadhar: '12345678901',
      nomineeMobile: '9876543211',
    });
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'invalid_nominee_aadhar');
  });

  it('Simulation: Nominee Mobile with 9 digits is blocked', () => {
    const res = simulateValidation({
      mobile: '9876543210',
      aadharNumber: '890456789012',
      selectedAgentId: '1',
      nomineeAadhar: '123456789012',
      nomineeMobile: '987654321',
    });
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'invalid_nominee_mobile');
  });

  console.log('\n============================================================');
  console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('============================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
