import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { execSync } from 'child_process';
import { PDFDocument } from 'pdf-lib';
import puppeteer from 'puppeteer-core';

// Strict safety timeout to prevent hanging indefinitely
const TEST_TIMEOUT_MS = 25000;
const safetyTimer = setTimeout(() => {
  console.error(`[TIMEOUT] Agent ID Card PDF test exceeded ${TEST_TIMEOUT_MS}ms`);
  process.exit(1);
}, TEST_TIMEOUT_MS);

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

async function main() {
  console.log('----------------------------------------------------');
  console.log('RUNNING SMALLEST AGENT ID CARD PDF TEST');
  console.log('----------------------------------------------------');

  const scratchDir = path.resolve('scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const outDir = path.resolve('test-output');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Step 1: Compile route handler to standalone ESM bundle
  console.log('1. Preparing route module...');
  const bundlePath = path.join(scratchDir, 'bundle-agent-pdf-route.mjs');
  execSync(
    'npx esbuild app/api/generate-agent-pdf/route.ts --bundle --platform=node --format=esm --outfile=scratch/bundle-agent-pdf-route.mjs --external:@pdf-lib/fontkit --external:sharp --external:harfbuzzjs',
    { stdio: 'pipe' }
  );

  // Prepend Node ESM banner for __dirname and __filename compatibility
  const banner = "import { fileURLToPath } from 'url';\nimport { dirname } from 'path';\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = dirname(__filename);\n";
  const bundleCode = fs.readFileSync(bundlePath, 'utf8');
  fs.writeFileSync(bundlePath, banner + bundleCode);

  const bundleUrl = `file:///${bundlePath.replace(/\\/g, '/')}`;
  const { POST } = await import(bundleUrl);

  // Step 2: Invoke POST handler with agent data and profile photo
  console.log('2. Invoking POST /api/generate-agent-pdf with agent record & photo...');
  const sampleAgent = {
    name: 'सुरेश जांगिड़',
    fatherName: 'रामेश्वर लाल',
    designation: 'कार्यकर्ता',
    doj: '2026-05-10',
    mobile: '9876543210',
    agent_code: 'SAF-042',
    employee_id: 'EMP-015',
    address: 'समदड़ी, बालोतरा',
    dateOfBirth: '1995-08-15',
  };

  const samplePhoto =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const mockReq = {
    json: async () => ({
      record: sampleAgent,
      imageData: samplePhoto,
    }),
  };

  const response = await POST(mockReq);
  console.log(`   Response status: ${response.status}`);
  assert.strictEqual(response.status, 200, `Expected status 200, got ${response.status}`);

  const contentType = response.headers.get('Content-Type');
  console.log(`   Content-Type: ${contentType}`);
  assert.strictEqual(contentType, 'application/pdf', `Expected application/pdf, got ${contentType}`);

  const arrayBuffer = await response.arrayBuffer();
  const pdfBytes = Buffer.from(arrayBuffer);
  console.log(`   Generated PDF byte length: ${pdfBytes.length} bytes`);
  assert.ok(pdfBytes.length > 10000, `PDF size must be non-zero and > 10KB (got ${pdfBytes.length})`);

  const outPdfPath = path.join(outDir, 'test_agent_id_card.pdf');
  fs.writeFileSync(outPdfPath, pdfBytes);
  console.log(`   Saved PDF to: ${outPdfPath}`);

  // Step 3: Verify PDF page size and uncropped dimensions
  console.log('3. Validating PDF geometry...');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  assert.strictEqual(pages.length, 1, 'Card PDF should contain exactly 1 page');

  const { width, height } = pages[0].getSize();
  console.log(`   Page dimensions: ${width}pt x ${height}pt`);
  assert.strictEqual(width, 180, `Width must match uncropped template (180), got ${width}`);
  assert.strictEqual(height, 273.6, `Height must match uncropped template (273.6), got ${height}`);

  // Step 4: Visual verification via headless Chrome
  console.log('4. Generating visual verification image...');
  const chromePath = CHROME_PATHS.find(p => fs.existsSync(p));
  const outPngPath = path.join(outDir, 'test_agent_id_card.png');

  if (chromePath) {
    const browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 600, height: 850, deviceScaleFactor: 2 });
      const fileUrl = `file:///${outPdfPath.replace(/\\/g, '/')}`;
      await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
      await new Promise(r => setTimeout(r, 800));

      await page.screenshot({ path: outPngPath });
      console.log(`   Visual screenshot saved to: ${outPngPath}`);
      assert.ok(fs.existsSync(outPngPath) && fs.statSync(outPngPath).size > 0, 'Screenshot image must be non-empty');
    } finally {
      try { await page.close(); } catch {}
      try { await browser.close(); } catch {}
      const pid = browser.process()?.pid;
      if (pid) {
        try { process.kill(pid); } catch {}
      }
    }
  }

  clearTimeout(safetyTimer);
  console.log('----------------------------------------------------');
  console.log('RESULT: PASS - Agent ID Card PDF generated without cropping');
  console.log(`File: ${outPdfPath} (${pdfBytes.length} bytes)`);
  console.log(`Dimensions: ${width} x ${height} pt (Full template uncropped)`);
  console.log('----------------------------------------------------');
  process.exit(0);
}

main().catch(err => {
  clearTimeout(safetyTimer);
  console.error('[TEST ERROR]:', err);
  process.exit(1);
});
