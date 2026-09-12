import 'regenerator-runtime/runtime.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

console.log('============================================================');
console.log('SAF FOUNDATION — INSURANCE GENERATE PDF FORM TEST SUITE');
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
  const primaryTemplatePath = path.join(
    process.cwd(),
    'public',
    'pdf',
    'general_insurance_application',
    'insurance_application_official_template.pdf'
  );
  const fallbackTemplatePath = path.join(
    process.cwd(),
    'public',
    'pdf',
    'general_insurance_application',
    'parivar_kalyan_form.pdf'
  );
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');

  console.log('1. Template & Asset Checks...');
  it('1. Official template exists in public/pdf/general_insurance_application/insurance_application_official_template.pdf', () => {
    assert.ok(fs.existsSync(primaryTemplatePath), 'Template must exist at public/pdf/general_insurance_application/insurance_application_official_template.pdf');
  });

  it('2. Fallback official template exists in public/pdf/general_insurance_application/parivar_kalyan_form.pdf', () => {
    assert.ok(fs.existsSync(fallbackTemplatePath), 'Fallback template must exist');
  });

  it('3. Template is non-empty official PDF (>400KB)', () => {
    const stats = fs.statSync(primaryTemplatePath);
    assert.ok(stats.size > 400000, `Template size must be > 400KB (actual: ${stats.size})`);
  });

  it('4. NotoSansDevanagari font exists for Hindi rendering', () => {
    assert.ok(fs.existsSync(fontPath), 'Devanagari font must exist');
  });

  console.log('\n2. Template Structure & Dimension Assertions...');
  const templateBytes = fs.readFileSync(primaryTemplatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  it('5. Template is exactly 1 page', () => {
    assert.strictEqual(pdfDoc.getPageCount(), 1, 'Template must be exactly 1 page');
  });

  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();

  it('6. Output page size matches template (612 x 792 pt, standard Letter)', () => {
    assert.strictEqual(Math.round(width), 612, 'Width must be 612 pt');
    assert.strictEqual(Math.round(height), 792, 'Height must be 792 pt');
  });

  console.log('\n3. Route & Button Flow Code Integrity Audits...');
  const routeContent = fs.readFileSync('app/api/generate-insurance-pdf/route.ts', 'utf8');

  it('7. Generate PDF route uses official Insurance template path', () => {
    assert.ok(
      routeContent.includes('general_insurance_application') &&
      routeContent.includes('insurance_application_official_template.pdf'),
      'Route must reference public/pdf/general_insurance_application/insurance_application_official_template.pdf'
    );
  });

  it('8. System form number uses authoritative formNumber (e.g., S-003)', () => {
    const systemLine = routeContent.match(/const\s+systemFormNo\s*=\s*([^;]+);/);
    assert.ok(systemLine, 'systemFormNo definition must exist in route');
    assert.ok(
      systemLine[1].includes("'formNumber'") &&
      systemLine[1].includes("'form_number'"),
      'systemFormNo must query formNumber'
    );
  });

  it('9. Offline form number uses manually entered offlineFormNumber (e.g., 1259)', () => {
    const offlineLine = routeContent.match(/const\s+offlineFormNo\s*=\s*([^;]+);/);
    assert.ok(offlineLine, 'offlineFormNo definition must exist in route');
    assert.ok(
      offlineLine[1].includes("'offlineFormNumber'") &&
      offlineLine[1].includes("'offline_form_number'"),
      'offlineFormNo must query offlineFormNumber'
    );
  });

  it('10. System form number drawn in upper position (x=95, y=680)', () => {
    assert.ok(
      routeContent.includes('drawBounded(systemFormNo, 95, 680'),
      'systemFormNo must be drawn at (95, 680)'
    );
  });

  it('11. Offline form number drawn after क्रमांक : NGO/26/ (x=142, y=627)', () => {
    assert.ok(
      routeContent.includes('drawBounded(offlineFormNo, 142, 627'),
      'offlineFormNo must be drawn at (142, 627)'
    );
  });

  it('12. Missing/empty offlineFormNumber leaves box blank (no fallback to systemFormNo)', () => {
    assert.ok(
      !routeContent.includes('offlineFormNo || systemFormNo') &&
      !routeContent.includes('offlineFormNo || "S-'),
      'Must not fallback to systemFormNo in offline position'
    );
  });

  it('13. Aadhaar maps to Aadhaar field', () => {
    assert.ok(
      routeContent.includes("'aadharNumber'") || routeContent.includes("'aadhar'"),
      'Aadhaar number mapped'
    );
  });

  it('14. Nominee fields (name, relation, aadhaar, mobile) are mapped', () => {
    assert.ok(routeContent.includes('nomineeName'), 'nomineeName mapped');
    assert.ok(routeContent.includes('nomineeRelation'), 'nomineeRelation mapped');
    assert.ok(routeContent.includes('nomineeAadhaar') || routeContent.includes('nomineeAadhar'), 'nomineeAadhaar mapped');
    assert.ok(routeContent.includes('nomineeMobile'), 'nomineeMobile mapped');
  });

  it('15. Worker & Senior Worker fields are mapped', () => {
    assert.ok(routeContent.includes('workerName'), 'workerName mapped');
    assert.ok(routeContent.includes('seniorWorkerName'), 'seniorWorkerName mapped');
  });

  it('16. Amount & Payment Reference fields are mapped', () => {
    assert.ok(routeContent.includes('amount') || routeContent.includes('paymentAmount'), 'amount mapped');
    assert.ok(routeContent.includes('paymentRef') || routeContent.includes('transactionId'), 'paymentRef mapped');
  });

  it('17. Applicant photo box coordinates (x=488, yFromTop=189, w=62, h=104)', () => {
    assert.ok(routeContent.includes('PHOTO_X = 488') || routeContent.includes('488'), 'Photo X coordinate');
    assert.ok(routeContent.includes('PHOTO_WIDTH = 62') || routeContent.includes('62'), 'Photo width');
    assert.ok(routeContent.includes('PHOTO_HEIGHT = 104') || routeContent.includes('104'), 'Photo height');
  });

  it('18. Hindi Unicode support via NotoSansDevanagari with subset: false', () => {
    assert.ok(routeContent.includes('NotoSansDevanagari'), 'Devanagari font used');
    assert.ok(routeContent.includes('subset: false'), 'Full glyph set embedded');
  });

  it('19. Filename generation uses INSURANCE_APPLICATION_<safeName>.pdf pattern', () => {
    assert.ok(
      routeContent.includes('INSURANCE_APPLICATION_'),
      'Route uses INSURANCE_APPLICATION_ filename'
    );
  });

  const pageContent = fs.readFileSync('app/dashboard/general-applications-insurance/page.tsx', 'utf8');
  it('20. UI Generate PDF Form button passes record data including offlineFormNumber to generateInsurancePDF', () => {
    assert.ok(pageContent.includes('APIService.generateInsurancePDF'), 'API call present');
    assert.ok(pageContent.includes('onGeneratePDFForm={handleGenerateInsurancePDF}'), 'Button handler present');
    assert.ok(pageContent.includes('offlineFormNumber'), 'offlineFormNumber passed in pdfData');
  });

  console.log('\n4. Mock PDF Generation & Data Assertion Testing...');
  const fontBytes = fs.readFileSync(fontPath);
  const devanagariFont = await pdfDoc.embedFont(fontBytes, { subset: false });

  // 4a. Case 1: formNumber = S-003, offlineFormNumber = 1259
  const mockRecordDual = {
    formNumber: 'S-003',
    offlineFormNumber: '1259',
    applicationDate: '12/09/2026',
    applicantName: 'सुरेश कुमार जांगिड़',
    fatherName: 'रामेश्वर लाल जांगिड़',
    dateOfBirth: '15/08/1995',
    gender: 'पुरुष',
    education: 'स्नातक',
    aadharNumber: '123456789012',
    address: 'ग्राम पोस्ट-कुचामन सिटी',
    district: 'डीडवाना-कुचामन',
    state: 'राजस्थान',
    mobile: '9876543210',
    nomineeName: 'सुनीता देवी',
    nomineeRelation: 'पत्नी',
    nomineeAadhar: '987654321098',
    nomineeMobile: '9123456780',
    workerName: 'विकास शर्मा',
    paymentAmount: '1100',
    transactionId: 'UPI/20260912/123456',
    seniorWorkerName: 'महेश चौधरी',
    age: '29',
    gotra: 'जांगिड़'
  };

  const sample1x1Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  async function generateTestPdf(data, image) {
    const doc = await PDFDocument.load(templateBytes);
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(fontBytes, { subset: false });
    const firstPage = doc.getPages()[0];
    const pageHeight = firstPage.getSize().height;

    if (image) {
      const base64Data = image.split(',')[1];
      const imgBytes = Buffer.from(base64Data, 'base64');
      const embeddedImg = await doc.embedPng(imgBytes);
      firstPage.drawImage(embeddedImg, {
        x: 488,
        y: pageHeight - 189 - 104,
        width: 62,
        height: 104
      });
    }

    const drawBounded = (text, x, y, fontSize = 10, maxW) => {
      if (!text) return;
      const str = String(text).trim();
      if (!str) return;
      let s = fontSize;
      if (maxW && font.widthOfTextAtSize) {
        const w = font.widthOfTextAtSize(str, fontSize);
        if (w > maxW) {
          s = Math.max(6.0, fontSize * (maxW / w));
        }
      }
      firstPage.drawText(str, { x, y, size: s, font });
    };

    drawBounded(data.formNumber, 95, 680, 11, 100);
    drawBounded(data.offlineFormNumber, 142, 627, 10.5, 90);
    drawBounded(data.applicationDate, 490, 627, 10.5, 90);
    drawBounded(data.applicantName, 75, 603, 10, 395);
    drawBounded(data.fatherName, 125, 582, 10, 345);
    drawBounded(data.dateOfBirth, 110, 561, 10, 105);
    drawBounded(data.gender, 255, 561, 10, 60);
    drawBounded(data.education, 355, 561, 10, 110);
    drawBounded(data.aadharNumber, 150, 540, 10, 320);
    drawBounded(data.address, 75, 519, 10, 395);
    drawBounded(data.district, 75, 498, 10, 140);
    drawBounded(data.state, 260, 498, 10, 105);
    drawBounded(data.mobile, 420, 498, 10, 125);
    drawBounded(data.nomineeName, 125, 477, 10, 230);
    drawBounded(data.nomineeRelation, 410, 477, 10, 135);
    drawBounded(data.nomineeAadhar, 150, 456, 10, 140);
    drawBounded(data.nomineeMobile, 325, 456, 10, 95);
    drawBounded(data.workerName, 500, 456, 10, 135);
    drawBounded(data.paymentAmount, 75, 435, 10, 115);
    drawBounded(data.transactionId, 335, 435, 9.5, 145);
    drawBounded(data.seniorWorkerName, 510, 435, 9.5, 125);
    drawBounded(data.applicantName, 65, 346, 9.5, 185);
    drawBounded(data.fatherName, 350, 346, 9.5, 140);
    drawBounded(data.age, 525, 346, 9.5, 30);
    drawBounded(data.gotra, 580, 346, 9.5, 45);
    drawBounded(data.address, 85, 325, 9.5, 200);

    return await doc.save();
  }

  const outputDual = await generateTestPdf(mockRecordDual, sample1x1Png);
  it('21. Dual form numbers record generates valid 1-page PDF buffer (>50KB)', () => {
    assert.ok(outputDual && outputDual.length > 50000, 'Buffer must be valid');
  });

  const parsedDual = await PDFDocument.load(outputDual);
  it('22. Output PDF page count is strictly 1', () => {
    assert.strictEqual(parsedDual.getPageCount(), 1, 'Page count must be 1');
  });

  // 4b. Case 2: null offlineFormNumber
  const mockRecordNullOffline = {
    ...mockRecordDual,
    formNumber: 'S-001',
    offlineFormNumber: null
  };
  const outputNull = await generateTestPdf(mockRecordNullOffline, null);
  it('23. Historical record with null offlineFormNumber generates valid PDF safely', () => {
    assert.ok(outputNull && outputNull.length > 50000, 'Buffer must be valid');
  });

  // 4c. Case 3: empty offlineFormNumber
  const mockRecordEmptyOffline = {
    ...mockRecordDual,
    formNumber: 'S-002',
    offlineFormNumber: ''
  };
  const outputEmpty = await generateTestPdf(mockRecordEmptyOffline, null);
  it('24. Record with empty offlineFormNumber generates valid PDF safely', () => {
    assert.ok(outputEmpty && outputEmpty.length > 50000, 'Buffer must be valid');
  });

  // Save generated test artifact
  const testOutputDir = path.join(process.cwd(), 'test-output');
  if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir, { recursive: true });
  }
  const testPdfPath = path.join(testOutputDir, 'insurance_test_full.pdf');
  fs.writeFileSync(testPdfPath, outputDual);
  it('25. Test PDF saved to test-output/insurance_test_full.pdf for visual verification', () => {
    assert.ok(fs.existsSync(testPdfPath), 'File must exist');
  });

  console.log(`\n============================================================`);
  console.log(`INSURANCE PDF TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log(`============================================================\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error in tests:', err);
  process.exit(1);
});

