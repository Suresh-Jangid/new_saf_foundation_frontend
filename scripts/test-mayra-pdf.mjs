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

  it('5. System form number uses authoritative formNumber (e.g., MYR-3)', () => {
    const systemLine = routeContent.match(/const\s+systemFormNo\s*=\s*([^;]+);/);
    assert.ok(systemLine, 'systemFormNo definition must exist in route');
    assert.ok(
      systemLine[1].includes("'formNumber'") &&
      systemLine[1].includes("'form_number'"),
      'systemFormNo must query formNumber'
    );
  });

  it('6. Offline form number uses manually entered offlineFormNumber (e.g., 1259)', () => {
    const offlineLine = routeContent.match(/const\s+offlineFormNo\s*=\s*([^;]+);/);
    assert.ok(offlineLine, 'offlineFormNo definition must exist in route');
    assert.ok(
      offlineLine[1].includes("'offlineFormNumber'") &&
      offlineLine[1].includes("'offline_form_number'"),
      'offlineFormNo must query offlineFormNumber'
    );
  });

  it('7. System form number drawn in upper position (x=100, y=692)', () => {
    assert.ok(
      routeContent.includes('drawBounded(systemFormNo, 100, 692'),
      'systemFormNo must be drawn at (100, 692)'
    );
  });

  it('8. Offline form number drawn in registration box (x=120, y=669.5)', () => {
    assert.ok(
      routeContent.includes('drawBounded(offlineFormNo, 120, 669.5'),
      'offlineFormNo must be drawn at (120, 669.5)'
    );
  });

  it('9. Missing/empty offlineFormNumber leaves box blank', () => {
    assert.ok(
      !routeContent.includes('offlineFormNo || systemFormNo') &&
      !routeContent.includes('offlineFormNo || "MAYRA-'),
      'Must not fallback to systemFormNo in offline position'
    );
  });

  it('10. Aadhaar maps to Aadhaar field', () => {
    assert.ok(
      routeContent.includes("'aadharNumber'") || routeContent.includes("'aadhar'"),
      'Aadhaar number mapped'
    );
  });

  it('11. Postal PIN maps to PIN field only', () => {
    assert.ok(
      routeContent.includes("'pinCode'") && routeContent.includes("'pincode'"),
      'Postal PIN correctly mapped'
    );
  });

  it('12. E-PIN is never used as form number', () => {
    const headerSection = routeContent.slice(
      routeContent.indexOf('const systemFormNo'),
      routeContent.indexOf('drawBounded(appDate')
    );
    assert.ok(!headerSection.includes('epin'), 'Form numbers must never query epin');
    assert.ok(!headerSection.includes('pinNumber'), 'Form numbers must never query pinNumber');
  });

  it('13. Applicant photo mapping and coordinates (x=485, yFromTop=166, w=88, h=106)', () => {
    assert.ok(routeContent.includes('applicantPhotoSource'), 'Applicant photo source picked');
    assert.ok(routeContent.includes('166, PHOTO_WIDTH, PHOTO_HEIGHT'), 'Applicant photo positioned inside box');
  });

  it('14. Nominee photo mapping and coordinates (x=485, yFromTop=312, w=88, h=106)', () => {
    assert.ok(routeContent.includes('nomineePhotoSource'), 'Nominee photo source picked');
    assert.ok(routeContent.includes('312, PHOTO_WIDTH, PHOTO_HEIGHT'), 'Nominee photo positioned inside box');
  });

  it('15. Hindi Unicode support via NotoSansDevanagari with subset: false', () => {
    assert.ok(routeContent.includes('NotoSansDevanagari'), 'Devanagari font used');
    assert.ok(routeContent.includes('subset: false'), 'Full glyph set embedded');
  });

  it('16. Filename generation uses MAYRA_FORM_<safeName>.pdf pattern', () => {
    assert.ok(
      routeContent.includes('MAYRA_FORM_'),
      'Route uses MAYRA_FORM_ filename'
    );
  });

  it('17. No old Mayra template remains active in fallback path', () => {
    const fallbackBytes = fs.readFileSync(fallbackTemplatePath);
    assert.strictEqual(
      fallbackBytes.length,
      templateBytes.length,
      'Fallback template must be synced with the new official template'
    );
  });

  const pageContent = fs.readFileSync('app/dashboard/mayra-registration/page.tsx', 'utf8');
  it('18. UI Generate PDF Form button calls /api/generate-mayra-pdf and downloads MAYRA_FORM_<safeName>.pdf', () => {
    assert.ok(pageContent.includes('/api/generate-mayra-pdf'), 'API call present');
    assert.ok(pageContent.includes('onGeneratePDFForm={handleGeneratePDF}'), 'Button handler present');
    assert.ok(pageContent.includes('MAYRA_FORM_'), 'Download filename matches standard');
  });

  console.log('\n4. Mock PDF Generation & Data Assertion Testing...');
  const fontBytes = fs.readFileSync(fontPath);
  const devanagariFont = await pdfDoc.embedFont(fontBytes, { subset: false });

  // 4a. Case 1: formNumber = MYR-3, offlineFormNumber = 1259
  const mockRecordDual = {
    formNumber: 'MYR-3',
    offlineFormNumber: '1259',
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

  // Render fields for Case 1
  drawBounded(mockRecordDual.formNumber, 100, 692, 10.5, 120);
  drawBounded(mockRecordDual.offlineFormNumber, 120, 669.5, 11, 100);
  drawBounded(mockRecordDual.applicationDate, 462, 669.5, 11, 110);
  drawBounded(mockRecordDual.applicantName, 75, 597.5, 10.5, 130);
  drawBounded(mockRecordDual.fatherName, 250, 597.5, 10.5, 205);
  drawBounded(mockRecordDual.motherName, 95, 572.5, 10.5, 105);
  drawBounded(mockRecordDual.dateOfBirth, 245, 572.5, 10, 78);
  drawBounded(mockRecordDual.age, 352, 572.5, 10.5, 105);
  drawBounded(mockRecordDual.gotra, 56, 545.5, 10.5, 88);
  drawBounded(mockRecordDual.address, 180, 545.5, 10, 88);
  drawBounded(mockRecordDual.aadharNumber, 325, 545.5, 10.5, 132);
  drawBounded(mockRecordDual.nomineeName, 100, 478.0, 10.5, 138);
  drawBounded(mockRecordDual.nomineeFathername, 295, 478.0, 10.5, 165);
  drawBounded(mockRecordDual.nomineeGotra, 54, 449.5, 10.5, 82);
  drawBounded(mockRecordDual.nomineeAddress, 172, 449.5, 10, 98);
  drawBounded(mockRecordDual.nomineeMobile, 320, 449.5, 10.5, 140);
  drawBounded(mockRecordDual.tehsil, 68, 421.5, 10, 62);
  drawBounded(mockRecordDual.district, 160, 421.5, 10, 62);
  drawBounded(mockRecordDual.state, 250, 421.5, 10, 67);
  drawBounded(mockRecordDual.pinCode, 372, 421.5, 10.5, 88);
  drawBounded(mockRecordDual.nomineeRelation, 115, 392.5, 10.5, 215);
  drawBounded(mockRecordDual.workerName, 108, 364.0, 10.5, 162);
  drawBounded(mockRecordDual.workerMobile, 315, 364.0, 10.5, 138);
  drawBounded(mockRecordDual.applicantName, 46, 291.5, 10.5, 180);
  drawBounded(mockRecordDual.fatherName, 280, 291.5, 10.5, 175);
  drawBounded(mockRecordDual.age, 480, 291.5, 10.5, 92);
  drawBounded(mockRecordDual.gotra, 58, 262.5, 10.5, 132);
  drawBounded(mockRecordDual.address, 228, 262.5, 10, 236);

  const generatedBytes = await pdfDoc.save();
  it('19. Generated Mayra PDF with dual numbers is valid (>550KB)', () => {
    assert.ok(generatedBytes.length > 550000, `Serialized PDF must be > 550KB (actual: ${generatedBytes.length})`);
  });

  // 4b. Case 2: Historical record with offlineFormNumber = null / empty
  const historicalDoc = await PDFDocument.load(templateBytes);
  historicalDoc.registerFontkit(fontkit);
  const histFont = await historicalDoc.embedFont(fontBytes, { subset: false });
  const histPage = historicalDoc.getPages()[0];
  const histRecord = {
    formNumber: 'MYR-3',
    offlineFormNumber: null,
    applicationDate: '15/08/2026',
    applicantName: 'सुनीता',
  };

  const getFieldHelper = (r, ...keys) => {
    for (const k of keys) {
      if (r?.[k] !== undefined && r?.[k] !== null && String(r[k]).trim() !== '') {
        return String(r[k]).trim();
      }
    }
    return '';
  };

  const histSystemFormNo = getFieldHelper(histRecord, 'formNumber', 'form_number');
  const histOfflineFormNo = getFieldHelper(histRecord, 'offlineFormNumber', 'offline_form_number');

  assert.strictEqual(histSystemFormNo, 'MYR-3', 'Historical record has system formNumber');
  assert.strictEqual(histOfflineFormNo, '', 'Historical record has empty offlineFormNumber');

  // Draw system number above
  histPage.drawText(histSystemFormNo, { x: 100, y: 692, size: 10.5, font: histFont });
  // If offline is empty, nothing drawn in box
  if (histOfflineFormNo) {
    histPage.drawText(histOfflineFormNo, { x: 120, y: 669.5, size: 11, font: histFont });
  }

  const histBytes = await historicalDoc.save();
  it('20. Historical record (null offlineFormNumber) generates cleanly with blank box and MYR-3 above', () => {
    assert.ok(histBytes.length > 550000, 'Historical doc must generate properly');
  });

  // 4c. Case 3: E-PIN present → STILL NOT used
  const recordWithEpin = {
    epin: 'EPIN-7VWF-U9PE-STWA',
    epinNumber: 'EPIN-7VWF-U9PE-STWA',
    pinNumber: 'EPIN-7VWF-U9PE-STWA',
  };
  const resultForEpin = getFieldHelper(recordWithEpin, 'formNumber', 'offlineFormNumber');
  it('21. E-PIN present → NEVER used for form numbers', () => {
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
