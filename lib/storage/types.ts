/**
 * Persistent Storage Types & Interfaces
 * SAF Foundation CRM
 */

export type StorageProviderType = "s3" | "r2" | "supabase" | "local";

export interface StorageConfig {
  provider: StorageProviderType;
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl?: string;
}

export interface UploadOptions {
  category: "passport" | "nominee" | "document" | "affidavit" | "general";
  entityType?: "application" | "insurance" | "mayra" | "janni" | "lado_bahin" | "dhundhotsav" | "agent" | "document";
  entityId?: string;
  originalFilename?: string;
  contentType?: string;
  maxSizeBytes?: number;
}

export interface UploadResult {
  success: boolean;
  key: string;
  url: string;
  contentType: string;
  size: number;
  provider: string;
  error?: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
}
