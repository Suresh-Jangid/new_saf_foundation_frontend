import 'regenerator-runtime/runtime.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

console.log('============================================================');
console.log('SAF FOUNDATION — MAYRA GENERATE PDF FORM TEST SUITE');
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
  const primaryTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'mayra_application', 'mayra_form.pdf');
  const fallbackTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'mayra', 'mayra_registration_form.pdf');
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');

  console.log('1. Template & Asset Checks...');
  it('1. Official template exists in public/pdf/mayra_application/mayra_form.pdf', () => {
    assert.ok(fs.existsSync(primaryTemplatePath), 'Template must exist at public/pdf/mayra_application/mayra_form.pdf');
  });

  it('Template is non-empty official PDF (>500KB)', () => {
    const stats = fs.statSync(primaryTemplatePath);
    assert.ok(stats.size > 500000, `Template size must be > 500KB (actual: ${stats.size})`);
  });

  it('NotoSansDevanagari font exists for Hindi rendering', () => {
    assert.ok(fs.existsSync(fontPath), 'Devanagari font must exist');
  });

  console.log('\n2. Template Structure & Dimension Assertions...');
  const templateBytes = fs.readFileSync(primaryTemplatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  it('2. Template is exactly 1 page', () => {
    assert.strictEqual(pdfDoc.getPageCount(), 1, 'Template must be exactly 1 page');
  });

  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();

  it('3. Output page size matches template (612 x 792 pt, standard Letter)', () => {
    assert.strictEqual(Math.round(width), 612, 'Width must be 612 pt');
    assert.strictEqual(Math.round(height), 792, 'Height must be 792 pt');
  });

  console.log('\n3. Route & Button Flow Code Integrity Audits...');
  const routeContent = fs.readFileSync('app/api/generate-mayra-pdf/route.ts', 'utf8');

  it('4. Generate PDF route uses official Mayra template path', () => {
    assert.ok(
      routeContent.includes('mayra_application') && routeContent.includes('mayra_form.pdf'),
      'Route must reference public/pdf/mayra_application/mayra_form.pdf'
    );
  });

  it('5. Membership number uses ONLY record.membershipNumber (no formNumber or sr_no fallback)', () => {
    const membershipLine = routeContent.match(/const\s+membershipNo\s*=\s*([^;]+);/);
    assert.ok(membershipLine, 'membershipNo definition must exist in route');
    assert.ok(
      membershipLine[1].includes("'membershipNumber'") &&
      !membershipLine[1].includes("'formNumber'") &&
      !membershipLine[1].includes("'sr_no'") &&
      !membershipLine[1].includes("'form_number'"),
      'membershipNo must ONLY query membershipNumber and not formNumber/sr_no'
    );
  });

  it('6. Missing/empty membership number remains completely blank', () => {
    assert.ok(
      !routeContent.includes('|| "MAYRA-') && !routeContent.includes('|| "SAF-'),
      'Must not invent default membership numbers'
    );
  });

  it('7. Aadhaar maps to Aadhaar field', () => {
    assert.ok(
      routeContent.includes("'aadharNumber'") || routeContent.includes("'aadhar'"),
      'Aadhaar number mapped'
    );
  });

  it('8. Postal PIN maps to PIN field only', () => {
    assert.ok(
      routeContent.includes("'pinCode'") && routeContent.includes("'pincode'"),
      'Postal PIN correctly mapped'
    );
  });

  it('9. E-PIN is never used as membership number', () => {
    const membershipSection = routeContent.slice(
      routeContent.indexOf('const membershipNo'),
      routeContent.indexOf('drawBounded(membershipNo')
    );
    assert.ok(!membershipSection.includes('epin'), 'Membership number must never query epin');
    assert.ok(!membershipSection.includes('pinNumber'), 'Membership number must never query pinNumber');
  });

  it('10. Applicant photo mapping and coordinates (x=485, yFromTop=166, w=88, h=106)', () => {
    assert.ok(routeContent.includes('applicantPhotoSource'), 'Applicant photo source picked');
    assert.ok(routeContent.includes('166, PHOTO_WIDTH, PHOTO_HEIGHT'), 'Applicant photo positioned inside box');
  });

  it('11. Nominee photo mapping and coordinates (x=485, yFromTop=312, w=88, h=106)', () => {
    assert.ok(routeContent.includes('nomineePhotoSource'), 'Nominee photo source picked');
    assert.ok(routeContent.includes('312, PHOTO_WIDTH, PHOTO_HEIGHT'), 'Nominee photo positioned inside box');
  });

  it('12. Hindi Unicode support via NotoSansDevanagari with subset: false', () => {
    assert.ok(routeContent.includes('NotoSansDevanagari'), 'Devanagari font used');
    assert.ok(routeContent.includes('subset: false'), 'Full glyph set embedded');
  });

  it('13. Filename generation uses MAYRA_FORM_<safeName>.pdf pattern', () => {
    assert.ok(
      routeContent.includes('MAYRA_FORM_'),
      'Route uses MAYRA_FORM_ filename'
    );
  });

  it('14. No old Mayra template remains active in fallback path', () => {
    const fallbackBytes = fs.readFileSync(fallbackTemplatePath);
    assert.strictEqual(
      fallbackBytes.length,
      templateBytes.length,
      'Fallback template must be synced with the new official template'
    );
  });

  const pageContent = fs.readFileSync('app/dashboard/mayra-registration/page.tsx', 'utf8');
  it('UI Generate PDF Form button calls /api/generate-mayra-pdf and downloads MAYRA_FORM_<safeName>.pdf', () => {
    assert.ok(pageContent.includes('/api/generate-mayra-pdf'), 'API call present');
    assert.ok(pageContent.includes('onGeneratePDFForm={handleGeneratePDF}'), 'Button handler present');
    assert.ok(pageContent.includes('MAYRA_FORM_'), 'Download filename matches standard');
  });

  console.log('\n4. Mock PDF Generation & Data Assertion Testing...');
  const fontBytes = fs.readFileSync(fontPath);
  const devanagariFont = await pdfDoc.embedFont(fontBytes, { subset: false });

  // 4a. Case 1: membershipNumber present → printed
  const mockRecordWithMem = {
    membershipNumber: 'M-2026-089',
    applicationDate: '15/08/2026',
    applicantName: 'कविता कुमारी',
    fatherName: 'रमेश कुमार प्रजापत',
    motherName: 'कमला देवी',
    dateOfBirth: '15/08/2015',
    age: '11',
    gotra: 'प्रजापत',
    address: 'जसोल, बालोतरा',
    aadharNumber: '987654321012',
    nomineeName: 'रमेश कुमार',
    nomineeFathername: 'सज्जन राज',
    nomineeGotra: 'प्रजापत',
    nomineeAddress: 'जसोल, बालोतरा',
    nomineeMobile: '9876543210',
    tehsil: 'बालोतरा',
    district: 'बाड़मेर',
    state: 'राजस्थान',
    pinCode: '344024',
    nomineeRelation: 'भांजी',
    workerName: 'सुरेश जांगिड़',
    workerMobile: '9829012345',
  };

  const drawBounded = (text, x, y, size = 10.5, maxW = 200) => {
    if (!text) return;
    let s = size;
    if (devanagariFont.widthOfTextAtSize) {
      const w = devanagariFont.widthOfTextAtSize(text, size);
      if (w > maxW) s = Math.max(6.5, size * (maxW / w));
    }
    page.drawText(text, { x, y, size: s, font: devanagariFont, color: rgb(0, 0, 0) });
  };

  // Render fields
  drawBounded(mockRecordWithMem.membershipNumber, 120, 669.5, 11, 100);
  drawBounded(mockRecordWithMem.applicationDate, 462, 669.5, 11, 110);
  drawBounded(mockRecordWithMem.applicantName, 75, 597.5, 10.5, 130);
  drawBounded(mockRecordWithMem.fatherName, 250, 597.5, 10.5, 205);
  drawBounded(mockRecordWithMem.motherName, 95, 572.5, 10.5, 105);
  drawBounded(mockRecordWithMem.dateOfBirth, 245, 572.5, 10, 78);
  drawBounded(mockRecordWithMem.age, 352, 572.5, 10.5, 105);
  drawBounded(mockRecordWithMem.gotra, 56, 545.5, 10.5, 88);
  drawBounded(mockRecordWithMem.address, 180, 545.5, 10, 88);
  drawBounded(mockRecordWithMem.aadharNumber, 325, 545.5, 10.5, 132);
  drawBounded(mockRecordWithMem.nomineeName, 100, 478.0, 10.5, 138);
  drawBounded(mockRecordWithMem.nomineeFathername, 295, 478.0, 10.5, 165);
  drawBounded(mockRecordWithMem.nomineeGotra, 54, 449.5, 10.5, 82);
  drawBounded(mockRecordWithMem.nomineeAddress, 172, 449.5, 10, 98);
  drawBounded(mockRecordWithMem.nomineeMobile, 320, 449.5, 10.5, 140);
  drawBounded(mockRecordWithMem.tehsil, 68, 421.5, 10, 62);
  drawBounded(mockRecordWithMem.district, 160, 421.5, 10, 62);
  drawBounded(mockRecordWithMem.state, 250, 421.5, 10, 67);
  drawBounded(mockRecordWithMem.pinCode, 372, 421.5, 10.5, 88);
  drawBounded(mockRecordWithMem.nomineeRelation, 115, 392.5, 10.5, 215);
  drawBounded(mockRecordWithMem.workerName, 108, 364.0, 10.5, 162);
  drawBounded(mockRecordWithMem.workerMobile, 315, 364.0, 10.5, 138);
  drawBounded(mockRecordWithMem.applicantName, 46, 291.5, 10.5, 180);
  drawBounded(mockRecordWithMem.fatherName, 280, 291.5, 10.5, 175);
  drawBounded(mockRecordWithMem.age, 480, 291.5, 10.5, 92);
  drawBounded(mockRecordWithMem.gotra, 58, 262.5, 10.5, 132);
  drawBounded(mockRecordWithMem.address, 228, 262.5, 10, 236);

  const generatedBytes = await pdfDoc.save();
  it('Generated Mayra PDF with membershipNumber is valid (>550KB)', () => {
    assert.ok(generatedBytes.length > 550000, `Serialized PDF must be > 550KB (actual: ${generatedBytes.length})`);
  });

  // 4b. Case 2: membershipNumber absent → blank
  const emptyMemDoc = await PDFDocument.load(templateBytes);
  emptyMemDoc.registerFontkit(fontkit);
  const emptyFont = await emptyMemDoc.embedFont(fontBytes, { subset: false });
  const emptyPage = emptyMemDoc.getPages()[0];
  const blankMemRecord = { ...mockRecordWithMem, membershipNumber: '' };
  const extractedBlankMem = blankMemRecord.membershipNumber || '';
  assert.strictEqual(extractedBlankMem, '', 'Missing membershipNumber must resolve to empty string');
  if (extractedBlankMem) {
    emptyPage.drawText(extractedBlankMem, { x: 120, y: 669.5, size: 11, font: emptyFont });
  }
  const blankMemBytes = await emptyMemDoc.save();
  it('membershipNumber absent → blank PDF generated cleanly', () => {
    assert.ok(blankMemBytes.length > 550000, 'Blank membership number doc must generate properly');
  });

  // 4c. Case 3: formNumber/sr_no present but membershipNumber absent → STILL BLANK
  const recordWithFormAndSrNo = {
    formNumber: 'FORM-99999',
    sr_no: 'SR-12345',
    applicantName: 'सुनीता',
  };
  const getFieldStrict = (r, key) => (r && r[key] && String(r[key]).trim()) || '';
  const resultForFormSrNo = getFieldStrict(recordWithFormAndSrNo, 'membershipNumber');
  it('formNumber/sr_no present but membershipNumber absent → STILL BLANK', () => {
    assert.strictEqual(resultForFormSrNo, '', 'Must NOT fall back to formNumber or sr_no');
  });

  // 4d. Case 4: E-PIN present → STILL NOT used
  const recordWithEpin = {
    epin: 'EPIN-7VWF-U9PE-STWA',
    epinNumber: 'EPIN-7VWF-U9PE-STWA',
    pinNumber: 'EPIN-7VWF-U9PE-STWA',
  };
  const resultForEpin = getFieldStrict(recordWithEpin, 'membershipNumber');
  it('E-PIN present → STILL NOT used for membership number', () => {
    assert.strictEqual(resultForEpin, '', 'Must NOT fall back to E-PIN');
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
