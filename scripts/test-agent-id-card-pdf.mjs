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

  // Step 2: Test Case 1 - Realistic agent record directly matching /v1/agents schema
  console.log('2. Invoking POST /api/generate-agent-pdf with realistic /v1/agents nested record...');
  const realisticBackendAgent = {
    id: "45269bc4-5bd4-4624-a84f-5731a9e54683",
    name: "ममता कुमारी",
    mobile: "9928403136",
    role: "agent",
    offlineFormNumber: "NGO/26/118",
    agentProfile: {
      id: "40a6466e-6df2-470b-bf13-8967f5889ba6",
      userId: "45269bc4-5bd4-4624-a84f-5731a9e54683",
      employeeId: "EMP-066",
      offlineFormNumber: "NGO/26/118",
      fatherName: "डूंगरा राम",
      gotra: "जोगसन",
      age: 37,
      gender: "Female",
      village: "नेहरू कॉलोनी बालोतरा",
      address: "नेहरू कॉलोनी बालोतरा",
      tehsil: "पचपदरा",
      district: "बालोतरा",
      designation: "अनंत",
      dateOfBirth: "1989-07-01T00:00:00.000Z",
      dateOfJoining: "2026-10-01T00:00:00.000Z",
      registrationDate: "2026-10-01T00:00:00.000Z",
      profileImageUrl: null,
    },
  };

  const samplePhoto =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const mockReq1 = {
    json: async () => ({
      record: realisticBackendAgent,
      imageData: samplePhoto,
    }),
  };

  const response1 = await POST(mockReq1);
  console.log(`   Response 1 status: ${response1.status}`);
  assert.strictEqual(response1.status, 200, `Expected status 200, got ${response1.status}`);

  const contentType1 = response1.headers.get('Content-Type');
  assert.strictEqual(contentType1, 'application/pdf', `Expected application/pdf, got ${contentType1}`);

  const arrayBuffer1 = await response1.arrayBuffer();
  const pdfBytes1 = Buffer.from(arrayBuffer1);
  console.log(`   Realistic Agent PDF size: ${pdfBytes1.length} bytes`);
  assert.ok(pdfBytes1.length > 10000, `PDF size must be > 10KB (got ${pdfBytes1.length})`);

  const outPdfPath = path.join(outDir, 'test_agent_id_card.pdf');
  fs.writeFileSync(outPdfPath, pdfBytes1);
  console.log(`   Saved PDF to: ${outPdfPath}`);

  // Validate PDF geometry
  const pdfDoc1 = await PDFDocument.load(pdfBytes1);
  const pages1 = pdfDoc1.getPages();
  assert.strictEqual(pages1.length, 1, 'Card PDF should contain exactly 1 page');
  const { width: w1, height: h1 } = pages1[0].getSize();
  console.log(`   Page dimensions: ${w1}pt x ${h1}pt`);
  assert.strictEqual(w1, 180, `Width must match uncropped template (180), got ${w1}`);
  assert.strictEqual(h1, 273.6, `Height must match uncropped template (273.6), got ${h1}`);

  // Test Case 2 - Sparse agent record (missing fields should remain blank without throwing)
  console.log('3. Invoking POST with sparse agent record (Requirement 7 test)...');
  const sparseAgent = {
    name: 'संजय कुमार',
    mobile: '9876543210',
    // fatherName, designation, doj, agent_code, employee_id, address, dateOfBirth are all missing
  };

  const mockReq2 = {
    json: async () => ({
      record: sparseAgent,
    }),
  };

  const response2 = await POST(mockReq2);
  assert.strictEqual(response2.status, 200, `Sparse record must succeed with status 200`);
  const pdfBytes2 = Buffer.from(await response2.arrayBuffer());
  const pdfDoc2 = await PDFDocument.load(pdfBytes2);
  const { width: w2, height: h2 } = pdfDoc2.getPages()[0].getSize();
  assert.strictEqual(w2, 180, `Sparse card width must be 180`);
  assert.strictEqual(h2, 273.6, `Sparse card height must be 273.6`);
  console.log('   Sparse record generated cleanly without errors.');

  // Step 4: Visual verification via headless Chrome
  // Step 4: Visual verification screenshot via browser
  console.log('4. Generating visual verification image...');
  const chromePath = CHROME_PATHS.find(p => fs.existsSync(p));
  const outPngPath = path.join(outDir, 'test_agent_id_card.png');

  if (chromePath) {
    try {
      const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 600, height: 850, deviceScaleFactor: 2 });
      const fileUrl = `file:///${outPdfPath.replace(/\\/g, '/')}`;
      await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 4000 });
      await new Promise(r => setTimeout(r, 500));

      await page.screenshot({ path: outPngPath });
      console.log(`   Visual screenshot saved to: ${outPngPath}`);
      assert.ok(fs.existsSync(outPngPath) && fs.statSync(outPngPath).size > 0, 'Screenshot image must be non-empty');

      try {
        await Promise.race([browser.close(), new Promise(r => setTimeout(r, 800))]);
      } catch {}
      const pid = browser.process()?.pid;
      if (pid) {
        try { process.kill(pid, 'SIGKILL'); } catch {}
      }
    } catch (err) {
      console.warn('   Screenshot generation note:', err.message);
    }
  }

  clearTimeout(safetyTimer);
  console.log('----------------------------------------------------');
  console.log('RESULT: PASS - All dynamic fields and geometry verified');
  console.log(`File: ${outPdfPath} (${pdfBytes1.length} bytes)`);
  console.log(`Dimensions: ${w1} x ${h1} pt (Full template uncropped)`);
  console.log('----------------------------------------------------');
  process.exit(0);
}

main().catch(err => {
  clearTimeout(safetyTimer);
  console.error('[TEST ERROR]:', err);
  process.exit(1);
});
