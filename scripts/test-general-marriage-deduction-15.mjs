import fs from 'fs';
import assert from 'assert';

console.log('============================================================');
console.log('SAF FOUNDATION — GENERAL MARRIAGE 15% DEDUCTION TEST SUITE');
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

// 1. Audit add/page.tsx
console.log('1. Auditing app/dashboard/marriage-congratulations/add/page.tsx...');
const addPage = fs.readFileSync('app/dashboard/marriage-congratulations/add/page.tsx', 'utf8').replace(/\r\n/g, '\n');

it('Initial formData state sets deductionPercent to "15"', () => {
  assert.ok(addPage.includes('deductionPercent: "15"'), 'Initial state must be 15');
  assert.ok(!addPage.includes('deductionPercent: "20"'), 'Initial state must NOT be 20');
});

it('Pre-fill deduction calculation uses ConfigService or 15 fallback', () => {
  assert.ok(
    addPage.includes('ConfigService.getDeductionPercentForScheme("general_marriage") || 15'),
    'Prefill must use 15 fallback'
  );
});

it('calculateTotals deduction uses ConfigService or 15 fallback', () => {
  assert.ok(
    addPage.includes('ConfigService.getDeductionPercentForScheme("general_marriage") ||\n      15'),
    'calculateTotals must use 15 fallback'
  );
});

it('Deduction dropdown UI has 15% option available', () => {
  assert.ok(addPage.includes('<option value="15">15%</option>'), '15% option must exist');
});

// 2. Audit lib/config-types.ts
console.log('\n2. Auditing lib/config-types.ts DEFAULT_DEDUCTIONS...');
const configTypes = fs.readFileSync('lib/config-types.ts', 'utf8').replace(/\r\n/g, '\n');

it('general_marriage deduction is set to percent: 15 in DEFAULT_DEDUCTIONS', () => {
  assert.ok(
    configTypes.includes('id: "ded-marriage", schemeId: "general_marriage", schemeName: "General Marriage", percent: 15'),
    'general_marriage default deduction must be 15%'
  );
});

it('Mayra scheme deduction is preserved at 20% (unrelated scheme)', () => {
  assert.ok(
    configTypes.includes('id: "ded-mayra", schemeId: "mayra", schemeName: "Mayra", percent: 20'),
    'Mayra deduction must remain 20%'
  );
});

it('Insurance Bima scheme deduction is preserved at 10% (unrelated scheme)', () => {
  assert.ok(
    configTypes.includes('id: "ded-insurance", schemeId: "insurance_bima", schemeName: "Insurance Bima", percent: 10'),
    'Insurance Bima deduction must remain 10%'
  );
});

// 3. Audit Historical Preservation
console.log('\n3. Auditing Historical Record Preservation...');
const editPage = fs.readFileSync('app/dashboard/marriage-congratulations/edit/[id]/page.tsx', 'utf8').replace(/\r\n/g, '\n');
const listPage = fs.readFileSync('app/dashboard/marriage-congratulations/page.tsx', 'utf8').replace(/\r\n/g, '\n');

it('Edit page preserves historical record.deductionPercent', () => {
  assert.ok(
    editPage.includes('deductionPercent: record.deductionPercent'),
    'Edit page must load existing record.deductionPercent'
  );
});

it('Table page displays historical record.deductionPercent dynamically', () => {
  assert.ok(
    listPage.includes('{ key: "deductionPercent", label: "कटौती %"'),
    'Table must display historical deduction percent'
  );
});

console.log('\n============================================================');
console.log(`TOTAL CHECKS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
console.log('============================================================\n');

if (failCount > 0) {
  process.exit(1);
}
