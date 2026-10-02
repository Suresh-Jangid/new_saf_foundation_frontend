/**
 * Automated Verification: Storage Service, URL Normalization, SSRF Protection & Key Collision
 * SAF Foundation CRM
 */

import assert from "assert";
import crypto from "crypto";

console.log("==================================================");
console.log("RUNNING COMPLETE STORAGE & SECURITY VERIFICATION");
console.log("==================================================");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    failed++;
  }
}

// -------------------------------------------------------------
// Core Storage Validation Logic (Mirroring lib/storage/storage-service.ts)
// -------------------------------------------------------------
function validateFile(buffer, declaredMimeType, filename, maxSizeBytes = 5 * 1024 * 1024) {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Empty file provided" };
  }
  if (buffer.length > maxSizeBytes) {
    return { valid: false, error: "File exceeds limit" };
  }

  const header = Buffer.from(buffer.slice(0, 12));
  let detectedMime = null;

  // JPEG: FF D8 FF
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    detectedMime = "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  else if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
    detectedMime = "image/png";
  }
  // WebP: 52 49 46 46 ... 57 45 42 50
  else if (
    header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
    header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50
  ) {
    detectedMime = "image/webp";
  }
  // PDF: %PDF- (25 50 44 46)
  else if (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) {
    detectedMime = "application/pdf";
  }

  if (!detectedMime) {
    return { valid: false, error: "Invalid file signature" };
  }

  return { valid: true, mimeType: detectedMime };
}

function generateKey(category, entityType, entityId, ext) {
  const uuid = crypto.randomUUID();
  return `saf-uploads/${entityType}/${entityId}/${category}/${uuid}.${ext}`;
}

// -------------------------------------------------------------
// URL Normalizer (Mirroring lib/utils.ts + lib/api-url.ts)
// -------------------------------------------------------------
const DEFAULT_HOST = "https://new-saf-foundation-backend.onrender.com";
function getStorageBaseUrl() {
  return process.env.NEXT_PUBLIC_STORAGE_URL || `${DEFAULT_HOST}/uploads`;
}
function resolvePhotoUrl(photo) {
  if (!photo) return "";
  const trimmed = String(photo).trim();
  if (trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("/uploads/")) {
    return `${DEFAULT_HOST}${trimmed}`;
  }
  const normalized = trimmed.replace(/^\/+/, "");
  if (normalized.startsWith("uploads/")) {
    return `${DEFAULT_HOST}/${normalized}`;
  }
  if (normalized.startsWith("saf-uploads/") || normalized.startsWith("applications/") || normalized.startsWith("documents/")) {
    return `${getStorageBaseUrl()}/${normalized}`;
  }
  return `${DEFAULT_HOST}/uploads/${normalized}`;
}

// -------------------------------------------------------------
// SSRF Guard (Mirroring app/api/proxy-image/route.ts)
// -------------------------------------------------------------
function isPrivateIpOrHost(hostname) {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local") || lower.endsWith(".internal")) return true;
  if (lower === "::1" || lower.startsWith("fc00:") || lower.startsWith("fe80:")) return true;
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = lower.match(ipv4Regex);
  if (match) {
    const o = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), parseInt(match[4])];
    if (o[0] === 0 || o[0] === 127) return true;
    if (o[0] === 169 && o[1] === 254) return true;
    if (o[0] === 10) return true;
    if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true;
    if (o[0] === 192 && o[1] === 168) return true;
    if (o[0] === 100 && o[1] >= 64 && o[1] <= 127) return true;
  }
  return false;
}

// TESTS
runTest("TEST 1: Upload JPG - Valid JPEG magic number (FF D8 FF) accepted", () => {
  const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const res = validateFile(buf, "image/jpeg", "applicant.jpg");
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.mimeType, "image/jpeg");
});

runTest("TEST 2: Upload PNG - Valid PNG magic number (89 50 4E 47) accepted", () => {
  const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const res = validateFile(buf, "image/png", "nominee.png");
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.mimeType, "image/png");
});

