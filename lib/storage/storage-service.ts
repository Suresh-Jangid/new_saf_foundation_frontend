import crypto from "crypto";
import path from "path";
import { S3StorageProvider } from "./s3-storage";
import { FileValidationResult, UploadOptions, UploadResult } from "./types";

export class StorageService {
  private static instance: StorageService;
  private s3Provider: S3StorageProvider;

  private constructor() {
    this.s3Provider = new S3StorageProvider();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  public isConfigured(): boolean {
    return this.s3Provider.isConfigured();
  }

  /**
   * Validate file buffer magic numbers, size, and declared MIME type.
   */
  public validateFile(
    buffer: Buffer | Uint8Array,
    declaredMimeType: string,
    filename: string,
    maxSizeBytes: number = 5 * 1024 * 1024
  ): FileValidationResult {
    if (!buffer || buffer.length === 0) {
      return { valid: false, error: "फ़ाइल खाली है / Empty file provided" };
    }

    if (buffer.length > maxSizeBytes) {
      const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
      return {
        valid: false,
        error: `फ़ाइल का आकार अधिकतम ${maxMb}MB हो सकता है / File exceeds ${maxMb}MB limit`,
      };
    }

    // Sanitize filename to prevent path traversal
    const cleanFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "");
    const ext = path.extname(cleanFilename).toLowerCase();

    // Check magic numbers (file signature)
    const header = Buffer.from(buffer.slice(0, 12));
    let detectedMime: string | null = null;

    // JPEG: FF D8 FF
    if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
      detectedMime = "image/jpeg";
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    else if (
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47
    ) {
      detectedMime = "image/png";
    }
    // WebP: 52 49 46 46 ... 57 45 42 50
    else if (
      header[0] === 0x52 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x46 &&
      header[8] === 0x57 &&
      header[9] === 0x45 &&
      header[10] === 0x42 &&
      header[11] === 0x50
    ) {
      detectedMime = "image/webp";
    }
    // PDF: %PDF- (25 50 44 46)
    else if (
      header[0] === 0x25 &&
      header[1] === 0x50 &&
      header[2] === 0x44 &&
      header[3] === 0x46
    ) {
      detectedMime = "application/pdf";
    }

    if (!detectedMime) {
      return {
        valid: false,
        error: "अमान्य फ़ाइल प्रकार (केवल JPG, PNG, WEBP या PDF स्वीकृत है) / Invalid file signature (only JPG, PNG, WEBP, or PDF allowed)",
      };
    }

    // Verify declared MIME aligns with detected type
    const normalizedDeclared = declaredMimeType.toLowerCase().trim();
    if (
      normalizedDeclared &&
      normalizedDeclared !== "application/octet-stream" &&
      !normalizedDeclared.includes(detectedMime.replace("image/", ""))
    ) {
      // Allow minor subtype variations (e.g. image/jpg vs image/jpeg)
      if (!(detectedMime === "image/jpeg" && normalizedDeclared === "image/jpg")) {
        console.warn(
          `MIME mismatch warning: declared=${declaredMimeType}, detected=${detectedMime}`
        );
      }
    }

    return { valid: true, mimeType: detectedMime };
  }

  /**
   * Generate collision-resistant object key.
   * Format: applications/{entityId}/{category}/{uuid}.{ext}
   */
  public generateKey(options: UploadOptions, extension: string): string {
    const entityType = options.entityType || "general";
    const entityId = (options.entityId || "new").replace(/[^a-zA-Z0-9_-]/g, "");
    const category = (options.category || "document").replace(/[^a-zA-Z0-9_-]/g, "");
    const uuid = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
    const cleanExt = extension.replace(/^\./, "").toLowerCase();

    return `saf-uploads/${entityType}/${entityId}/${category}/${uuid}.${cleanExt}`;
  }

  /**
   * Upload file to persistent object storage.
   */
  public async upload(
    buffer: Buffer | Uint8Array,
    options: UploadOptions
  ): Promise<UploadResult> {
    const rawBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const maxSizeBytes = options.maxSizeBytes || (options.category === "document" ? 10 * 1024 * 1024 : 5 * 1024 * 1024);
    const filename = options.originalFilename || "upload";

    const validation = this.validateFile(
      rawBuffer,
      options.contentType || "application/octet-stream",
      filename,
      maxSizeBytes
    );

    if (!validation.valid || !validation.mimeType) {
      return {
        success: false,
        key: "",
        url: "",
        contentType: "",
        size: rawBuffer.length,
        provider: "none",
        error: validation.error || "Validation failed",
      };
    }

    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "application/pdf": "pdf",
    };

    const ext = mimeToExt[validation.mimeType] || "bin";
    const key = this.generateKey(options, ext);

    if (!this.s3Provider.isConfigured()) {
      return {
        success: false,
        key: "",
        url: "",
        contentType: validation.mimeType,
        size: rawBuffer.length,
        provider: "none",
        error:
          "Persistent object storage is not yet configured. Please set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY in environment variables.",
      };
    }

    try {
      const uploadRes = await this.s3Provider.upload(rawBuffer, key, validation.mimeType);
      return {
        success: true,
        key: uploadRes.key,
        url: uploadRes.url,
        contentType: validation.mimeType,
        size: rawBuffer.length,
        provider: "s3",
      };
    } catch (err: any) {
      console.error("StorageService upload failed:", err);
      return {
        success: false,
        key: "",
        url: "",
        contentType: validation.mimeType,
        size: rawBuffer.length,
        provider: "s3",
        error: err.message || "Failed to upload file to persistent storage",
      };
    }
  }

  public async delete(key: string): Promise<boolean> {
    if (!key) return false;
    return this.s3Provider.delete(key);
  }

  public getPublicUrl(key: string): string {
    if (!key) return "";
    return this.s3Provider.getPublicUrl(key);
  }
}

export const storageService = StorageService.getInstance();
