"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, FileText } from "lucide-react";
import { MediaUploadMode, MediaUploadControlProps } from "./types";
import { CameraCaptureDialog } from "./camera-capture-dialog";
import { ImageCropDialog } from "./image-crop-dialog";
import {
  createImageFile,
  convertImageBlobToPdfFile,
  createSyntheticFileChangeEvent,
} from "./media-utils";
import { toast } from "sonner";

export const MediaUploadControl: React.FC<MediaUploadControlProps> = ({
  id,
  name,
  mode,
  accept,
  label,
  buttonText,
  cameraButtonText,
  disabled = false,
  className = "",
  standaloneCameraOnly = false,
  onFileSelect,
  onNativeChange,
}) => {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Default accept attributes
  const defaultAccept =
    accept ||
    (mode === "pdf" ? ".pdf,image/*,application/pdf" : "image/*");

  const defaultCameraText =
    cameraButtonText ||
    (mode === "pdf"
      ? "दस्तावेज़ स्कैन करें / Scan Document"
      : "फ़ोटो खींचें / Camera");

  const defaultPickerText =
    buttonText ||
    (mode === "pdf" ? "दस्तावेज़ चुनें / Choose PDF" : "फ़ोटो चुनें / Choose Photo");

  // Step 1: Camera captures an image Blob
  const handleCaptured = (blob: Blob) => {
    setCapturedBlob(blob);
    setCameraOpen(false);
    // Move immediately to crop
    setCropOpen(true);
  };

  // Step 2: User confirms crop
  const handleCropConfirmed = async (croppedBlob: Blob) => {
    setIsProcessing(true);
    try {
      let finalFile: File;
      const baseName = id || name || (mode === "pdf" ? "scanned-document" : "captured-photo");

      if (mode === "pdf") {
        // PDF DOCUMENT: Convert cropped image into genuine application/pdf File
        finalFile = await convertImageBlobToPdfFile(croppedBlob, baseName);
      } else {
        // PHOTO: Produce standard image/jpeg File
        finalFile = createImageFile(croppedBlob, baseName, "image/jpeg");
      }

      // 1. Deliver real File to state
      onFileSelect(finalFile);

      // 2. Deliver synthetic change event if caller expects onChange(e)
      if (onNativeChange) {
        const syntheticEvent = createSyntheticFileChangeEvent(finalFile, id);
        onNativeChange(syntheticEvent);
      }

      toast.success(
        mode === "pdf"
          ? "दस्तावेज़ सफलतापूर्वक स्कैन हुआ (PDF तैयार)"
          : "फ़ोटो सफलतापूर्वक कैप्चर और क्रॉप हुई"
      );
    } catch (err) {
      console.error("Error processing captured media:", err);
      toast.error("फ़ाइल तैयार करने में त्रुटि हुई");
    } finally {
      setIsProcessing(false);
      setCapturedBlob(null);
    }
  };

  // Step 3: Retake option inside Crop dialog
  const handleRetake = () => {
    setCropOpen(false);
    setCapturedBlob(null);
    setCameraOpen(true);
  };

  // Step 4: Cancel options (Strict safety: Does NOT touch existing state)
  const handleCropCancel = () => {
    setCropOpen(false);
    setCapturedBlob(null);
  };

  // Native file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    if (onNativeChange) {
      onNativeChange(e);
    }
  };

  return (
    <div className={`media-upload-wrapper ${className}`}>
      {standaloneCameraOnly ? (
        // Standalone Camera Button meant to sit beside existing file inputs
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isProcessing}
          onClick={() => setCameraOpen(true)}
          title={mode === "pdf" ? "Scan Document" : "Capture Photo"}
          className="gap-1.5 text-xs font-medium border-primary/30 text-primary hover:bg-primary/10 hover:text-primary transition-colors h-9"
        >
          <Camera className="w-4 h-4 text-primary shrink-0" />
          <span>{defaultCameraText}</span>
        </Button>
      ) : (
        // Combined Control: Native File Picker + Camera Button
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            id={id}
            name={name}
            type="file"
            accept={defaultAccept}
            disabled={disabled}
            className="hidden"
            onChange={handleFileInputChange}
          />

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5 text-xs h-9"
          >
            {mode === "pdf" ? (
              <FileText className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Camera className="w-4 h-4 text-muted-foreground" />
            )}
            <span>{defaultPickerText}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isProcessing}
            onClick={() => setCameraOpen(true)}
            title={mode === "pdf" ? "Scan Document" : "Capture Photo"}
            className="gap-1.5 text-xs font-medium border-primary/40 text-primary hover:bg-primary/10 transition-colors h-9"
          >
            <Camera className="w-4 h-4 text-primary shrink-0" />
            <span>{defaultCameraText}</span>
          </Button>
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraCaptureDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        mode={mode}
        onCapture={handleCaptured}
        title={label ? `${label} - कैमरा कैप्चर` : undefined}
      />

      {/* Interactive Crop Modal */}
      <ImageCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        imageBlob={capturedBlob}
        mode={mode}
        onConfirm={handleCropConfirmed}
        onRetake={handleRetake}
        onCancel={handleCropCancel}
      />
    </div>
  );
};
