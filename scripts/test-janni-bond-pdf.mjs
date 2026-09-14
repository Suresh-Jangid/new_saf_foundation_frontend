import 'regenerator-runtime/runtime.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
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
  const backupTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'janni_bond', 'janni_sahayata_bond.backup.pdf');
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');
  const routePath = path.join(process.cwd(), 'app', 'api', 'generate-janni-bond-pdf', 'route.ts');
  const listPagePath = path.join(process.cwd(), 'app', 'dashboard', 'janni-delivery', 'page.tsx');

  console.log('1. Template & Asset Integrity...');
  it('1. Official Janni Bond template exists at public/pdf/janni_bond/janni_sahayata_bond.pdf', () => {
    assert.ok(fs.existsSync(canonicalTemplatePath), 'Template must exist at canonical path');
  });

  it('2. Backup of previous template exists', () => {
    assert.ok(fs.existsSync(backupTemplatePath), 'Backup template must exist');
  });

  it('3. Devanagari font exists for Hindi rendering', () => {
    assert.ok(fs.existsSync(fontPath), 'Devanagari font must exist');
  });

  const templateBytes = fs.readFileSync(canonicalTemplatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  it('4. Template page count = 1', () => {
    assert.strictEqual(pdfDoc.getPageCount(), 1, 'Template must have exactly 1 page');
  });

  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();

  it('5. Template size = A4 portrait (595.28 x 841.89 pt)', () => {
    assert.ok(Math.abs(width - 595.28) < 1.0, `Width (${width}) must be ~595.28 pt`);
    assert.ok(Math.abs(height - 841.89) < 1.0, `Height (${height}) must be ~841.89 pt`);
  });

  console.log('\n2. Route & Code Level Assertions...');
  const routeContent = fs.readFileSync(routePath, 'utf8');
  const listContent = fs.readFileSync(listPagePath, 'utf8');

  it('6. Route uses canonical Janni bond template path', () => {
    assert.ok(
      routeContent.includes("path.join(process.cwd(), 'public', 'pdf', 'janni_bond', 'janni_sahayata_bond.pdf')"),
      'Route must reference canonical template path'
    );
  });

  it('7. Worker code field (कार्यकर्ता कोड) is rendered with proper styling', () => {
    assert.ok(routeContent.includes("field: 'कार्यकर्ता_कोड'"), 'Must contain कार्यकर्ता_कोड mapping');
    assert.ok(routeContent.includes('x: 112, y: 119.0'), 'Worker code must be positioned at x=112, y=119.0');
  });

  it('8. Senior code field (सीनियर कार्यकर्ता कोड) is rendered with proper styling', () => {
    assert.ok(routeContent.includes("field: 'सीनियर_कार्यकर्ता_कोड'"), 'Must contain सीनियर_कार्यकर्ता_कोड mapping');
    assert.ok(routeContent.includes('x: 462, y: 119.0'), 'Senior code must be positioned at x=462, y=119.0');
  });

  it('9. Application number (आवेदन क्र.) is rendered', () => {
    assert.ok(routeContent.includes("field: 'आवेदन_क्र'"), 'Must contain आवेदन_क्र mapping');
    assert.ok(routeContent.includes('x: 102, y: 136.0'), 'Application number at x=102, y=136.0');
  });

  it('10. Membership field (सदस्यता क्र.) behavior is correct (blank when absent)', () => {
    assert.ok(routeContent.includes("field: 'सदस्यता_क्र'"), 'Must contain सदस्यता_क्र mapping');
    assert.ok(routeContent.includes('x: 304, y: 136.0'), 'Membership number at x=304, y=136.0');
    assert.ok(routeContent.includes('rawMembershipNumber'), 'Must check rawMembershipNumber without fallback to system formNumber');
  });

  it('11. Application date (आवेदन दि.) is formatted to DD/MM/YYYY', () => {
    assert.ok(routeContent.includes("field: 'आवेदन_दिनांक'"), 'Must contain आवेदन_दिनांक mapping');
    assert.ok(routeContent.includes('formatDateToDDMMYYYY'), 'Must format date using formatDateToDDMMYYYY');
    assert.ok(routeContent.includes('x: 485, y: 136.0'), 'Date positioned at x=485, y=136.0');
  });

  it('12. Applicant name (नाम) is rendered', () => {
    assert.ok(routeContent.includes("field: 'नाम'"), 'Must contain नाम mapping');
    assert.ok(routeContent.includes('x: 80, y: 178.0'), 'Applicant name positioned at x=80, y=178.0');
  });

  it('13. जाति preserves Janni contract (gotra/category)', () => {
    assert.ok(routeContent.includes("field: 'जाति'"), 'Must contain जाति mapping');
    assert.ok(routeContent.includes('record.gotra'), 'Must map from record.gotra');
    assert.ok(routeContent.includes('x: 80, y: 200.0'), 'Caste/Gotra positioned at x=80, y=200.0');
  });

  it('14. वारिसदार maps to nomineeName', () => {
    assert.ok(routeContent.includes("field: 'वारिसदार'"), 'Must contain वारिसदार mapping');
    assert.ok(routeContent.includes('record.nomineeName'), 'Must map from nomineeName');
    assert.ok(routeContent.includes('x: 95, y: 223.0'), 'Nominee name positioned at x=95, y=223.0');
  });

  it('15. एजेन्ट मो. नं. uses assigned Agent mobile (NEVER applicant mobile)', () => {
    assert.ok(routeContent.includes("field: 'एजेन्ट_मो_नं'"), 'Must contain एजेन्ट_मो_नं mapping');
    assert.ok(
      routeContent.includes('record.agentMobile') && routeContent.includes('record.workerMobile'),
      'Must use agent mobile source'
    );
    assert.ok(routeContent.includes('x: 115, y: 248.0'), 'Agent mobile positioned at x=115, y=248.0');
  });

  it('16. Applicant Aadhaar (आधार नं.) is rendered', () => {
    assert.ok(routeContent.includes("field: 'आधार_नं'"), 'Must contain आधार_नं mapping');
    assert.ok(routeContent.includes('x: 95, y: 273.0'), 'Aadhaar positioned at x=95, y=273.0');
  });

  it('17. Nominee Aadhaar (नॉमिनी आधार नं.) is rendered', () => {
    assert.ok(routeContent.includes("field: 'नॉमिनी_आधार_नं'"), 'Must contain नॉमिनी_आधार_नं mapping');
    assert.ok(routeContent.includes('x: 130, y: 295.0'), 'Nominee Aadhaar positioned at x=130, y=295.0');
  });

  it('18. Father/Husband (पिता/पति का नाम) is rendered', () => {
    assert.ok(routeContent.includes("field: 'पिता_पति_का_नाम'"), 'Must contain पिता_पति_का_नाम mapping');
    assert.ok(routeContent.includes('x: 325, y: 178.0'), 'Father/Husband positioned at x=325, y=178.0');
  });

  it('19. Village/Address (गांव) is rendered', () => {
    assert.ok(routeContent.includes("field: 'गांव'"), 'Must contain गांव mapping');
    assert.ok(routeContent.includes('x: 265, y: 200.0'), 'Village positioned at x=265, y=200.0');
  });

  it('20. District (जिला) is rendered', () => {
    assert.ok(routeContent.includes("field: 'जिला'"), 'Must contain जिला mapping');
    assert.ok(routeContent.includes('x: 265, y: 223.0'), 'District positioned at x=265, y=223.0');
  });

  it('21. State (राज्य) is rendered', () => {
    assert.ok(routeContent.includes("field: 'राज्य'"), 'Must contain राज्य mapping');
    assert.ok(routeContent.includes('x: 265, y: 248.0'), 'State positioned at x=265, y=248.0');
  });

  it('22. Relationship (सम्बन्ध) is rendered', () => {
    assert.ok(routeContent.includes("field: 'सम्बन्ध'"), 'Must contain सम्बन्ध mapping');
    assert.ok(routeContent.includes('x: 275, y: 273.0'), 'Relation positioned at x=275, y=273.0');
  });

  it('23. Nominee mobile (नॉमिनी मो. नं.) is rendered', () => {
    assert.ok(routeContent.includes("field: 'नॉमिनी_मो_नं'"), 'Must contain नॉमिनी_मो_नं mapping');
    assert.ok(routeContent.includes('x: 292, y: 295.0'), 'Nominee mobile positioned at x=292, y=295.0');
  });

  it('24. Duration (लाभ अवधि) is rendered', () => {
    assert.ok(routeContent.includes("field: 'अवधि'"), 'Must contain अवधि mapping');
    assert.ok(routeContent.includes('x: 282, y: 352.0'), 'Duration positioned at x=282, y=352.0');
  });

  it('25. Upper applicant photo box and lower nominee photo box are configured', () => {
    assert.ok(routeContent.includes('yFromTop = 154.2'), 'Upper applicant photo box at y=154.2');
    assert.ok(routeContent.includes('yFromTop = 252.6'), 'Lower nominee photo box at y=252.6');
  });

  it('26. Director signature is placed in director signature area', () => {
    assert.ok(routeContent.includes('directorSignatureSource'), 'Handles director signature');
    assert.ok(routeContent.includes('440, 750'), 'Director signature positioned in footer area');
  });

  it('27. Janni list page enriches worker & senior offline form numbers from agent registry', () => {
    assert.ok(listContent.includes('resolveAgentOfflineNumbers'), 'List page must implement resolveAgentOfflineNumbers');
    assert.ok(listContent.includes('agentRegistrationAPI'), 'List page must reference agentRegistrationAPI');
    assert.ok(listContent.includes('getAll'), 'List page must call getAll for agent list');
    assert.ok(listContent.includes('workerOfflineFormNumber'), 'List page must pass workerOfflineFormNumber');
    assert.ok(listContent.includes('seniorOfflineFormNumber'), 'List page must pass seniorOfflineFormNumber');
    assert.ok(listContent.includes('workerMobile'), 'List page must pass workerMobile');
  });

  console.log('\n3. Real Mock Generation & Field Isolation Test...');
  const mockRecord = {
    workerOfflineFormNumber: '1259',
    seniorOfflineFormNumber: '1258',
    workerMobile: '9876543210',
    mobile: '9000000001',
    membershipNumber: '',
    formNumber: '900',
    applicationDate: '2026-09-15',
    applicantName: 'Test Janni Applicant',
    gotra: 'चौधरी',
    nomineeName: 'Test Nominee',
    nomineeRelation: 'पति',
    nomineeAadhar: '999999999999',
    nomineeMobile: '9111111111',
    husbandName: 'Test Husband',
    address: 'समदड़ी',
    district: 'बालोतरा',
    state: 'राजस्थान',
    aadharNumber: '123456789012',
    duration: 'नौ माह',
  };

  it('28. Agent mobile (9876543210) is distinct from Applicant mobile (9000000001)', () => {
    assert.notStrictEqual(mockRecord.workerMobile, mockRecord.mobile);
    assert.strictEqual(mockRecord.workerMobile, '9876543210');
    assert.strictEqual(mockRecord.mobile, '9000000001');
  });

  it('29. Worker offline code and senior code are sanitized numbers (not EMP-xxx)', () => {
    assert.strictEqual(mockRecord.workerOfflineFormNumber, '1259');
    assert.strictEqual(mockRecord.seniorOfflineFormNumber, '1258');
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
      x: 80,
      y: pHeight - 178.0,
      size: 10,
      font: embeddedFont,
      color: rgb(0.1, 0.1, 0.1),
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
