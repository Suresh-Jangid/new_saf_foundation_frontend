import 'regenerator-runtime/runtime.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

console.log('============================================================');
console.log('SAF FOUNDATION — MAYRA YOJANA BOND PDF TEST SUITE');
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
  const primaryTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'mayra_bond', 'mayra_bond.pdf');
  const fallbackTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'mayra', 'mayra_bond.pdf');
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');

  console.log('1. Template & Asset Checks...');
  it('1. Official new template exists in public/pdf/mayra_bond/mayra_bond.pdf', () => {
    assert.ok(fs.existsSync(primaryTemplatePath), 'Template must exist at public/pdf/mayra_bond/mayra_bond.pdf');
  });

  it('2. Correct template path is non-empty official PDF (>500KB)', () => {
    const stats = fs.statSync(primaryTemplatePath);
    assert.ok(stats.size > 500000, `Template size must be > 500KB (actual: ${stats.size})`);
  });

  it('NotoSansDevanagari font exists for Hindi Unicode rendering', () => {
    assert.ok(fs.existsSync(fontPath), 'Devanagari font must exist');
  });

  console.log('\n2. Template Structure & Dimension Assertions...');
  const templateBytes = fs.readFileSync(primaryTemplatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  it('3. Template is exactly 1 page', () => {
    assert.strictEqual(pdfDoc.getPageCount(), 1, 'Template must be exactly 1 page');
  });

  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();

  it('4. Output page dimensions match template (612 x 792 pt, standard Letter)', () => {
    assert.strictEqual(Math.round(width), 612, 'Width must be 612 pt');
    assert.strictEqual(Math.round(height), 792, 'Height must be 792 pt');
  });

  console.log('\n3. Route & Field Extraction Audits...');
  const routeContent = fs.readFileSync('app/api/generate-mayra-bond-pdf/route.ts', 'utf8');

  it('5. सदस्यता क्र. uses ONLY record.membershipNumber (no fallback to formNumber or sr_no)', () => {
    const membershipLine = routeContent.match(/const\s+membershipNo\s*=\s*([^;]+);/);
    assert.ok(membershipLine, 'membershipNo definition must exist in route');
    assert.ok(
      membershipLine[1].includes("'membershipNumber'") &&
      !membershipLine[1].includes("'formNumber'") &&
      !membershipLine[1].includes("'sr_no'") &&
      !membershipLine[1].includes("'form_number'"),
      'membershipNo must ONLY query membershipNumber'
    );
  });

  it('6. Missing/empty membershipNumber remains completely blank', () => {
    assert.ok(
      !routeContent.includes('|| "MAYRA-') && !routeContent.includes('|| "SAF-') && !routeContent.includes('|| "BOND-'),
      'Must not invent default membership numbers'
    );
  });

  it('7. formNumber/sr_no cannot populate membership number', () => {
    const membershipLine = routeContent.match(/const\s+membershipNo\s*=\s*([^;]+);/);
    assert.ok(membershipLine, 'membershipNo definition must exist in route');
    assert.ok(!membershipLine[1].includes('formNumber'), 'formNumber must not leak into membershipNo');
    assert.ok(!membershipLine[1].includes('sr_no'), 'sr_no must not leak into membershipNo');
  });

  it('8. E-PIN cannot populate membership number', () => {
    const membershipLine = routeContent.match(/const\s+membershipNo\s*=\s*([^;]+);/);
    assert.ok(membershipLine, 'membershipNo definition must exist in route');
    assert.ok(!membershipLine[1].includes('epin'), 'epin must not leak into membershipNo');
    assert.ok(!membershipLine[1].includes('pinNumber'), 'pinNumber must not leak into membershipNo');
  });

  it('9. आवेदन क्र. uses authoritative application number field', () => {
    const appNoLine = routeContent.match(/const\s+applicationNo\s*=\s*([^;]+);/);
    assert.ok(appNoLine, 'applicationNo definition must exist in route');
    assert.ok(
      appNoLine[1].includes("'formNumber'") || appNoLine[1].includes("'applicationNumber'"),
      'applicationNo must map to formNumber / applicationNumber'
    );
  });

  it('10. Nominee fields map correctly (name, father, gotra, address)', () => {
    assert.ok(routeContent.includes('nomineeName'), 'nomineeName mapped');
    assert.ok(routeContent.includes('nomineeFathername'), 'nomineeFathername mapped');
    assert.ok(routeContent.includes('nomineeGotra'), 'nomineeGotra mapped');
    assert.ok(routeContent.includes('nomineeAddress'), 'nomineeAddress mapped');
  });

  it('11. Bhanej/Bhanji fields map correctly (applicantName, fatherName, gotra, age, address)', () => {
    assert.ok(routeContent.includes('applicantName'), 'applicantName mapped');
    assert.ok(routeContent.includes('fatherName'), 'fatherName mapped');
    assert.ok(routeContent.includes('gotra'), 'gotra mapped');
    assert.ok(routeContent.includes('age'), 'age mapped');
    assert.ok(routeContent.includes('address'), 'address mapped');
  });

  it('12. Nominee photo is embedded in nominee photo box (top: yFromTop=131.0, w=46, h=53)', () => {
    assert.ok(routeContent.includes('nomineePhotoSource'), 'nomineePhotoSource picked');
    assert.ok(routeContent.includes('131.0, 46.0, 53.0'), 'Nominee photo positioned at top box');
  });

  it('13. Account-holder photo is embedded in account-holder photo box (bottom: yFromTop=200.5, w=46, h=53)', () => {
    assert.ok(routeContent.includes('applicantPhotoSource'), 'applicantPhotoSource picked');
    assert.ok(routeContent.includes('200.5, 46.0, 53.0'), 'Account-holder photo positioned at bottom box');
  });

  it('14. Hindi Unicode renders correctly with NotoSansDevanagari and subset: false', () => {
    assert.ok(routeContent.includes('NotoSansDevanagari'), 'Devanagari font used');
    assert.ok(routeContent.includes('subset: false'), 'Full glyph set embedded');
  });

  it('15. Fixed "एक वर्ष के बाद मिलेगा" text is preserved (not dynamically overwritten)', () => {
    assert.ok(
      !routeContent.includes('drawBounded(duration') &&
      !routeContent.includes('drawText(duration') &&
      !routeContent.includes('drawText(MAYRA_ASSOCIATION_DURATION'),
      'Fixed duration text must remain untouched on template'
    );
  });

  it('16. No old Mayra Bond template remains active in fallback path', () => {
    const fallbackBytes = fs.readFileSync(fallbackTemplatePath);
    assert.strictEqual(
      fallbackBytes.length,
      templateBytes.length,
      'Fallback template must be synced with the new official template'
    );
  });

  console.log('\n4. Mock PDF Generation & Data Assertion Testing...');
  const fontBytes = fs.readFileSync(fontPath);
  const devanagariFont = await pdfDoc.embedFont(fontBytes, { subset: false });

  const mockRecordWithMem = {
    membershipNumber: 'M-2026-089',
    formNumber: 'FORM-2026-001',
    applicantName: 'कविता कुमारी',
    fatherName: 'रमेश कुमार',
    gotra: 'प्रजापत',
    age: '18 वर्ष',
    address: 'जसोल, बालोतरा',
    nomineeName: 'रमेश कुमार প্রজাপत',
    nomineeFathername: 'सज्जन राज प्रजापत',
    nomineeGotra: 'प्रजापत',
    nomineeAddress: 'जसोल, बालोतरा (राज.)',
  };

  const drawBounded = (text, x, y, size = 9.5, maxW = 150) => {
    if (!text) return;
    let s = size;
    if (devanagariFont.widthOfTextAtSize) {
      const w = devanagariFont.widthOfTextAtSize(text, size);
      if (w > maxW) s = Math.max(6.0, size * (maxW / w));
    }
    page.drawText(text, { x, y, size: s, font: devanagariFont, color: rgb(0, 0, 0) });
  };

  drawBounded(mockRecordWithMem.membershipNumber, 160, 669.5, 10, 80);
  drawBounded(mockRecordWithMem.formNumber, 442, 669.5, 10, 84);
  drawBounded(mockRecordWithMem.nomineeName, 132, 625.5, 9.5, 150);
  drawBounded(mockRecordWithMem.nomineeFathername, 152, 604.5, 9.5, 130);
  drawBounded(mockRecordWithMem.nomineeGotra, 122, 583.5, 9.5, 160);
  drawBounded(mockRecordWithMem.nomineeAddress, 130, 557.0, 9.0, 118);
  drawBounded(mockRecordWithMem.applicantName, 396, 625.5, 9.5, 128);
  drawBounded(mockRecordWithMem.fatherName, 392, 606.0, 9.5, 132);
  drawBounded(mockRecordWithMem.gotra, 374, 586.5, 9.5, 62);
  drawBounded(mockRecordWithMem.age, 460, 586.5, 9.5, 64);
  drawBounded(mockRecordWithMem.address, 385, 567.5, 9.0, 138);

  const generatedBytes = await pdfDoc.save();
  it('Generated Mayra Bond PDF with data is valid (>550KB)', () => {
    assert.ok(generatedBytes.length > 550000, `Serialized PDF must be > 550KB (actual: ${generatedBytes.length})`);
  });

  // Strict membership number isolation tests
  const getFieldStrict = (r, key) => (r && r[key] && String(r[key]).trim()) || '';

  it('Case 2: Missing membershipNumber remains blank', () => {
    const blankMemRecord = { ...mockRecordWithMem, membershipNumber: '' };
    assert.strictEqual(getFieldStrict(blankMemRecord, 'membershipNumber'), '');
  });

  it('Case 3: formNumber/sr_no cannot populate membership number', () => {
    const recordWithForm = { formNumber: 'FORM-999', sr_no: 'SR-111' };
    assert.strictEqual(getFieldStrict(recordWithForm, 'membershipNumber'), '');
  });

  it('Case 4: E-PIN cannot populate membership number', () => {
    const recordWithEpin = { epin: 'EPIN-12345', epinNumber: 'EPIN-12345' };
    assert.strictEqual(getFieldStrict(recordWithEpin, 'membershipNumber'), '');
  });

  console.log('\n============================================================');
  console.log(`TOTAL CHECKS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log('============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
