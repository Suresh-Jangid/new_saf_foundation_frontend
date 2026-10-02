import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { StorageConfig } from "./types";

export class S3StorageProvider {
  private client: S3Client | null = null;
  private config: StorageConfig | null = null;

  constructor() {
    this.initConfig();
  }

  private initConfig(): void {
    const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || "";
    const region = process.env.S3_REGION || process.env.AWS_REGION || "ap-south-1";
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "";
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "";
    const endpoint = process.env.S3_ENDPOINT || undefined;
    const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL || undefined;

    if (bucket && accessKeyId && secretAccessKey) {
      this.config = {
        provider: (process.env.STORAGE_PROVIDER as any) || "s3",
        bucket,
        region,
        endpoint,
        accessKeyId,
        secretAccessKey,
        publicBaseUrl,
      };

      this.client = new S3Client({
        region,
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: !!endpoint, // needed for MinIO or custom S3-compatible endpoints
      });
    }
  }

  public isConfigured(): boolean {
    return this.client !== null && this.config !== null;
  }

  public getConfig(): StorageConfig | null {
    return this.config;
  }

  public async upload(
    buffer: Buffer | Uint8Array,
    key: string,
    contentType: string
  ): Promise<{ key: string; url: string }> {
    if (!this.client || !this.config) {
      throw new Error(
        "S3 Storage is not configured. Missing S3_BUCKET, S3_ACCESS_KEY_ID, or S3_SECRET_ACCESS_KEY."
      );
    }

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });

    await this.client.send(command);

    const url = this.getPublicUrl(key);
    return { key, url };
  }

  public async delete(key: string): Promise<boolean> {
    if (!this.client || !this.config) return false;

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (err) {
      console.error("Failed to delete S3 object:", key, err);
      return false;
    }
  }

  public async exists(key: string): Promise<boolean> {
    if (!this.client || !this.config) return false;

    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  public getPublicUrl(key: string): string {
    if (!this.config) return "";

    if (this.config.publicBaseUrl) {
      const base = this.config.publicBaseUrl.replace(/\/+$/, "");
      const cleanKey = key.replace(/^\/+/, "");
      return `${base}/${cleanKey}`;
    }

    // Default AWS S3 public URL format
    if (this.config.endpoint) {
      const endpoint = this.config.endpoint.replace(/\/+$/, "");
      return `${endpoint}/${this.config.bucket}/${key.replace(/^\/+/, "")}`;
    }

    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key.replace(/^\/+/, "")}`;
  }
}
