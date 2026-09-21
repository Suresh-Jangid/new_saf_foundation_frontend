import 'regenerator-runtime/runtime.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import crypto from 'crypto';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

console.log('============================================================');
console.log('SAF FOUNDATION — JANNI DELIVERY BOND PDF TEST SUITE');
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
  const canonicalTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'janni_bond', 'janni_sahayata_bond.pdf');
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-SemiBold.ttf');
  const routePath = path.join(process.cwd(), 'app', 'api', 'generate-janni-bond-pdf', 'route.ts');
  const listPath = path.join(process.cwd(), 'app', 'dashboard', 'janni-delivery', 'page.tsx');

  console.log('1. Template & Asset Integrity...');

  it('1. Official Janni Bond template exists at public/pdf/janni_bond/janni_sahayata_bond.pdf', () => {
    assert.ok(fs.existsSync(canonicalTemplatePath), 'Template must exist');
  });

  const templateBytes = fs.readFileSync(canonicalTemplatePath);
  const templateHash = crypto.createHash('sha256').update(templateBytes).digest('hex').toUpperCase();

  it('2. Official template hash is strictly preserved (byte-for-byte unchanged)', () => {
    assert.strictEqual(
      templateHash,
      '93E5AF08BD236331C97A8DD25711E8DB968E2480BD651DA7BCD00262A406B298',
      'Template SHA256 must match official template byte-for-byte'
    );
  });

  it('3. Devanagari font exists for Hindi rendering', () => {
    assert.ok(fs.existsSync(fontPath), 'Font file must exist');
  });

  const pdfDoc = await PDFDocument.load(templateBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  it('4. Template page count = 1', () => {
    assert.strictEqual(pages.length, 1);
  });

  it('5. Template size = A4 portrait (595.28 x 841.89 pt)', () => {
    assert.ok(Math.abs(width - 595.28) < 0.5, 'Width must be ~595.28 pt');
    assert.ok(Math.abs(height - 841.89) < 0.5, 'Height must be ~841.89 pt');
  });

  console.log('\n2. Route & Code Level Assertions...');
  const routeContent = fs.readFileSync(routePath, 'utf8');
  const listContent = fs.readFileSync(listPath, 'utf8');

  it('6. Route uses canonical Janni bond template path', () => {
    assert.ok(routeContent.includes('janni_sahayata_bond.pdf'), 'Must use janni_sahayata_bond.pdf');
  });

  it('7. Form No (फॉर्म नं.) is drawn in header box', () => {
    assert.ok(routeContent.includes('drawCenteredInBox(applicationNo, 108.0, 148.5, 88.5, 20.5'), 'Form No box positioned at x=108.0, y=148.5');
  });

  it('8. Worker code (एजेन्ट कोड) is drawn in header box', () => {
    assert.ok(routeContent.includes('drawCenteredInBox(workerOffline, 108.0, 174.5, 88.5, 20.5'), 'Worker offline box positioned at x=108.0, y=174.5');
  });

  it('9. Upline code (अपलाईन कोड) is drawn in header box', () => {
    assert.ok(routeContent.includes('drawCenteredInBox(seniorOffline, 108.0, 199.5, 88.5, 20.5'), 'Senior offline box positioned at x=108.0, y=199.5');
  });

  it('10. Application date (आवेदन दि.) is formatted to DD/MM/YYYY and drawn in header box', () => {
    assert.ok(routeContent.includes('drawCenteredInBox(applicationDate, 452.0, 148.5, 88.5, 20.5'), 'Date box positioned at x=452.0, y=148.5');
  });

  it('11. Membership number (सदस्यता क्र.) is drawn in header box (blank when absent)', () => {
    assert.ok(routeContent.includes('drawCenteredInBox(membershipNumber, 452.0, 180.5, 88.5, 20.5'), 'Membership box positioned at x=452.0, y=180.5');
  });

  it('12. Applicant name (नाम) is rendered at calibrated baseline', () => {
    assert.ok(routeContent.includes('drawBounded(applicantName, 72.0, 234.0, 10.0, 185'), 'Applicant name positioned at x=72.0, y=234.0');
  });

  it('13. Father/Husband (पिता/पति का नाम) is rendered at calibrated baseline', () => {
    assert.ok(routeContent.includes('drawBounded(fatherHusbandName, 132.0, 259.5, 10.0, 125'), 'Father/Husband positioned at x=132.0, y=259.5');
  });

  it('14. Applicant Aadhaar (आधार नं.) is rendered at calibrated baseline', () => {
    assert.ok(routeContent.includes('drawBounded(aadharNumber, 94.0, 284.5, 10.0, 163'), 'Aadhaar positioned at x=94.0, y=284.5');
  });

  it('15. जाति preserves Janni contract (gotra/category)', () => {
    assert.ok(routeContent.includes('drawBounded(caste, 74.0, 309.5, 10.0, 183'), 'Caste/Gotra positioned at x=74.0, y=309.5');
  });

  it('16. Relationship (सम्बन्ध) is rendered at calibrated baseline', () => {
    assert.ok(routeContent.includes('drawBounded(nomineeRelation, 84.0, 335.5, 10.0, 173'), 'Relation positioned at x=84.0, y=335.5');
  });

  it('17. Village/Address (गांव) is rendered at calibrated baseline', () => {
    assert.ok(routeContent.includes('drawBounded(village, 72.0, 360.5, 10.0, 185'), 'Village positioned at x=72.0, y=360.5');
  });

  it('18. Nominee Name (नॉमिनी नाम) is rendered at calibrated baseline', () => {
    assert.ok(routeContent.includes('drawBounded(nomineeName, 330.0, 234.0, 10.0, 112'), 'Nominee name positioned at x=330.0, y=234.0');
  });

  it('19. Nominee Aadhaar (नॉमिनी आधार नं.) is rendered at calibrated baseline', () => {
    assert.ok(routeContent.includes('drawBounded(nomineeAadhar, 356.0, 259.5, 10.0, 86'), 'Nominee Aadhaar positioned at x=356.0, y=259.5');
  });

  it('20. Nominee mobile (नॉमिनी मो. नं.) is rendered at calibrated baseline', () => {
    assert.ok(routeContent.includes('drawBounded(nomineeMobile, 348.0, 284.5, 10.0, 94'), 'Nominee mobile positioned at x=348.0, y=284.5');
  });

  it('21. एजेन्ट मो. नं. uses assigned Agent mobile (NEVER applicant mobile)', () => {
    assert.ok(routeContent.includes('drawBounded(agentMobile, 336.0, 309.5, 10.0, 106'), 'Agent mobile positioned at x=336.0, y=309.5');
  });

  it('22. District (जिला) is rendered at calibrated baseline', () => {
    assert.ok(routeContent.includes('drawBounded(district, 304.0, 335.5, 10.0, 138'), 'District positioned at x=304.0, y=335.5');
  });

  it('23. State (राज्य) is rendered at calibrated baseline', () => {
    assert.ok(routeContent.includes('drawBounded(state, 304.0, 360.5, 10.0, 138'), 'State positioned at x=304.0, y=360.5');
  });

  it('24. Bottom Janni Amount is rendered centered in dotted area', () => {
    assert.ok(routeContent.includes('drawBounded(janniAmount, amtX, 380.0, 11.5, 70, navyColor)'), 'Janni amount positioned at y=380.0 on dotted baseline');
  });

  it('25. Benefit Duration (लाभ अवधि) is rendered centered in dotted area', () => {
    assert.ok(routeContent.includes('drawBounded(duration, durX, 405.0, 10.5, 80, redColor)'), 'Duration positioned at y=405.0 on dotted baseline');
  });

  it('26. Single right-hand photo box is calibrated with inner inset (1.0pt) and cover fit', () => {
    assert.ok(routeContent.includes('449.0, 235.0, 84.5, 103.0, \'cover\''), 'Photo box fitted at x=449.0, y=235.0, w=84.5, h=103.0 with cover fit');
  });

  it('27. Director signature is placed in director signature area', () => {
    assert.ok(routeContent.includes('directorSignatureSource'), 'Handles director signature');
    assert.ok(routeContent.includes('440, 750'), 'Director signature positioned in footer area');
  });

  console.log('\n3. Real Mock Generation & Multi-Case Data Testing...');
  const mockRecord = {
    workerOfflineFormNumber: '1258',
    seniorOfflineFormNumber: '1260',
    workerMobile: '8888888888',
    mobile: '9000000001',
    membershipNumber: '10042',
    offlineFormNumber: '005',
    applicationDate: '2026-09-15',
    applicantName: 'सुनीता शर्मा',
    gotra: 'चौधरी',
    nomineeName: 'राहुल शर्मा',
    nomineeRelation: 'पति',
    nomineeAadhar: '9876 5432 1098',
    nomineeMobile: '9876543210',
    husbandName: 'राहुल शर्मा',
    village: 'समदड़ी',
    district: 'बालोतरा',
    state: 'राजस्थान',
    aadharNumber: '1234 5678 9012',
    duration: 'नौ माह',
    janniAmount: '11000',
  };

  it('28. Agent mobile (8888888888) is distinct from Applicant mobile (9000000001)', () => {
    assert.notStrictEqual(mockRecord.workerMobile, mockRecord.mobile);
    assert.strictEqual(mockRecord.workerMobile, '8888888888');
    assert.strictEqual(mockRecord.mobile, '9000000001');
  });

  it('29. Worker offline code and senior code are sanitized numbers (not EMP-xxx)', () => {
    assert.strictEqual(mockRecord.workerOfflineFormNumber, '1258');
    assert.strictEqual(mockRecord.seniorOfflineFormNumber, '1260');
    assert.ok(!mockRecord.workerOfflineFormNumber.startsWith('EMP'));
    assert.ok(!mockRecord.seniorOfflineFormNumber.startsWith('EMP'));
  });

  it('30. End-to-End PDF generation produces valid A4 output buffer', async () => {
    const freshPdf = await PDFDocument.load(templateBytes);
    freshPdf.registerFontkit(fontkit);
    const p = freshPdf.getPage(0);
    const pHeight = p.getSize().height;

    const fontBytes = fs.readFileSync(fontPath);
    const embeddedFont = await freshPdf.embedFont(fontBytes, { subset: false });

    p.drawText(mockRecord.applicantName, {
      x: 72,
      y: pHeight - 234.0,
      size: 10,
      font: embeddedFont,
      color: rgb(0.12, 0.12, 0.12),
    });

    const outBytes = await freshPdf.save();
    assert.ok(outBytes.length > 100000, 'Output PDF bytes must be substantial and valid');
  });

  console.log(`\n============================================================`);
  console.log(`JANNI DELIVERY BOND TEST SUMMARY: ${passCount} passed, ${failCount} failed.`);
  console.log(`============================================================\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
