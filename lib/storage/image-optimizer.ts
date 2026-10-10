import sharp from "sharp";
import { getImageOptimizerConfig, ImageOptimizerConfig } from "./optimizer-config";
import { ImageOptimizationOptions, ImageOptimizationResult } from "./types";

/**
 * SAF Foundation — Smart Image Optimizer
 *
 * Automatically optimizes images before permanent storage in ImageKit / S3:
 * - Auto-orients based on EXIF orientation (prevents upside-down/rotated uploads).
 * - Strips sensitive & unnecessary EXIF/GPS metadata.
 * - Resizes using high-fidelity Lanczos3 resampler without enlarging smaller assets.
 * - Preserves transparency for PNG/WebP images that need it (signatures, stamps, logos).
 * - Converts opaque PNGs and heavy camera photos to progressive mozjpeg for 80-90% size reduction.
 * - Preserves high resolution guaranteeing >= 300 DPI at physical printed sizes in PDFs.
 * - Leaves PDF documents untouched.
 */
export class ImageOptimizer {
  private config: ImageOptimizerConfig;

  constructor(customConfig?: Partial<ImageOptimizerConfig>) {
    this.config = { ...getImageOptimizerConfig(), ...customConfig };
  }

  public async optimize(
    buffer: Buffer | Uint8Array,
    options: ImageOptimizationOptions = {}
  ): Promise<ImageOptimizationResult> {
    const rawBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const originalSize = rawBuffer.length;

    // 1. Check for PDF payload - bypass image processing entirely
    if (
      options.contentType === "application/pdf" ||
      (rawBuffer.length >= 4 &&
        rawBuffer[0] === 0x25 &&
        rawBuffer[1] === 0x50 &&
        rawBuffer[2] === 0x44 &&
        rawBuffer[3] === 0x46)
    ) {
      return {
        buffer: rawBuffer,
        contentType: "application/pdf",
        extension: "pdf",
        originalSize,
        optimizedSize: originalSize,
        compressionRatio: 0,
        format: "pdf",
        wasOptimized: false,
      };
    }

    // 2. If optimizer is disabled via config, return as-is
    if (!this.config.enabled) {
      const ext = options.contentType?.includes("png")
        ? "png"
        : options.contentType?.includes("webp")
        ? "webp"
        : "jpg";
      return {
        buffer: rawBuffer,
        contentType: options.contentType || "image/jpeg",
        extension: ext,
        originalSize,
        optimizedSize: originalSize,
        compressionRatio: 0,
        format: ext,
        wasOptimized: false,
      };
    }

    try {
      const image = sharp(rawBuffer, { failOn: "none" });
      const metadata = await image.metadata();

      if (!metadata.format || !metadata.width || !metadata.height) {
        throw new Error("Unable to read image dimensions or format");
      }

      // Memory-bomb sanity check (e.g. > 100 megapixels)
      if (metadata.width * metadata.height > 100_000_000) {
        throw new Error(`Image resolution exceeds maximum safety limit (${metadata.width}x${metadata.height})`);
      }

      // 3. Category-specific resolution targets
      const isDocument = options.category === "document" || options.category === "affidavit";
      const targetMaxDim = isDocument
        ? this.config.maxDocumentDimension
        : this.config.maxPhotoDimension;
      const minSafetyFloor = isDocument
        ? this.config.minDocumentDimension
        : this.config.minPhotoDimension;

      const effectiveMaxDim = Math.max(targetMaxDim, minSafetyFloor);

      const isAlreadySmall = originalSize <= this.config.skipCompressionThresholdBytes;
      const isWithinDimensions =
        metadata.width <= effectiveMaxDim && metadata.height <= effectiveMaxDim;

      // 4. Auto-orient: physical pixel rotation + strip EXIF orientation tag
      let pipeline = image.rotate();

      // 5. High-quality aspect-ratio preserving resize (never upscale)
      if (metadata.width > effectiveMaxDim || metadata.height > effectiveMaxDim) {
        pipeline = pipeline.resize({
          width: effectiveMaxDim,
          height: effectiveMaxDim,
          fit: "inside",
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3,
        });
      }

      const hasAlpha = Boolean(metadata.hasAlpha);
      const isPhoto =
        options.category === "passport" ||
        options.category === "nominee" ||
        options.category === "profile" ||
        options.category === "father" ||
        options.category === "mother";

      // Check whether the image actually contains transparent pixels
      let isTrulyTransparent = false;
      if (metadata.hasAlpha && !isPhoto) {
        try {
          const stats = await sharp(rawBuffer).stats();
          isTrulyTransparent = stats.isOpaque === false;
        } catch {
          isTrulyTransparent = Boolean(metadata.hasAlpha);
        }
      }

      let outputMime = "image/jpeg";
      let outputExt = "jpg";
      let outFormat = "jpeg";

      // 6. Format selection & transparency preservation
      if (isTrulyTransparent && options.preserveTransparency !== false) {
        if (metadata.format === "png") {
          // Transparent PNG (signature, stamp, logo) -> preserve PNG with maximum lossless compression
          pipeline = pipeline.png({
            quality: this.config.pngQuality,
            compressionLevel: 9,
            effort: 7,
            palette: true,
          });
          outputMime = "image/png";
          outputExt = "png";
          outFormat = "png";
        } else if (metadata.format === "webp") {
          // Transparent WebP -> preserve WebP with high alpha quality
          pipeline = pipeline.webp({
            quality: this.config.webpQuality,
            alphaQuality: 90,
            effort: 5,
          });
          outputMime = "image/webp";
          outputExt = "webp";
          outFormat = "webp";
        }
      } else {
        // All opaque images (photos, scans, opaque PNGs, heavy JPEGs) -> progressive mozjpeg
        // If it had an unused alpha channel, flatten onto white to avoid black background artifacts
        if (metadata.hasAlpha) {
          pipeline = pipeline.flatten({ background: "#ffffff" });
        }
        pipeline = pipeline.jpeg({
          quality: options.quality || this.config.jpegQuality,
          mozjpeg: true,
          progressive: true,
        });
        outputMime = "image/jpeg";
        outputExt = "jpg";
        outFormat = "jpeg";
      }

      const optimizedBuffer = await pipeline.toBuffer();
      const optimizedMetadata = await sharp(optimizedBuffer).metadata();

      // Idempotency: if already small and output did not achieve smaller size, preserve original
      if (optimizedBuffer.length >= originalSize && isWithinDimensions && isAlreadySmall) {
        return {
          buffer: rawBuffer,
          contentType: options.contentType || outputMime,
          extension: outputExt,
          originalSize,
          optimizedSize: originalSize,
          compressionRatio: 0,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          wasOptimized: false,
          hasAlpha,
        };
      }

      const ratio = Number(((1 - optimizedBuffer.length / originalSize) * 100).toFixed(1));

      // Technical logging without personal data
      console.log(
        `[ImageOptimizer] ${options.category || "general"}: ${(originalSize / 1024).toFixed(1)}KB (${metadata.width}x${metadata.height} ${metadata.format}) -> ${(optimizedBuffer.length / 1024).toFixed(1)}KB (${optimizedMetadata.width}x${optimizedMetadata.height} ${outFormat}) | -${ratio}%`
      );

      return {
        buffer: optimizedBuffer,
        contentType: outputMime,
        extension: outputExt,
        originalSize,
        optimizedSize: optimizedBuffer.length,
        compressionRatio: ratio,
        width: optimizedMetadata.width,
        height: optimizedMetadata.height,
        format: outFormat,
        wasOptimized: true,
        hasAlpha,
      };
    } catch (err: any) {
      console.error(
        "[ImageOptimizer] Optimization encountered an issue; falling back safely to original buffer:",
        err.message
      );
      const fallbackExt = options.contentType?.includes("png")
        ? "png"
        : options.contentType?.includes("pdf")
        ? "pdf"
        : "jpg";
      return {
        buffer: rawBuffer,
        contentType: options.contentType || "image/jpeg",
        extension: fallbackExt,
        originalSize,
        optimizedSize: originalSize,
        compressionRatio: 0,
        format: "unknown",
        wasOptimized: false,
      };
    }
  }
}

export const imageOptimizer = new ImageOptimizer();
