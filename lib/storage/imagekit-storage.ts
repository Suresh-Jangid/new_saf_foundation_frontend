import ImageKit from "imagekit";
import { ImageKitConfig, UploadOptions } from "./types";

export class ImageKitStorageProvider {
  private client: ImageKit | null = null;
  private config: ImageKitConfig | null = null;

  constructor() {
    this.initConfig();
  }

  private initConfig(): void {
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || "";
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "";
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/safmedia";

    if (publicKey && privateKey && urlEndpoint) {
      this.config = {
        publicKey,
        privateKey,
        urlEndpoint: urlEndpoint.replace(/\/+$/, ""),
      };

      try {
        this.client = new ImageKit({
          publicKey: this.config.publicKey,
          privateKey: this.config.privateKey,
          urlEndpoint: this.config.urlEndpoint,
        });
      } catch (err) {
        console.error("Failed to initialize ImageKit client:", err);
        this.client = null;
      }
    }
  }

  public isConfigured(): boolean {
    if (!this.client) {
      this.initConfig();
    }
    return this.client !== null && this.config !== null;
  }

  public getConfig(): ImageKitConfig | null {
    if (!this.config) return null;
    return {
      publicKey: this.config.publicKey,
      privateKey: "[PROTECTED]",
      urlEndpoint: this.config.urlEndpoint,
    };
  }

  public getUrlEndpoint(): string {
    return this.config?.urlEndpoint || "https://ik.imagekit.io/safmedia";
  }

  /**
   * Uploads a buffer directly to ImageKit with structured folder placement.
   */
  public async upload(
    buffer: Buffer | Uint8Array,
    fileName: string,
    folder: string,
    tags?: string[]
  ): Promise<{ key: string; url: string; fileId: string }> {
    if (!this.client || !this.config) {
      throw new Error(
        "ImageKit Storage is not configured. Missing IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, or IMAGEKIT_URL_ENDPOINT."
      );
    }

    const rawBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const base64File = rawBuffer.toString("base64");

    const cleanFolder = "/" + folder.replace(/^\/+|\/+$/g, "");

    const response = await this.client.upload({
      file: base64File,
      fileName,
      folder: cleanFolder,
      useUniqueFileName: false,
      tags: tags || ["saf-foundation"],
    });

    if (!response || !response.url) {
      throw new Error("ImageKit returned an invalid response with no file URL.");
    }

    return {
      key: response.filePath || `/${fileName}`,
      url: response.url,
      fileId: response.fileId,
    };
  }

  /**
   * Deletes a file from ImageKit by fileId.
   */
  public async delete(fileId: string): Promise<boolean> {
    if (!this.client || !this.config || !fileId) return false;

    try {
      await this.client.deleteFile(fileId);
      return true;
    } catch (err) {
      console.error("Failed to delete ImageKit file:", fileId, err);
      return false;
    }
  }

  /**
   * Constructs the public CDN URL for a given ImageKit path or returns URL as-is.
   */
  public getPublicUrl(pathOrUrl: string): string {
    if (!pathOrUrl) return "";
    const trimmed = pathOrUrl.trim();

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }

    const base = this.getUrlEndpoint();
    const cleanPath = trimmed.replace(/^\/+/, "");
    return `${base}/${cleanPath}`;
  }
}
