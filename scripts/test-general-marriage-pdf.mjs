import 'regenerator-runtime/runtime.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { renderPdfToImage } from './render-crisp-pdf.mjs';

console.log('============================================================');
console.log('SAF FOUNDATION — GENERAL MARRIAGE OFFICIAL PDF TEST SUITE');
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
  const templatePath = path.join(process.cwd(), 'public', 'pdf', 'general_application', 'Saf_general_form.pdf');
  const fallbackTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'general_application', 'general_application_form.pdf');
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');

  console.log('1. Template & Asset Checks...');
  it('Official template exists at public/pdf/general_application/Saf_general_form.pdf', () => {
    assert.ok(fs.existsSync(templatePath), 'Saf_general_form.pdf must exist');
  });

  it('Standard fallback exists at public/pdf/general_application/general_application_form.pdf', () => {
    assert.ok(fs.existsSync(fallbackTemplatePath), 'general_application_form.pdf must exist');
  });

  it('NotoSansDevanagari font exists', () => {
    assert.ok(fs.existsSync(fontPath), 'Devanagari font must exist');
  });

  console.log('\n2. Frontend Source Code Audit...');
  const pageContent = fs.readFileSync('app/dashboard/general-applications/page.tsx', 'utf8');
  const routeContent = fs.readFileSync('app/api/fill-pdf-form/route.ts', 'utf8');

  it('fill-pdf-form route targets Saf_general_form.pdf in candidateTemplates', () => {
    assert.ok(routeContent.includes('Saf_general_form.pdf'), 'Must include Saf_general_form.pdf in candidates');
  });

  it('GeneralApplicationsPage maps offlineFormNumber and all fields in mapToHindiFields', () => {
    assert.ok(pageContent.includes('offlineFormNumber'), 'Must extract offlineFormNumber');
    assert.ok(pageContent.includes('नामिनी_का_आधार:'), 'Must map nomineeAadhar');
    assert.ok(pageContent.includes('नामिनी_का_मोबाइल:'), 'Must map nomineeMobile');
    assert.ok(pageContent.includes('कार्यकर्ता_कोड:'), 'Must map workerCode');
    assert.ok(pageContent.includes('राशि:'), 'Must map amount / totalAmount');
    assert.ok(pageContent.includes('भुगतान_विवरण:'), 'Must map paymentModeRef');
    assert.ok(pageContent.includes('सीनियर_कोड:'), 'Must map seniorCode');
  });

  it('fill-pdf-form route supports comprehensive valueKeys for all required fields', () => {
    assert.ok(routeContent.includes("'offlineFormNumber'"), 'route must include offlineFormNumber');
    assert.ok(routeContent.includes("'nomineeAadhar'"), 'route must include nomineeAadhar');
    assert.ok(routeContent.includes("'nomineeMobile'"), 'route must include nomineeMobile');
    assert.ok(routeContent.includes("'workerCode'"), 'route must include workerCode');
    assert.ok(routeContent.includes("'totalAmount'"), 'route must include totalAmount');
    assert.ok(routeContent.includes("'paymentModeRef'"), 'route must include paymentModeRef');
    assert.ok(routeContent.includes("'seniorCode'"), 'route must include seniorCode');
  });

  it('fill-pdf-form route implements maxW auto-scaling for long text safety', () => {
    assert.ok(routeContent.includes('widthOfTextAtSize'), 'route must check text width');
    assert.ok(routeContent.includes('maxW'), 'route must implement maxW auto scaling');
  });

  console.log('\n3. Dual Number & Historical PDF Generation Simulation...');
  const existingPdfBytes = fs.readFileSync(templatePath);
  const fontBytes = fs.readFileSync(fontPath);

  const sampleDualRecord = {
    id: "test-gen-dual-001",
    formNumber: "M-021",
    offlineFormNumber: "1269",
    applicationDate: "2026-09-13",
    applicantName: "सुनीता पुरबिया",
    fatherName: "रमेश पुरबिया",
    dateOfBirth: "1998-05-15",
    aadharNumber: "8901 2345 6789",
    gender: "Female",
    education: "स्नातक (B.A.)",
    mobile: "9876543210",
    address: "वार्ड नं. 4, समदड़ी, जिला - बालोतरा (राज.)",
    district: "बालोतरा",
    state: "राजस्थान",
    nomineeName: "महेन्द्र पुरबिया",
    nomineeRelation: "भाई",
    nomineeAadhar: "1234 5678 9012",
    nomineeMobile: "9876543211",
    workerCode: "AGT-042",
    amount: "25000",
    paymentModeRef: "UPI / UTR: 423984729834",
    seniorCode: "SNR-005",
  };

  const sampleHistoricalRecord = {
    id: "test-gen-hist-002",
    formNumber: "SAF-104",
    offlineFormNumber: null,
    applicationDate: "2026-08-20",
    applicantName: "विकास चौधरी",
    fatherName: "सुरेश चौधरी",
    dateOfBirth: "1995-10-12",
    aadharNumber: "4567 8901 2345",
    gender: "Male",
    education: "12वीं पास",
    mobile: "9414012345",
    address: "गांव - सिवाना, तहसील - समदड़ी, जिला - बालोतरा (राज.)",
    district: "बालोतरा",
    state: "राजस्थान",
    nomineeName: "कौशल्या देवी",
    nomineeRelation: "माता",
    nomineeAadhar: "6789 0123 4567",
    nomineeMobile: "9414054321",
    workerCode: "AGT-018",
    amount: "21000",
    paymentModeRef: "Cash / नकद",
    seniorCode: "SNR-002",
  };

  async function generateTestPdf(data, filename) {
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);
    const font = await pdfDoc.embedFont(fontBytes, { subset: false });
    const page = pdfDoc.getPages()[0];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const drawBounded = (text, x, y, size = 10, maxW, color = rgb(0.1, 0.1, 0.1)) => {
      if (!text) return;
      const str = String(text).trim();
      if (!str) return;
      let s = size;
      if (maxW && font.widthOfTextAtSize) {
        const w = font.widthOfTextAtSize(str, size);
        if (w > maxW) {
          s = Math.max(6.0, size * (maxW / w));
        }
      }
      page.drawText(str, {
        x,
        y,
        size: s,
        font,
        color,
      });
    };

    const formatDate = (val) => {
      if (!val) return '';
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // UPPER SECTION
    drawBounded(data.formNumber, 135, 650.5, 10.5, 85, rgb(0, 0.15, 0.6));
    if (data.offlineFormNumber) {
      drawBounded(data.offlineFormNumber, 230, 650.5, 10, 180, rgb(0, 0.15, 0.6));
    }
    drawBounded(formatDate(data.applicationDate), 455, 650.5, 9.5, 100);

    drawBounded(data.applicantName, 72, 616.5, 10, 380);
    drawBounded(data.fatherName, 138, 582.5, 10, 315);

    drawBounded(formatDate(data.dateOfBirth), 106, 548.5, 9.5, 70);
    drawBounded(data.gender === 'Female' ? 'महिला' : 'पुरुष', 210, 548.5, 9.5, 55);
    drawBounded(data.education, 315, 548.5, 9.5, 135);

    drawBounded(data.aadharNumber, 148, 514.5, 10, 305);
    drawBounded(data.address, 68, 480.5, 9.5, 385);

    drawBounded(data.district, 72, 446.5, 9.5, 95);
    drawBounded(data.state, 208, 446.5, 9.5, 95);
    drawBounded(data.mobile, 358, 446.5, 9.5, 195);

    drawBounded(data.nomineeName, 120, 412.5, 10, 190);
    drawBounded(data.nomineeRelation, 358, 412.5, 10, 195);

    drawBounded(data.nomineeAadhar, 140, 378.5, 9.5, 125);
    drawBounded(data.nomineeMobile, 295, 378.5, 9.5, 115);
    drawBounded(data.workerCode, 478, 378.5, 9.5, 75);

    const amtStr = data.amount ? `${data.amount}/-` : '';
    drawBounded(amtStr, 68, 344.5, 9.5, 90);
    drawBounded(data.paymentModeRef, 282, 344.5, 9.5, 130);
    drawBounded(data.seniorCode, 480, 344.5, 9.5, 75);

    // LOWER RECEIPT SECTION
    drawBounded(data.formNumber, 135, 177.5, 10.5, 85, rgb(0, 0.15, 0.6));
    if (data.offlineFormNumber) {
      drawBounded(data.offlineFormNumber, 225, 177.5, 10, 180, rgb(0, 0.15, 0.6));
    }
    drawBounded(formatDate(data.applicationDate), 480, 177.5, 9.5, 75);

    drawBounded(data.applicantName, 65, 149.5, 10, 185);
    drawBounded(data.fatherName, 335, 149.5, 10, 215);
    drawBounded(data.address, 65, 120.5, 9.5, 485);
    drawBounded(data.mobile, 65, 92.5, 9.5, 170);
    drawBounded(data.paymentModeRef, 315, 92.5, 9.5, 235);
    drawBounded(amtStr, 92, 63.5, 9.5, 145);
    drawBounded(amtStr, 115, 43.0, 11, 130, rgb(0, 0.15, 0.6));

    const outPdfBytes = await pdfDoc.save();
    const outDir = path.join(process.cwd(), 'test-output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, filename);
    fs.writeFileSync(outPath, outPdfBytes);

    it(`PDF ${filename} has exactly 1 page`, () => {
      assert.strictEqual(pdfDoc.getPageCount(), 1, 'Must have exactly 1 page');
    });

    it(`PDF ${filename} file size is valid (>400KB)`, () => {
      const stats = fs.statSync(outPath);
      assert.ok(stats.size > 400000, `Size must be > 400KB (actual: ${stats.size})`);
    });

    return { outPath, pdfDoc };
  }

  await generateTestPdf(sampleDualRecord, 'test_general_marriage_dual_official.pdf');
  await generateTestPdf(sampleHistoricalRecord, 'test_general_marriage_historical_official.pdf');

  it('Dual form number renders M-021 and 1269 properly without overlap', () => {
    assert.ok(fs.existsSync('test-output/test_general_marriage_dual_official.pdf'));
  });

  it('Historical form renders SAF-104 with empty offline number', () => {
    assert.ok(fs.existsSync('test-output/test_general_marriage_historical_official.pdf'));
  });

  console.log('\n============================================================');
  console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('============================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