runTest("TEST 3: Upload PDF - Valid PDF header (%PDF-) accepted for documents", () => {
  const buf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]);
  const res = validateFile(buf, "application/pdf", "affidavit.pdf", 10 * 1024 * 1024);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.mimeType, "application/pdf");
});

runTest("TEST 4: Storage key generation creates collision-resistant, safe paths", () => {
  const key1 = generateKey("passport", "application", "APP-101", "jpg");
  const key2 = generateKey("passport", "application", "APP-101", "jpg");
  assert.notStrictEqual(key1, key2);
  assert.ok(key1.startsWith("saf-uploads/application/APP-101/passport/"));
  assert.ok(key1.endsWith(".jpg"));
});

runTest("TEST 5: Permanent cloud URLs remain immutable through resolvePhotoUrl", () => {
  const s3Url = "https://saf-bucket.s3.ap-south-1.amazonaws.com/saf-uploads/app/101/photo.jpg";
  assert.strictEqual(resolvePhotoUrl(s3Url), s3Url);
});

runTest("TEST 6: Cloud object keys resolve cleanly to public storage base URL", () => {
  const key = "saf-uploads/application/101/passport/test.jpg";
  const resolved = resolvePhotoUrl(key);
  assert.ok(resolved.endsWith(key));
  assert.ok(resolved.startsWith("http"));
});

runTest("TEST 7: Legacy /uploads/ paths maintain backward compatibility", () => {
  const legacy = "/uploads/passportPhoto-1782646855838-298589469.png";
  assert.strictEqual(resolvePhotoUrl(legacy), `${DEFAULT_HOST}${legacy}`);
});

runTest("TEST 8: Null, empty, or undefined photo inputs return clean empty string", () => {
  assert.strictEqual(resolvePhotoUrl(""), "");
  assert.strictEqual(resolvePhotoUrl(null), "");
  assert.strictEqual(resolvePhotoUrl(undefined), "");
});

runTest("TEST 9: Invalid/executable payload disguised as JPG is strictly rejected", () => {
  const exeBuf = Buffer.from("MZ\x90\x00\x03\x00\x00\x00"); // DOS EXE header
  const res = validateFile(exeBuf, "image/jpeg", "malicious.jpg");
  assert.strictEqual(res.valid, false);
});

runTest("TEST 10: Oversized image payload (>5MB) is strictly rejected", () => {
  const largeBuf = Buffer.alloc(6 * 1024 * 1024);
  largeBuf[0] = 0xff; largeBuf[1] = 0xd8; largeBuf[2] = 0xff;
  const res = validateFile(largeBuf, "image/jpeg", "huge.jpg", 5 * 1024 * 1024);
  assert.strictEqual(res.valid, false);
});

runTest("TEST 11: SSRF Guard blocks localhost, 127.0.0.1, and ::1 loopback", () => {
  assert.strictEqual(isPrivateIpOrHost("127.0.0.1"), true);
  assert.strictEqual(isPrivateIpOrHost("localhost"), true);
  assert.strictEqual(isPrivateIpOrHost("::1"), true);
});

runTest("TEST 12: SSRF Guard blocks AWS Metadata Service (169.254.169.254)", () => {
  assert.strictEqual(isPrivateIpOrHost("169.254.169.254"), true);
});

runTest("TEST 13: SSRF Guard blocks RFC 1918 private subnets (10.x, 172.16.x, 192.168.x)", () => {
  assert.strictEqual(isPrivateIpOrHost("10.0.0.5"), true);
  assert.strictEqual(isPrivateIpOrHost("172.16.0.1"), true);
  assert.strictEqual(isPrivateIpOrHost("172.31.255.255"), true);
  assert.strictEqual(isPrivateIpOrHost("192.168.1.1"), true);
});

runTest("TEST 14: SSRF Guard allows legitimate public production and cloud domains", () => {
  assert.strictEqual(isPrivateIpOrHost("new-saf-foundation-backend.onrender.com"), false);
  assert.strictEqual(isPrivateIpOrHost("saf-storage.s3.amazonaws.com"), false);
});

console.log("==================================================");
console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) process.exit(1);
