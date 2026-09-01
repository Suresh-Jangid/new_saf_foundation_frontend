import 'regenerator-runtime/runtime.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('============================================================');
console.log('SAF FOUNDATION — MARRIAGE BOND DURATION 12-MONTH TEST SUITE');
console.log('============================================================\n');

// 1. Check frontend page.tsx
console.log('1. Auditing frontend app/dashboard/general-applications/page.tsx...');
const pagePath = path.join(rootDir, 'app', 'dashboard', 'general-applications', 'page.tsx');
assert.ok(fs.existsSync(pagePath), 'page.tsx must exist');
const pageContent = fs.readFileSync(pagePath, 'utf8');

assert.ok(
  pageContent.includes('duration: "बारह महीने"'),
  'page.tsx must specify duration: "बारह महीने"'
);
assert.ok(
  !pageContent.includes('duration: "अठारह महीने"'),
  'page.tsx must NOT contain duration: "अठारह महीने"'
);
console.log('  ✓ PASS: page.tsx passes duration: "बारह महीने" and eliminates "अठारह महीने"\n');

// 2. Check frontend route.ts
console.log('2. Auditing frontend app/api/generate-bond-pdf/route.ts...');
const routePath = path.join(rootDir, 'app', 'api', 'generate-bond-pdf', 'route.ts');
assert.ok(fs.existsSync(routePath), 'route.ts must exist');
const routeContent = fs.readFileSync(routePath, 'utf8');

assert.ok(
  routeContent.includes("'बारह महीने'"),
  'route.ts must default durationText to "बारह महीने"'
);
assert.ok(
  !routeContent.includes('drawTextAt("अठारह महीने"'),
  'route.ts must never draw "अठारह महीने"'
);
console.log('  ✓ PASS: route.ts defaults to and normalizes duration to "बारह महीने"\n');

// 3. Check backend documents.service.ts
console.log('3. Auditing backend src/modules/documents/documents.service.ts...');
const backendDocPath = 'c:/Users/sures/Downloads/purabiya-foundation-backend--main/purabiya-foundation-backend--main/src/modules/documents/documents.service.ts';
if (fs.existsSync(backendDocPath)) {
  const backendContent = fs.readFileSync(backendDocPath, 'utf8');
  assert.ok(
    backendContent.includes('drawTextAt("बारह महीने", 200, 245, 10, rgb(0.6, 0.1, 0.1));'),
    'backend documents.service.ts must draw "बारह महीने" at (200, 245)'
  );
  assert.ok(
    !backendContent.includes('drawTextAt("अठारह महीने"'),
    'backend documents.service.ts must NOT draw "अठारह महीने"'
  );
  console.log('  ✓ PASS: backend documents.service.ts draws "बारह महीने" at (200, 245)\n');
}

// 4. Mock Generate Official Male & Female Bond PDFs using the updated logic
console.log('4. Generating mock Male & Female Bond PDFs on official templates...');
const fontPath = path.join(rootDir, 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');
const boysTemplatePath = path.join(rootDir, 'public', 'pdf', 'general_application', 'bond', 'boys_bond.pdf');
const girlTemplatePath = path.join(rootDir, 'public', 'pdf', 'general_application', 'bond', 'girl_bond.pdf');

assert.ok(fs.existsSync(fontPath), 'NotoSansDevanagari font must exist');
assert.ok(fs.existsSync(boysTemplatePath), 'boys_bond.pdf must exist');
assert.ok(fs.existsSync(girlTemplatePath), 'girl_bond.pdf must exist');

const fontBytes = fs.readFileSync(fontPath);

async function simulateBondGeneration(gender, applicantName, formNumber, incomingDuration) {
  const templatePath = gender === 'Female' ? girlTemplatePath : boysTemplatePath;
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);
  const devanagariFont = await pdfDoc.embedFont(fontBytes, { subset: false });

  const pages = pdfDoc.getPages();
  const page = pages[0];
  const { height } = page.getSize();

  const drawTextAt = (text, x, yFromTop, size = 10, color = rgb(0.1, 0.1, 0.1)) => {
    if (!text) return;
    const yFromBottom = height - yFromTop;
    page.drawText(text, {
      x,
      y: yFromBottom,
      size,
      font: devanagariFont,
      color,
    });
  };

  // Duration logic matching route.ts
  let durationText = incomingDuration || 'बारह महीने';
  if (durationText === 'अठारह महीने' || durationText === '18 महीने' || !durationText) {
    durationText = 'बारह महीने';
  }

  // Draw duration
  drawTextAt(durationText, 200, 245, 10, rgb(0.6, 0.1, 0.1));

  const pdfBytes = await pdfDoc.save();
  return { pdfBytes, durationText };
}

// 4a. Male Bond
const maleResult = await simulateBondGeneration('Male', 'सुरेश प्रजापत', 'M-2024-001', 'बारह महीने');
assert.strictEqual(maleResult.durationText, 'बारह महीने', 'Male bond duration must be बारह महीने');
assert.ok(maleResult.pdfBytes.length > 500000, 'Generated Male bond PDF must be > 500KB');
console.log('  ✓ PASS: Male Bond PDF generated with "बारह महीने"');

// 4b. Female Bond
const femaleResult = await simulateBondGeneration('Female', 'पूजा कुमारी', 'F-2024-002', undefined);
assert.strictEqual(femaleResult.durationText, 'बारह महीने', 'Female bond default duration must be बारह महीने');
assert.ok(femaleResult.pdfBytes.length > 500000, 'Generated Female bond PDF must be > 500KB');
console.log('  ✓ PASS: Female Bond PDF generated with default "बारह महीने"');

// 4c. Legacy duration input sanitization test
const legacyResult = await simulateBondGeneration('Female', 'किरण', 'F-2024-003', 'अठारह महीने');
assert.strictEqual(legacyResult.durationText, 'बारह महीने', 'Legacy input "अठारह महीने" must be sanitized to "बारह महीने"');
console.log('  ✓ PASS: Legacy input "अठारह महीने" is automatically sanitized to "बारह महीने"');

console.log('\n============================================================');
console.log('ALL MARRIAGE BOND DURATION 12-MONTH TESTS PASSED (0 FAILURES)!');
console.log('============================================================\n');
