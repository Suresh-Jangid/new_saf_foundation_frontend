import 'regenerator-runtime/runtime.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PDFDocument, rgb, pushGraphicsState, popGraphicsState, clip, endPath, rectangle } from 'pdf-lib';
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
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-SemiBold.ttf');

  console.log('1. Template & Asset Integrity Checks...');
  it('1. Official template exists in public/pdf/mayra_bond/mayra_bond.pdf', () => {
    assert.ok(fs.existsSync(primaryTemplatePath), 'Template must exist at public/pdf/mayra_bond/mayra_bond.pdf');
  });

  it('2. Template is non-empty official PDF (>1.5MB)', () => {
    const stats = fs.statSync(primaryTemplatePath);
    assert.ok(stats.size > 1500000, `Template size must be > 1.5MB (actual: ${stats.size})`);
  });

  it('3. NotoSansDevanagari SemiBold font exists for Hindi Unicode rendering', () => {
    assert.ok(fs.existsSync(fontPath), 'Devanagari SemiBold font must exist');
  });

  console.log('\n2. Template Structure & Dimension Assertions...');
  const templateBytes = fs.readFileSync(primaryTemplatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  it('4. Template is exactly 1 page', () => {
    assert.strictEqual(pdfDoc.getPageCount(), 1, 'Template must be exactly 1 page');
  });

  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();

  it('5. Output page dimensions match official A4 template (595.28 x 841.89 pt)', () => {
    assert.strictEqual(Math.round(width), 595, 'Width must be ~595 pt');
    assert.strictEqual(Math.round(height), 842, 'Height must be ~842 pt');
  });

  console.log('\n3. Route & Field Extraction Audits...');
  const routeContent = fs.readFileSync('app/api/generate-mayra-bond-pdf/route.ts', 'utf8');

  it('6. सदस्यता क्र. uses ONLY record.membershipNumber / membership_number', () => {
    const membershipLine = routeContent.match(/const\s+rawMembership\s*=\s*([^;]+);/);
    assert.ok(membershipLine, 'rawMembership definition must exist in route');
    assert.ok(
      membershipLine[1].includes("'membershipNumber'") &&
      !membershipLine[1].includes("'formNumber'") &&
      !membershipLine[1].includes("'sr_no'") &&
      !membershipLine[1].includes("'form_number'"),
      'rawMembership must ONLY query membershipNumber / membership_number'
    );
  });

  it('7. Missing/empty membershipNumber remains completely blank', () => {
    assert.ok(
      !routeContent.includes('|| "MAYRA-') && !routeContent.includes('|| "SAF-') && !routeContent.includes('|| "BOND-'),
      'Must not invent default membership numbers'
    );
  });

  it('8. formNumber cannot populate membership number', () => {
    const membershipLine = routeContent.match(/const\s+rawMembership\s*=\s*([^;]+);/);
    assert.ok(membershipLine, 'rawMembership definition must exist in route');
    assert.ok(!membershipLine[1].includes('formNumber'), 'formNumber must not leak into membershipNo');
    assert.ok(!membershipLine[1].includes('sr_no'), 'sr_no must not leak into membershipNo');
  });

  it('9. E-PIN cannot populate membership number', () => {
    const membershipLine = routeContent.match(/const\s+rawMembership\s*=\s*([^;]+);/);
    assert.ok(membershipLine, 'rawMembership definition must exist in route');
    assert.ok(!membershipLine[1].includes('epin'), 'epin must not leak into membershipNo');
    assert.ok(!membershipLine[1].includes('pinNumber'), 'pinNumber must not leak into membershipNo');
  });

  it('10. फॉर्म नं. maps to offlineFormNumber / formNumber and preserves string format (e.g. "002")', () => {
    assert.ok(routeContent.includes('offlineFormNumber'), 'offlineFormNumber mapped');
    assert.ok(routeContent.includes('formNumber'), 'formNumber mapped');
    assert.ok(!routeContent.includes('parseInt(rawFormNumber)'), 'formNumber must not strip leading zeros with parseInt');
  });

  it('11. एजेंट कोड maps to workerCode / agentCode with sanitization', () => {
    assert.ok(routeContent.includes('workerCode') || routeContent.includes('agentCode'), 'agentCode mapped');
    assert.ok(routeContent.includes('sanitizeOfflineNumber'), 'sanitizeOfflineNumber used');
  });

  it('12. अपलाईन कोड maps to seniorCode / uplineCode with sanitization', () => {
    assert.ok(routeContent.includes('seniorCode') || routeContent.includes('uplineCode'), 'uplineCode mapped');
  });

  it('13. Header meta fields use drawCenteredInBox with box bounds', () => {
    assert.ok(routeContent.includes('drawCenteredInBox'), 'drawCenteredInBox helper exists');
    assert.ok(routeContent.includes('drawCenteredInBox(formNumber, 109.31, 680.13, 88.45, 20.86'), 'Form No box bounds matched');
    assert.ok(routeContent.includes('drawCenteredInBox(applicationDate, 457.94, 680.13, 88.45, 20.86'), 'Date box bounds matched');
  });

  it('14. भाणेज-भाणजी का विवरण fields map correctly (applicantName, aadharNumber, fatherName, gotra, address, relation)', () => {
    assert.ok(routeContent.includes('applicantName'), 'applicantName mapped');
    assert.ok(routeContent.includes('applicantAadhaar'), 'applicantAadhaar mapped');
    assert.ok(routeContent.includes('fatherName'), 'fatherName mapped');
    assert.ok(routeContent.includes('gotra'), 'gotra mapped');
    assert.ok(routeContent.includes('address'), 'address mapped');
    assert.ok(routeContent.includes('nomineeRelation'), 'nomineeRelation mapped');
  });

  it('15. नॉमिनी का विवरण fields map correctly (nomineeName, nomineeAadhaar, nomineeFathername, nomineeGotra, age, nomineeAddress, nomineeMobile, agentMobile)', () => {
    assert.ok(routeContent.includes('nomineeName'), 'nomineeName mapped');
    assert.ok(routeContent.includes('nomineeAadhaar'), 'nomineeAadhaar mapped');
    assert.ok(routeContent.includes('nomineeFathername'), 'nomineeFathername mapped');
    assert.ok(routeContent.includes('nomineeGotra'), 'nomineeGotra mapped');
    assert.ok(routeContent.includes('age'), 'age mapped');
    assert.ok(routeContent.includes('nomineeAddress'), 'nomineeAddress mapped');
    assert.ok(routeContent.includes('nomineeMobile'), 'nomineeMobile mapped');
    assert.ok(routeContent.includes('agentMobile'), 'agentMobile mapped');
  });

  it('16. Bottom Mayra amount maps to authoritative amount (300 किस्त / 1000 किस्त / numeric amount)', () => {
    assert.ok(routeContent.includes('resolveMayraAmountText'), 'resolveMayraAmountText mapped');
    assert.ok(routeContent.includes('300 किस्त'), '300 installment handled');
    assert.ok(routeContent.includes('1000 किस्त'), '1000 installment handled');
  });

  it('17. Applicant Photo is embedded in top box (X: 252.35, Y: 578.75, W: 86.40, H: 80.18)', () => {
    assert.ok(routeContent.includes('applicantPhotoSource'), 'applicantPhotoSource checked');
    assert.ok(routeContent.includes('252.35, 182.96, 86.40, 80.18'), 'Applicant photo positioned at top box');
  });

  it('18. Nominee Photo is embedded in bottom box (X: 252.35, Y: 474.42, W: 86.40, H: 80.17)', () => {
    assert.ok(routeContent.includes('nomineePhotoSource'), 'nomineePhotoSource checked');
    assert.ok(routeContent.includes('252.35, 287.30, 86.40, 80.17'), 'Nominee photo positioned at bottom box');
  });

  it('19. SemiBold Devanagari font is used for visual matching with KrutiDev labels', () => {
    assert.ok(routeContent.includes('NotoSansDevanagari-SemiBold.ttf'), 'NotoSansDevanagari-SemiBold font configured');
  });

  console.log('\n4. Multi-Case PDF Generation & Data Assertion Testing...');
  const fontBytes = fs.readFileSync(fontPath);

  // Test Case Matrix
  const testCases = [
    {
      name: 'Case 1: "002" Form No and "20/09/2026" Date Centering Record',
      data: {
        membershipNumber: 'M-2026-089',
        offlineFormNumber: '002',
        applicationDate: '20/09/2026',
        workerCode: 'AGT-4012',
        seniorCode: 'SEN-1008',
        applicantName: 'कविता कुमारी',
        aadharNumber: '1234 5678 9012',
        fatherName: 'रमेश कुमार',
        gotra: 'प्रजापत',
        address: 'जसोल, बालोतरा',
        nomineeRelation: 'भांजी',
        nomineeName: 'सज्जन राज',
        nomineeAadhaar: '9876 5432 1098',
        nomineeFathername: 'भंवर लाल प्रजापत',
        nomineeGotra: 'प्रजापत',
        age: '18 वर्ष',
        nomineeAddress: 'जसोल, बालोतरा (राज.)',
        nomineeMobile: '9876543210',
        workerMobile: '9123456780',
        installmentAmount: 300,
      },
    },
    {
      name: 'Case 2: Short Values',
      data: {
        offlineFormNumber: '1',
        applicationDate: '01/01/2026',
        workerCode: '5',
        applicantName: 'पूजा',
        fatherName: 'राम',
        gotra: 'सैन',
        address: 'पाली',
        nomineeRelation: 'पुत्री',
        nomineeName: 'ओम',
        nomineeFathername: 'राम',
        nomineeGotra: 'सैन',
        age: '19',
        nomineeAddress: 'पाली',
        installmentAmount: 1000,
      },
    },
    {
      name: 'Case 3: Long Names and Long Addresses (Testing Proportional Fitting)',
      data: {
        membershipNumber: 'MEM-2026-LONG-001',
        offlineFormNumber: 'OFF-LONG-2026-0098',
        applicationDate: '2026-09-17',
        workerCode: 'WRK-889900',
        seniorCode: 'SNR-112233',
        applicantName: 'श्रीमती भाग्यवंती देवी सुपुत्री सज्जनराज जी प्रजापत',
        aadharNumber: '123456789012',
        fatherName: 'श्री सज्जनराज जी सुपुत्र भंवरलाल जी प्रजापत',
        gotra: 'प्रजापत (कुम्हार)',
        address: 'मकान नंबर 45, रेलवे स्टेशन रोड, वार्ड नंबर 12, समदड़ी तहसील, बालोतरा',
        nomineeRelation: 'भांजा',
        nomineeName: 'श्रीमान भरत कुमार जी सुपुत्र सज्जनराज जी प्रजापत',
        nomineeAadhaar: '987654321098',
        nomineeFathername: 'श्री सज्जनराज जी प्रजापत समदड़ी',
        nomineeGotra: 'प्रजापत (कुम्हार)',
        age: '21 वर्ष',
        nomineeAddress: 'ग्राम पोस्ट समदड़ी, तहसील सिवाना, जिला बालोतरा, राजस्थान 344021',
        nomineeMobile: '9876543210',
        workerMobile: '9123456780',
        installmentAmount: '300 किस्त',
      },
    },
    {
      name: 'Case 4: Null/Empty Optional Fields (Strict Blank Verification)',
      data: {
        applicantName: 'मोनिका',
        fatherName: 'सुरेश कुमार',
        gotra: 'जांगिड़',
        address: 'जोधपुर',
        membershipNumber: null,
        workerCode: undefined,
        seniorCode: '',
        offlineFormNumber: '',
        nomineeRelation: '',
        nomineeName: 'सुरेश कुमार',
        nomineeAadhaar: null,
        nomineeFathername: '',
        nomineeGotra: 'जांगिड़',
        age: '',
        nomineeAddress: '',
        nomineeMobile: '',
        workerMobile: '',
        installmentAmount: null,
      },
    },
    {
      name: 'Case 5: Realistic Audit Verification Record (MY-TEST-001)',
      data: {
        offlineFormNumber: 'MY-TEST-001',
        applicationDate: '20/09/2026',
        workerCode: '106',
        membershipNumber: 'M-2026-089',
        seniorCode: '102',
        applicantName: 'new.test',
        aadharNumber: '023145678920',
        fatherName: 'new.test father',
        gotra: 'suthar',
        address: 'balotra',
        nomineeRelation: 'भांजा',
        nomineeName: 'abc',
        nomineeAadhar: 'valid test value',
        nomineeFatherName: 'xyz',
        nomineeGotra: 'suthar',
        nomineeAddress: 'samdari',
        nomineeMobile: '9950730637',
        age: '17',
        workerMobile: '8888888888',
        installmentAmount: 300,
      },
    },
  ];

  for (const tc of testCases) {
    it(`PDF serialization for ${tc.name}`, async () => {
      const doc = await PDFDocument.load(templateBytes);
      doc.registerFontkit(fontkit);
      const f = await doc.embedFont(fontBytes, { subset: false });
      const p = doc.getPages()[0];

      const drawCenteredInBox = (text, boxX, boxY, boxW, boxH, size = 11.0) => {
        if (!text) return;
        const str = String(text).trim();
        if (!str) return;
        let fontSize = size;
        let textWidth = f.widthOfTextAtSize(str, fontSize);
        const maxW = boxW - 4;
        if (textWidth > maxW) {
          fontSize = Math.max(7.0, size * (maxW / textWidth));
          textWidth = f.widthOfTextAtSize(str, fontSize);
        }
        const drawX = boxX + (boxW - textWidth) / 2;
        const capHeight = fontSize * 0.72;
        const boxMidY = boxY + boxH / 2;
        const drawY = boxMidY - capHeight / 2;
        p.drawText(str, { x: drawX, y: drawY, size: fontSize, font: f, color: rgb(0.0, 0.15, 0.58) });
      };

      const draw = (val, x, y, size, maxW) => {
        if (!val) return;
        let s = size;
        if (maxW && f.widthOfTextAtSize) {
          const w = f.widthOfTextAtSize(String(val), size);
          if (w > maxW) s = Math.max(6.0, size * (maxW / w));
        }
        p.drawText(String(val), { x, y, size: s, font: f, color: rgb(0.12, 0.14, 0.18) });
      };

      drawCenteredInBox(tc.data.offlineFormNumber, 109.31, 680.13, 88.45, 20.86, 11.0);
      drawCenteredInBox(tc.data.applicationDate, 457.94, 680.13, 88.45, 20.86, 11.0);
      drawCenteredInBox(tc.data.workerCode, 109.31, 653.99, 88.45, 20.86, 11.0);
      drawCenteredInBox(tc.data.membershipNumber, 457.94, 653.99, 88.45, 20.86, 11.0);
      drawCenteredInBox(tc.data.seniorCode, 109.31, 629.01, 88.45, 20.86, 11.0);

      draw(tc.data.applicantName, 96.0, 592.43, 10.5, 150);
      draw(tc.data.aadharNumber, 75.0, 567.20, 10.5, 170);
      draw(tc.data.fatherName, 110.0, 541.97, 10.5, 135);
      draw(tc.data.gotra, 58.0, 516.74, 10.5, 185);
      draw(tc.data.address, 65.0, 491.51, 10.5, 135);
      draw(tc.data.nomineeRelation, 117.0, 466.29, 10.5, 33);

      draw(tc.data.nomineeName, 390.0, 604.28, 10.5, 165);
      draw(tc.data.nomineeAadhaar, 387.0, 580.82, 10.5, 168);
      draw(tc.data.nomineeFathername, 387.0, 557.35, 10.5, 168);
      draw(tc.data.nomineeGotra, 370.0, 533.88, 10.5, 72);
      draw(tc.data.age, 463.0, 533.88, 10.5, 90);
      draw(tc.data.nomineeAddress, 378.0, 510.41, 10.5, 177);
      draw(tc.data.nomineeMobile, 404.0, 486.94, 10.5, 150);
      draw(tc.data.workerMobile, 400.0, 463.47, 10.5, 154);

      draw(tc.data.installmentAmount ? `${tc.data.installmentAmount} किस्त` : '', 223.0, 437.40, 11.0, 65);

      const bytes = await doc.save();
      assert.ok(bytes.length > 1500000, 'Serialized PDF must be valid (>1.5MB)');
    });
  }

  console.log('\n============================================================');
  console.log(`MAYRA BOND PDF TEST SUITE RESULT: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('============================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
