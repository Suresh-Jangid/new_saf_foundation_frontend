"use client";

import React, { memo, useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaUploadControl } from "@/components/media-upload";
import { FallbackImage } from "@/components/ui/fallback-image";
import { resolvePhotoUrl } from "@/lib/utils";

interface FileUploadFieldProps {
  id: string;
  label: string;
  accept?: string;
  onChange: (file: File | null) => void;
  value?: File | null;
  existingUrl?: string | null;
}

export const FileUploadField = memo<FileUploadFieldProps>(
  ({
    id,
    label,
    accept = "image/*",
    onChange,
    value,
    existingUrl,
  }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const activeBlobUrlRef = useRef<string | null>(null);

    // Safely manage blob object URLs with cleanup
    useEffect(() => {
      // Cleanup any prior blob URL
      if (activeBlobUrlRef.current) {
        try {
          URL.revokeObjectURL(activeBlobUrlRef.current);
        } catch {
          // ignore error
        }
        activeBlobUrlRef.current = null;
      }

      if (value instanceof File) {
        const url = URL.createObjectURL(value);
        activeBlobUrlRef.current = url;
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }

      return () => {
        if (activeBlobUrlRef.current) {
          try {
            URL.revokeObjectURL(activeBlobUrlRef.current);
          } catch {
            // ignore
          }
          activeBlobUrlRef.current = null;
        }
      };
    }, [value]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      onChange(file);
    };

    const resolvedExistingUrl = existingUrl ? resolvePhotoUrl(existingUrl) : null;

    return (
      <div>
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-2 mt-1">
          <Input
            id={id}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="flex-1"
          />
          <MediaUploadControl
            id={`${id}-camera`}
            mode={accept?.includes("pdf") ? "pdf" : "image"}
            accept={accept}
            label={label}
            standaloneCameraOnly
            onFileSelect={(capturedFile) => {
              onChange(capturedFile);
            }}
          />
        </div>

        {/* Display new file preview or existing photo with graceful fallback */}
        {previewUrl ? (
          <div className="mt-2">
            <FallbackImage
              src={previewUrl}
              alt="फ़ाइल प्रीव्यू"
              className="h-24 w-24 rounded border object-cover shadow-sm"
            />
          </div>
        ) : resolvedExistingUrl ? (
          <div className="mt-2 flex items-center gap-3">
            <FallbackImage
              src={resolvedExistingUrl}
              alt="मौजूदा फ़ाइल"
              className="h-24 w-24 rounded border object-cover shadow-sm"
              showUnavailableBadge
            />
            <span className="text-xs text-muted-foreground">
              मौजूदा फ़ाइल लोड हुई / Existing file loaded
            </span>
          </div>
        ) : null}
      </div>
    );
  }
);

FileUploadField.displayName = "FileUploadField";
