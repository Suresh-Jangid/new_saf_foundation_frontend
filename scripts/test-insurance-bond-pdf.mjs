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
console.log('SAF FOUNDATION — COMMON INSURANCE PARIVAR KALYAN BOND TEST');
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
  const bondDir = path.join(process.cwd(), 'public', 'pdf', 'general_insurance_application', 'bond');
  const commonTemplatePath = path.join(bondDir, 'saf_parivar_kalyan_bond.pdf');
  const backupTemplatePath = path.join(bondDir, 'saf_parivar_kalyan_bond.backup.pdf');
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-SemiBold.ttf');

  console.log('1. Template & Asset Checks...');
  it('Official common template exists at saf_parivar_kalyan_bond.pdf', () => {
    assert.ok(fs.existsSync(commonTemplatePath), 'saf_parivar_kalyan_bond.pdf must exist');
  });

  it('Template backup exists', () => {
    assert.ok(fs.existsSync(backupTemplatePath), 'saf_parivar_kalyan_bond.backup.pdf must exist');
  });

  it('NotoSansDevanagari-SemiBold font exists', () => {
    assert.ok(fs.existsSync(fontPath), 'SemiBold font must exist');
  });

  console.log('\n2. Common Template Dimensions & Page Count...');
  const templateBytes = fs.readFileSync(commonTemplatePath);
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

  console.log('\n3. Male Record Generation with Common Template...');
  const outDir = path.join(process.cwd(), 'test-output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const maleRecord = {
    gender: 'Male',
    workerOfflineFormNumber: '106',
    seniorOfflineFormNumber: '102',
    offlineFormNumber: '5008',
    membershipNumber: '7004',
    applicationDate: '2026-09-17',
    applicantName: 'सुरेश कुमार',
    fatherName: 'लेखराम',
    caste: 'जांगिड़',
    village: 'कनाना',
    nomineeName: 'सुशीला देवी',
    district: 'बालोतरा',
    agentMobile: '9876543210',
    state: 'राजस्थान',
    aadharNumber: '1234 5678 9012',
    nomineeRelation: 'पत्नी',
    nomineeAadhar: '9876 5432 1098',
    nomineeMobile: '8765432109',
    daysText: '180 दिन',
  };

  const malePdfDoc = await PDFDocument.load(templateBytes);
  malePdfDoc.registerFontkit(fontkit);
  const font = await malePdfDoc.embedFont(fs.readFileSync(fontPath), { subset: false });
  const malePage = malePdfDoc.getPage(0);
  const pageHeight = 841.8898;

  const fields = (record) => [
    { field: 'कार्यकर्ता_कोड', val: record.workerOfflineFormNumber, x: 138, y: 112.5, maxW: 85, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
    { field: 'सीनियर_कार्यकर्ता_कोड', val: record.seniorOfflineFormNumber, x: 460, y: 112.5, maxW: 80, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
    { field: 'आवेदन_क्र', val: record.offlineFormNumber, x: 100, y: 136.0, maxW: 130, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
    { field: 'सदस्यता_क्र', val: record.membershipNumber, x: 302, y: 136.0, maxW: 115, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
    { field: 'आवेदन_दिनांक', val: '17/09/2026', x: 484, y: 136.0, maxW: 75, size: 9.5 },
    { field: 'नाम', val: record.applicantName, x: 72, y: 178.0, maxW: 150, size: 10 },
    { field: 'जाति', val: record.caste, x: 72, y: 201.0, maxW: 150, size: 9.5 },
    { field: 'वारिसदार', val: record.nomineeName, x: 90, y: 224.0, maxW: 135, size: 9.5 },
    { field: 'एजेन्ट_मो_नं', val: record.agentMobile, x: 107, y: 249.0, maxW: 115, size: 9.5 },
    { field: 'आधार_नं', val: record.aadharNumber, x: 93, y: 273.5, maxW: 135, size: 9.5 },
    { field: 'नॉमिनी_आधार_नं', val: record.nomineeAadhar, x: 127, y: 297.0, maxW: 100, size: 9.5 },
    { field: 'पिता_पति_का_नाम', val: record.fatherName || record.husbandName, x: 322, y: 178.0, maxW: 130, size: 10 },
    { field: 'गांव', val: record.village, x: 258, y: 201.0, maxW: 190, size: 9.5 },
    { field: 'जिला', val: record.district, x: 265, y: 224.0, maxW: 190, size: 9.5 },
    { field: 'राज्य', val: record.state, x: 261, y: 249.0, maxW: 190, size: 9.5 },
    { field: 'सम्बन्ध', val: record.nomineeRelation, x: 272, y: 273.5, maxW: 180, size: 9.5 },
    { field: 'नॉमिनी_मो_नं', val: record.nomineeMobile, x: 301, y: 297.0, maxW: 140, size: 9.5 },
    { field: 'अवधि', val: record.daysText, x: 280, y: 352.0, maxW: 75, size: 9.5, color: { r: 0.8, g: 0.1, b: 0.1 } },
  ];

  for (const f of fields(maleRecord)) {
    if (!f.val) continue;
    const drawX = f.x;
    const drawY = pageHeight - f.y;
    let size = f.size || 9.5;
    const textColor = f.color ? rgb(f.color.r, f.color.g, f.color.b) : rgb(0.1, 0.1, 0.1);
    malePage.drawText(f.val, {
      x: drawX,
      y: drawY,
      size,
      font,
      color: textColor,
    });
  }

  // Draw applicant & nominee photo placeholders
  malePage.drawRectangle({
    x: 461.2,
    y: pageHeight - 148.8 - 89.0,
    width: 82.0,
    height: 89.0,
    color: rgb(0.85, 0.90, 0.95),
  });
  malePage.drawRectangle({
    x: 461.2,
    y: pageHeight - 247.2 - 89.2,
    width: 82.0,
    height: 89.2,
    color: rgb(0.95, 0.90, 0.85),
  });

  const maleBytesOut = await malePdfDoc.save();
  const malePdfPath = path.join(outDir, 'test_male_parivar_kalyan_bond.pdf');
  fs.writeFileSync(malePdfPath, maleBytesOut);

  it('Male Bond PDF generated successfully with common template', () => {
    assert.ok(fs.existsSync(malePdfPath), 'test_male_parivar_kalyan_bond.pdf must exist');
    assert.ok(fs.statSync(malePdfPath).size > 100000, 'PDF size must be > 100KB');
  });

  console.log('\n4. Female Record Generation with Common Template...');
  const femaleRecord = {
    gender: 'Female',
    workerOfflineFormNumber: '108',
    seniorOfflineFormNumber: '102',
    offlineFormNumber: '5010',
    membershipNumber: '7006',
    applicationDate: '2026-09-17',
    applicantName: 'सुशीला देवी',
    husbandName: 'सुरेश कुमार',
    caste: 'जांगिड़',
    village: 'कनाना',
    nomineeName: 'सुरेश कुमार',
    district: 'बालोतरा',
    agentMobile: '9876543210',
    state: 'राजस्थान',
    aadharNumber: '9876 5432 1098',
    nomineeRelation: 'पति',
    nomineeAadhar: '1234 5678 9012',
    nomineeMobile: '9876543210',
    daysText: '180 दिन',
  };

  const femalePdfDoc = await PDFDocument.load(templateBytes);
  femalePdfDoc.registerFontkit(fontkit);
  const femaleFont = await femalePdfDoc.embedFont(fs.readFileSync(fontPath), { subset: false });
  const femalePage = femalePdfDoc.getPage(0);

  for (const f of fields(femaleRecord)) {
    if (!f.val) continue;
    const drawX = f.x;
    const drawY = pageHeight - f.y;
    let size = f.size || 9.5;
    const textColor = f.color ? rgb(f.color.r, f.color.g, f.color.b) : rgb(0.1, 0.1, 0.1);
    femalePage.drawText(f.val, {
      x: drawX,
      y: drawY,
      size,
      font: femaleFont,
      color: textColor,
    });
  }

  // Draw applicant & nominee photo placeholders
  femalePage.drawRectangle({
    x: 461.2,
    y: pageHeight - 148.8 - 89.0,
    width: 82.0,
    height: 89.0,
    color: rgb(0.85, 0.90, 0.95),
  });
  femalePage.drawRectangle({
    x: 461.2,
    y: pageHeight - 247.2 - 89.2,
    width: 82.0,
    height: 89.2,
    color: rgb(0.95, 0.90, 0.85),
  });

  const femaleBytesOut = await femalePdfDoc.save();
  const femalePdfPath = path.join(outDir, 'test_female_parivar_kalyan_bond.pdf');
  fs.writeFileSync(femalePdfPath, femaleBytesOut);

  it('Female Bond PDF generated successfully with common template', () => {
    assert.ok(fs.existsSync(femalePdfPath), 'test_female_parivar_kalyan_bond.pdf must exist');
    assert.ok(fs.statSync(femalePdfPath).size > 100000, 'PDF size must be > 100KB');
  });

  console.log('\n5. Visual High-Resolution Image Rendering...');
  const malePngPath = path.join(outDir, 'test_male_parivar_kalyan_bond.png');
  const femalePngPath = path.join(outDir, 'test_female_parivar_kalyan_bond.png');
  await renderPdfToImage(malePdfPath, malePngPath, 3.0);
  await renderPdfToImage(femalePdfPath, femalePngPath, 3.0);

  it('High-resolution PNGs generated successfully at 3x scale', () => {
    assert.ok(fs.existsSync(malePngPath), 'test_male_parivar_kalyan_bond.png must exist');
    assert.ok(fs.existsSync(femalePngPath), 'test_female_parivar_kalyan_bond.png must exist');
    assert.ok(fs.statSync(malePngPath).size > 200000, 'PNG size must be > 200KB');
    assert.ok(fs.statSync(femalePngPath).size > 200000, 'PNG size must be > 200KB');
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
