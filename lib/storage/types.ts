/**
 * Persistent Storage Types & Interfaces
 * SAF Foundation CRM
 */

export type StorageProviderType = "imagekit" | "s3" | "r2" | "supabase" | "local";

export interface ImageKitConfig {
  publicKey: string;
  privateKey: string;
  urlEndpoint: string;
}

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
  category: "passport" | "nominee" | "father" | "mother" | "document" | "affidavit" | "general" | "profile";
  entityType?: "application" | "insurance" | "mayra" | "janni" | "lado_bahin" | "dhundhotsav" | "agent" | "document" | "aawas" | "general";
  entityId?: string;
  originalFilename?: string;
  contentType?: string;
  maxSizeBytes?: number;
}

export interface UploadResult {
  success: boolean;
  key: string;
  url: string;
  fileId?: string;
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

export interface ImageOptimizationOptions {
  category?: UploadOptions["category"];
  contentType?: string;
  originalFilename?: string;
  maxDimension?: number;
  quality?: number;
  preserveTransparency?: boolean;
}

export interface ImageOptimizationResult {
  buffer: Buffer;
  contentType: string;
  extension: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  width?: number;
  height?: number;
  format: string;
  wasOptimized: boolean;
  hasAlpha?: boolean;
}
