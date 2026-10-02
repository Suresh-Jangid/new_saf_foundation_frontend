import crypto from "crypto";
import path from "path";
import { ImageKitStorageProvider } from "./imagekit-storage";
import { S3StorageProvider } from "./s3-storage";
import { FileValidationResult, UploadOptions, UploadResult } from "./types";

export class StorageService {
  private static instance: StorageService;
  private imagekitProvider: ImageKitStorageProvider;
  private s3Provider: S3StorageProvider;

  private constructor() {
    this.imagekitProvider = new ImageKitStorageProvider();
    this.s3Provider = new S3StorageProvider();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  public isConfigured(): boolean {
    return this.imagekitProvider.isConfigured() || this.s3Provider.isConfigured();
  }

  public getActiveProviderName(): string {
    if (this.imagekitProvider.isConfigured()) return "imagekit";
    if (this.s3Provider.isConfigured()) return "s3";
    return "none";
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
      if (!(detectedMime === "image/jpeg" && normalizedDeclared === "image/jpg")) {
        console.warn(
          `MIME mismatch warning: declared=${declaredMimeType}, detected=${detectedMime}`
        );
      }
    }

    return { valid: true, mimeType: detectedMime };
  }

  /**
   * Constructs the structured ImageKit folder taxonomy.
   */
  public getFolder(options: UploadOptions): string {
    const entityType = options.entityType || "general";
    const entityId = (options.entityId || "new").replace(/[^a-zA-Z0-9_-]/g, "");
    const category = (options.category || "document").replace(/[^a-zA-Z0-9_-]/g, "");

    if (entityType === "agent") {
      return `/saf-foundation/agents/${entityId}`;
    }

    if (category === "document" || category === "affidavit") {
      return `/saf-foundation/documents/${entityType}/${entityId}`;
    }

    return `/saf-foundation/applications/${entityType}/${entityId}/${category}`;
  }

  /**
   * Generate collision-resistant unique filename.
   */
  public generateFileName(options: UploadOptions, extension: string): string {
    const category = (options.category || "upload").replace(/[^a-zA-Z0-9_-]/g, "");
    const uuid = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
    const cleanExt = extension.replace(/^\./, "").toLowerCase();

    return `${category}_${uuid}.${cleanExt}`;
  }

  /**
   * Upload file to persistent object storage (ImageKit prioritized).
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
    const fileName = this.generateFileName(options, ext);
    const folder = this.getFolder(options);

    // Primary: ImageKit Storage
    if (this.imagekitProvider.isConfigured()) {
      try {
        const uploadRes = await this.imagekitProvider.upload(
          rawBuffer,
          fileName,
          folder,
          [options.category, options.entityType || "general"]
        );

        return {
          success: true,
          key: uploadRes.key,
          url: uploadRes.url,
          fileId: uploadRes.fileId,
          contentType: validation.mimeType,
          size: rawBuffer.length,
          provider: "imagekit",
        };
      } catch (ikErr: any) {
        console.error("ImageKit upload error:", ikErr);
        return {
          success: false,
          key: "",
          url: "",
          contentType: validation.mimeType,
          size: rawBuffer.length,
          provider: "imagekit",
          error: ikErr.message || "Failed to upload to ImageKit",
        };
      }
    }

    // Fallback: S3 Storage (retained for backward compatibility)
    if (this.s3Provider.isConfigured()) {
      try {
        const s3Key = `saf-uploads/${(options.entityType || "general").replace(/[^a-zA-Z0-9_-]/g, "")}/${(options.entityId || "new").replace(/[^a-zA-Z0-9_-]/g, "")}/${fileName}`;
        const uploadRes = await this.s3Provider.upload(rawBuffer, s3Key, validation.mimeType);
        return {
          success: true,
          key: uploadRes.key,
          url: uploadRes.url,
          contentType: validation.mimeType,
          size: rawBuffer.length,
          provider: "s3",
        };
      } catch (s3Err: any) {
        console.error("S3 fallback upload error:", s3Err);
        return {
          success: false,
          key: "",
          url: "",
          contentType: validation.mimeType,
          size: rawBuffer.length,
          provider: "s3",
          error: s3Err.message || "Failed to upload to S3",
        };
      }
    }

    return {
      success: false,
      key: "",
      url: "",
      contentType: validation.mimeType,
      size: rawBuffer.length,
      provider: "none",
      error:
        "Persistent media storage is not yet configured. Please set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT in environment variables.",
    };
  }

  public async delete(keyOrFileId: string): Promise<boolean> {
    if (!keyOrFileId) return false;

    if (this.imagekitProvider.isConfigured()) {
      return this.imagekitProvider.delete(keyOrFileId);
    }

    if (this.s3Provider.isConfigured()) {
      return this.s3Provider.delete(keyOrFileId);
    }

    return false;
  }

  public getPublicUrl(pathOrUrl: string): string {
    if (!pathOrUrl) return "";
    if (this.imagekitProvider.isConfigured()) {
      return this.imagekitProvider.getPublicUrl(pathOrUrl);
    }
    if (this.s3Provider.isConfigured()) {
      return this.s3Provider.getPublicUrl(pathOrUrl);
    }
    return pathOrUrl;
  }
}

export const storageService = StorageService.getInstance();
