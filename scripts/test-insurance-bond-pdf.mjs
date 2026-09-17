import 'regenerator-runtime/runtime.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import puppeteer from 'puppeteer-core';

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

console.log('============================================================');
console.log('SAF FOUNDATION — INSURANCE BIMA PARIVAR KALYAN BOND TEST');
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

async function renderPdfToImage(pdfPath, outImagePath, scale = 3.0) {
  const exe = CHROME_PATHS.find(p => fs.existsSync(p));
  const browser = await puppeteer.launch({ executablePath: exe, headless: true });
  const page = await browser.newPage();
  const pdfBytes = fs.readFileSync(pdfPath);
  const base64 = pdfBytes.toString('base64');

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>body { margin: 0; padding: 0; background: #fff; overflow: hidden; } canvas { display: block; }</style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  </head>
  <body>
    <canvas id="pdf-canvas"></canvas>
    <script>
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      async function render(scaleFactor) {
        const raw = atob('${base64}');
        const uint8 = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
        const loadingTask = pdfjsLib.getDocument({ data: uint8 });
        const pdf = await loadingTask.promise;
        const p1 = await pdf.getPage(1);
        const viewport = p1.getViewport({ scale: scaleFactor });
        const canvas = document.getElementById('pdf-canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await p1.render({ canvasContext: ctx, viewport }).promise;
        return { width: viewport.width, height: viewport.height };
      }
      window.renderPromise = render(${scale});
    </script>
  </body>
  </html>
  `;

  await page.setContent(html);
  const dimensions = await page.evaluate(() => window.renderPromise);
  await page.setViewport({
    width: Math.ceil(dimensions.width),
    height: Math.ceil(dimensions.height),
    deviceScaleFactor: 1,
  });

  const canvasHandle = await page.$('#pdf-canvas');
  await canvasHandle.screenshot({ path: outImagePath, type: 'png' });
  await browser.close();
}

async function runTests() {
  const templateDir = path.join(process.cwd(), 'public', 'pdf', 'general_insurance_application', 'bond');
  const templatePath = path.join(templateDir, 'saf_parivar_kalyan_bond.pdf');
  const backupTemplatePath = path.join(templateDir, 'saf_parivar_kalyan_bond.backup.pdf');
  const femaleBackupPath = path.join(templateDir, 'female_suraksha_bond.backup.pdf');
  const maleBackupPath = path.join(templateDir, 'male_suraksha_bond.backup.pdf');
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-SemiBold.ttf');

  console.log('1. Template & Asset Checks...');
  it('Official canonical template exists at saf_parivar_kalyan_bond.pdf', () => {
    assert.ok(fs.existsSync(templatePath), 'saf_parivar_kalyan_bond.pdf must exist');
  });

  it('Template backup exists', () => {
    assert.ok(
      fs.existsSync(backupTemplatePath) || fs.existsSync(femaleBackupPath),
      'Backup template must exist'
    );
  });

  it('NotoSansDevanagari-SemiBold font exists', () => {
    assert.ok(fs.existsSync(fontPath), 'SemiBold font must exist');
  });

  console.log('\n2. Template Dimensions & Page Count...');
  const templateBytes = fs.readFileSync(templatePath);
  const tDoc = await PDFDocument.load(templateBytes);
  it('Template has exactly 1 page', () => {
    assert.strictEqual(tDoc.getPageCount(), 1, 'Must be a 1-page PDF');
  });

  const tPage = tDoc.getPage(0);
  const { width: tW, height: tH } = tPage.getSize();
  it('Template dimensions match standard A4 (595.28 x 841.89 pt)', () => {
    assert.ok(Math.abs(tW - 595.28) < 1, `Expected width ~595.28, got ${tW}`);
    assert.ok(Math.abs(tH - 841.89) < 1, `Expected height ~841.89, got ${tH}`);
  });

  console.log('\n3. PDF Generation & Dynamic Rendering...');
  const outDir = path.join(process.cwd(), 'test-output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const sampleRecord = {
    id: 'INS-TEST-001',
    workerOfflineFormNumber: '106',
    seniorOfflineFormNumber: '102',
    offlineFormNumber: '5008',
    membershipNumber: '7004',
    applicationDate: '2026-09-17',
    applicantName: 'सुरेश कुमार',
    fatherName: 'लेखराम',
    caste: 'जांगिड़',
    village: 'कनाना',
    nomineeName: 'सीता देवी',
    district: 'बालोतरा',
    agentMobile: '9876543210',
    state: 'राजस्थान',
    aadharNumber: '1234 5678 9012',
    nomineeRelation: 'पत्नी',
    nomineeAadhar: '9876 5432 1098',
    nomineeMobile: '8765432109',
    daysText: '180 दिन',
  };

  // Generate test PDF via the same logic as the API route
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fs.readFileSync(fontPath), { subset: false });
  const page = pdfDoc.getPage(0);
  const pageHeight = 841.8898;

  // Create dummy photo for applicant and nominee
  const dummyDoc = await PDFDocument.create();
  const dummyPage = dummyDoc.addPage([100, 100]);
  dummyPage.drawRectangle({ x: 0, y: 0, width: 100, height: 100, color: rgb(0.2, 0.4, 0.7) });
  const dummyBytes = await dummyDoc.save();

  // Dynamic field definitions
  const fields = [
    { field: 'कार्यकर्ता_कोड', val: sampleRecord.workerOfflineFormNumber, x: 138, y: 112.5, maxW: 85, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
    { field: 'सीनियर_कार्यकर्ता_कोड', val: sampleRecord.seniorOfflineFormNumber, x: 460, y: 112.5, maxW: 80, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
    { field: 'आवेदन_क्र', val: sampleRecord.offlineFormNumber, x: 100, y: 136.0, maxW: 130, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
    { field: 'सदस्यता_क्र', val: sampleRecord.membershipNumber, x: 302, y: 136.0, maxW: 115, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
    { field: 'आवेदन_दिनांक', val: '17/09/2026', x: 484, y: 136.0, maxW: 75, size: 9.5 },
    { field: 'नाम', val: sampleRecord.applicantName, x: 72, y: 178.0, maxW: 150, size: 10 },
    { field: 'जाति', val: sampleRecord.caste, x: 72, y: 201.0, maxW: 150, size: 9.5 },
    { field: 'वारिसदार', val: sampleRecord.nomineeName, x: 90, y: 224.0, maxW: 135, size: 9.5 },
    { field: 'एजेन्ट_मो_नं', val: sampleRecord.agentMobile, x: 107, y: 249.0, maxW: 115, size: 9.5 },
    { field: 'आधार_नं', val: sampleRecord.aadharNumber, x: 93, y: 273.5, maxW: 135, size: 9.5 },
    { field: 'नॉमिनी_आधार_नं', val: sampleRecord.nomineeAadhar, x: 127, y: 297.0, maxW: 100, size: 9.5 },
    { field: 'पिता_पति_का_नाम', val: sampleRecord.fatherName, x: 322, y: 178.0, maxW: 130, size: 10 },
    { field: 'गांव', val: sampleRecord.village, x: 258, y: 201.0, maxW: 190, size: 9.5 },
    { field: 'जिला', val: sampleRecord.district, x: 265, y: 224.0, maxW: 190, size: 9.5 },
    { field: 'राज्य', val: sampleRecord.state, x: 261, y: 249.0, maxW: 190, size: 9.5 },
    { field: 'सम्बन्ध', val: sampleRecord.nomineeRelation, x: 272, y: 273.5, maxW: 180, size: 9.5 },
    { field: 'नॉमिनी_मो_नं', val: sampleRecord.nomineeMobile, x: 301, y: 297.0, maxW: 140, size: 9.5 },
    { field: 'अवधि', val: sampleRecord.daysText, x: 280, y: 352.0, maxW: 75, size: 9.5, color: { r: 0.8, g: 0.1, b: 0.1 } },
  ];

  for (const f of fields) {
    if (!f.val) continue;
    const drawX = f.x;
    const drawY = pageHeight - f.y;
    let size = f.size || 9.5;
    const textColor = f.color ? rgb(f.color.r, f.color.g, f.color.b) : rgb(0.1, 0.1, 0.1);
    page.drawText(f.val, {
      x: drawX,
      y: drawY,
      size,
      font,
      color: textColor,
    });
  }

  // Draw applicant & nominee photo placeholders
  page.drawRectangle({
    x: 461.2,
    y: pageHeight - 148.8 - 89.0,
    width: 82.0,
    height: 89.0,
    color: rgb(0.85, 0.90, 0.95),
  });
  page.drawRectangle({
    x: 461.2,
    y: pageHeight - 247.2 - 89.2,
    width: 82.0,
    height: 89.2,
    color: rgb(0.95, 0.90, 0.85),
  });

  const generatedBytes = await pdfDoc.save();
  const testPdfPath = path.join(outDir, 'test_insurance_bond_calibrated.pdf');
  fs.writeFileSync(testPdfPath, generatedBytes);

  it('Generated Bond PDF exists and is non-empty', () => {
    assert.ok(fs.existsSync(testPdfPath), 'test_insurance_bond_calibrated.pdf must exist');
    assert.ok(fs.statSync(testPdfPath).size > 100000, 'PDF size must be > 100KB');
  });

  console.log('\n4. Visual High-Resolution Image Rendering...');
  const testPngPath = path.join(outDir, 'test_insurance_bond_calibrated.png');
  await renderPdfToImage(testPdfPath, testPngPath, 3.0);

  it('High-resolution PNG generated successfully at 3x scale', () => {
    assert.ok(fs.existsSync(testPngPath), 'test_insurance_bond_calibrated.png must exist');
    assert.ok(fs.statSync(testPngPath).size > 200000, 'PNG size must be > 200KB');
  });

  console.log('\n============================================================');
  console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
