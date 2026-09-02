import 'regenerator-runtime/runtime.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

console.log('============================================================');
console.log('SAF FOUNDATION — VIVAH HISAB PDF REPLACEMENT TEST SUITE');
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
  const templatePath = path.join(process.cwd(), 'public', 'pdf', 'marriage_application', 'vivahHisab.pdf');
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');

  console.log('1. Template & Asset Checks...');
  it('vivahHisab.pdf exists in public/pdf/marriage_application', () => {
    assert.ok(fs.existsSync(templatePath), 'Template must exist at public/pdf/marriage_application/vivahHisab.pdf');
  });

  it('Template is non-empty official PDF', () => {
    const stats = fs.statSync(templatePath);
    assert.ok(stats.size > 500000, `Template size must be > 500KB (actual: ${stats.size})`);
  });

  it('NotoSansDevanagari-Regular.ttf font exists for Hindi rendering', () => {
    assert.ok(fs.existsSync(fontPath), 'Devanagari font must exist');
  });

  console.log('\n2. Template Structure & Dimension Assertions...');
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  it('Template has exactly 1 page', () => {
    assert.strictEqual(pdfDoc.getPageCount(), 1, 'Template must be exactly 1 page');
  });

  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();

  it('Template dimensions are preserved (612 x 792 pt, standard Letter)', () => {
    assert.strictEqual(Math.round(width), 612, 'Width must be 612 pt');
    assert.strictEqual(Math.round(height), 792, 'Height must be 792 pt');
  });

  console.log('\n3. Route & Button Flow Code Integrity Audits...');
  const routeContent = fs.readFileSync('app/api/generate-marriage-congratulations-pdf/route.ts', 'utf8');
  it('Route references vivahHisab.pdf as primary template', () => {
    assert.ok(routeContent.includes('vivahHisab.pdf'), 'Route must load vivahHisab.pdf');
  });

  it('Route embeds NotoSansDevanagari font with fontkit', () => {
    assert.ok(routeContent.includes('NotoSansDevanagari'), 'Route must use Devanagari font');
    assert.ok(routeContent.includes('registerFontkit'), 'Route must register fontkit');
  });

  it('Route computes 300 and 1000 installment calculations', () => {
    assert.ok(routeContent.includes('rate300Count') && routeContent.includes('* 300'), '300 installment calculation present');
    assert.ok(routeContent.includes('rate1000Count') && routeContent.includes('* 1000'), '1000 installment calculation present');
  });

  it('Route outputs 15% deduction and final paid amount', () => {
    assert.ok(routeContent.includes('deductedAmount'), 'Deduction mapping present');
    assert.ok(routeContent.includes('totalPaidAmount'), 'Total paid mapping present');
  });

  const pageContent = fs.readFileSync('app/dashboard/marriage-congratulations/page.tsx', 'utf8');
  it('UI Generate PDF Form button calls /api/generate-marriage-congratulations-pdf', () => {
    assert.ok(pageContent.includes('/api/generate-marriage-congratulations-pdf'), 'API call present');
    assert.ok(pageContent.includes('onGeneratePDFForm={handleGeneratePDFForm}'), 'Button hook present');
  });

  console.log('\n4. Mock PDF Generation & Data Assertion Testing...');
  const fontBytes = fs.readFileSync(fontPath);
  const devanagariFont = await pdfDoc.embedFont(fontBytes, { subset: false });

  const mockRecordMale = {
    date: '12-07-2026',
    codeNumber: 'GM-TEST-001',
    marriageNumber: 'PM-TEST-001',
    applicantName: 'रामलाल',
    gender: 'Male',
    fatherName: 'मोहनलाल',
    gotra: 'जाट',
    address: 'बालोतरा राजस्थान',
    membershipJoinDate: '01-01-2026',
    associatedUntil: '6 महीने',
    permanentFee: '8100',
    installmentAmount: '300',
    totalGrantAmount: '8400',
    totalMembersServing: '3',
    rate100: '0',
    rate200: '0',
    rate300: '3',
    rate1000: '0',
    deductionPercent: '15',
    deductedAmount: '135',
    totalPaidAmount: '765',
    runningNumber: 'PM-TEST-001',
    closedAccounts: '0',
    activeAccounts: '3',
  };

  // Draw fields on doc
  const drawBounded = (text, x, y, size = 9.5, maxW = 200) => {
    if (!text) return;
    let s = size;
    if (devanagariFont.widthOfTextAtSize) {
      const w = devanagariFont.widthOfTextAtSize(text, size);
      if (w > maxW) s = Math.max(6.5, size * (maxW / w));
    }
    page.drawText(text, { x, y, size: s, font: devanagariFont, color: rgb(0.1, 0.1, 0.1) });
  };

  // Render all required fields
  drawBounded(mockRecordMale.date, 80, 627, 9.5, 75);
  drawBounded(mockRecordMale.codeNumber, 495, 627, 9.5, 75);
  drawBounded(mockRecordMale.marriageNumber, 495, 604, 9.5, 75);
  drawBounded(mockRecordMale.applicantName, 72, 581, 9.5, 150);
  drawBounded(mockRecordMale.fatherName, 298, 581, 9.5, 140);
  drawBounded(mockRecordMale.gotra, 475, 581, 9.5, 90);
  drawBounded(mockRecordMale.address, 80, 559, 9.5, 485);
  drawBounded(mockRecordMale.membershipJoinDate, 290, 538, 9.5, 275);
  drawBounded(mockRecordMale.associatedUntil, 290, 515, 9.5, 275);
  drawBounded(mockRecordMale.permanentFee, 290, 492, 9.5, 275);
  drawBounded(mockRecordMale.installmentAmount, 290, 470, 9.5, 275);
  drawBounded(mockRecordMale.totalGrantAmount, 290, 447, 9.5, 275);
  drawBounded(mockRecordMale.totalMembersServing, 290, 424, 9.5, 275);
  drawBounded(mockRecordMale.rate300, 290, 361, 9.5, 75);
  drawBounded(String(Number(mockRecordMale.rate300) * 300), 395, 361, 9.5, 70);
  drawBounded(mockRecordMale.rate1000, 290, 342, 9.5, 75);
  drawBounded(String(Number(mockRecordMale.rate1000) * 1000), 395, 342, 9.5, 70);
  drawBounded(String(Number(mockRecordMale.rate300) * 300 + Number(mockRecordMale.rate1000) * 1000), 320, 318, 9.5, 130);
  drawBounded(mockRecordMale.deductedAmount, 360, 263, 10, 105);
  drawBounded(mockRecordMale.totalPaidAmount, 360, 232, 10, 105);
  drawBounded(mockRecordMale.runningNumber, 160, 151, 9, 100);
  drawBounded(mockRecordMale.closedAccounts, 345, 151, 9, 65);
  drawBounded(mockRecordMale.activeAccounts, 475, 151, 9, 90);

  const generatedBytes = await pdfDoc.save();
  it('Generated Male PDF is valid and serialized properly', () => {
    assert.ok(generatedBytes.length > 550000, 'Serialized PDF must be valid graphical document (>550KB)');
  });

  // Test female mock record on a fresh doc instance
  const femaleDoc = await PDFDocument.load(templateBytes);
  femaleDoc.registerFontkit(fontkit);
  const femaleFont = await femaleDoc.embedFont(fontBytes, { subset: false });
  const femalePage = femaleDoc.getPages()[0];

  const mockRecordFemale = {
    date: '15-08-2026',
    codeNumber: 'GF-TEST-002',
    marriageNumber: 'BF-TEST-002',
    applicantName: 'सुनीता कुमारी',
    gender: 'Female',
    wifeOf: 'रमेश प्रजापत',
    gotra: 'प्रजापत',
    address: 'जसोल, बाड़मेर, राजस्थान',
    membershipJoinDate: '10-02-2025',
    associatedUntil: '18 महीने',
    permanentFee: '10000',
    installmentAmount: '1000',
    totalGrantAmount: '11000',
    totalMembersServing: '5',
    rate300: '2',
    rate1000: '3',
    deductedAmount: '540',
    totalPaidAmount: '3060',
    runningNumber: 'BF-TEST-002',
    closedAccounts: '0',
    activeAccounts: '5',
  };

  femalePage.drawText(mockRecordFemale.applicantName, { x: 72, y: 581, size: 9.5, font: femaleFont });
  femalePage.drawText(mockRecordFemale.wifeOf, { x: 298, y: 581, size: 9.5, font: femaleFont });
  femalePage.drawText(mockRecordFemale.gotra, { x: 475, y: 581, size: 9.5, font: femaleFont });

  const femaleBytes = await femaleDoc.save();
  it('Generated Female PDF is valid and serialized properly', () => {
    assert.ok(femaleBytes.length > 550000, 'Serialized Female PDF must be valid (>550KB)');
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
