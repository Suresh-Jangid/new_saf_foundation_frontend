/**
 * SAF Foundation — Centralized Image Optimization & Compression Configuration
 *
 * Configurable defaults designed to maximize storage efficiency in ImageKit
 * while strictly preserving >= 300 DPI print quality in generated PDFs.
 */

export interface ImageOptimizerConfig {
  /** Master switch for automatic upload compression */
  enabled: boolean;
  /** Mozjpeg quality for photographs & scans (1-100) */
  jpegQuality: number;
  /** PNG compression quality for transparent graphics (1-100) */
  pngQuality: number;
  /** WebP compression quality (1-100) */
  webpQuality: number;
  /** Maximum pixel dimension for photographs (passport, nominee, profile) */
  maxPhotoDimension: number;
  /** Maximum pixel dimension for document scans (Aadhaar, affidavits, certificates) */
  maxDocumentDimension: number;
  /** Minimum resolution floor for photographs (ensures print DPI is never compromised) */
  minPhotoDimension: number;
  /** Minimum resolution floor for document scans */
  minDocumentDimension: number;
  /** Target print DPI across output PDFs */
  pdfPrintDpiTarget: number;
  /** Skip re-compressing images already under this byte size if dimensions are compliant */
  skipCompressionThresholdBytes: number;
}

export function getImageOptimizerConfig(): ImageOptimizerConfig {
  const parseNum = (val: string | undefined, fallback: number): number => {
    if (!val) return fallback;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? fallback : parsed;
  };

  return {
    enabled: process.env.IMAGE_OPTIMIZATION_ENABLED !== "false",
    jpegQuality: parseNum(process.env.IMAGE_JPEG_QUALITY, 85),
    pngQuality: parseNum(process.env.IMAGE_PNG_QUALITY, 85),
    webpQuality: parseNum(process.env.IMAGE_WEBP_QUALITY, 85),
    // 1600px allows up to 13.5cm prints at 300 DPI (or >800 DPI at 4x5cm photo box)
    maxPhotoDimension: parseNum(process.env.IMAGE_MAX_PHOTO_DIM, 1600),
    // 2400px allows full A4 width prints (21cm / 8.27in) at ~290 DPI with crisp text
    maxDocumentDimension: parseNum(process.env.IMAGE_MAX_DOC_DIM, 2400),
    minPhotoDimension: 600,
    minDocumentDimension: 1200,
    pdfPrintDpiTarget: parseNum(process.env.IMAGE_PDF_DPI_TARGET, 300),
    // 80 KB threshold: avoids recompressing already tiny optimized assets
    skipCompressionThresholdBytes: 80 * 1024,
  };
}
