"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, SwitchCamera, AlertCircle, RefreshCw, Upload } from "lucide-react";
import { MediaUploadMode } from "./types";

interface CameraCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: MediaUploadMode;
  onCapture: (blob: Blob) => void;
  title?: string;
}

export const CameraCaptureDialog: React.FC<CameraCaptureDialogProps> = ({
  open,
  onOpenChange,
  mode,
  onCapture,
  title,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    mode === "pdf" ? "environment" : "user"
  );
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement | null>(null);

  // Stop all active tracks on the stream
  const stopStream = useCallback((activeStream: MediaStream | null) => {
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop error
        }
      });
    }
  }, []);

  // Check for device camera availability and count
  const checkCameras = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoInputs.length > 1);
      } catch {
        setHasMultipleCameras(false);
      }
    }
  }, []);

  // Initialize camera stream
  const startCamera = useCallback(
    async (desiredFacing: "user" | "environment") => {
      setIsInitializing(true);
      setCameraError(null);

      // First stop any existing stream
      if (stream) {
        stopStream(stream);
        setStream(null);
      }

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraError(
          "आपका ब्राउज़र सीधे कैमरा एक्सेस का समर्थन नहीं करता है। कृपया नीचे दिए गए बटन से फोटो लें।"
        );
        setIsInitializing(false);
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: desiredFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play().catch(() => {});
        }
        await checkCameras();
      } catch (err: any) {
        console.error("Camera access error:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraError(
            "कैमरा अनुमति अस्वीकृत है। कृपया ब्राउज़र सेटिंग्स में कैमरा की अनुमति दें।"
          );
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCameraError("डिवाइस पर कोई कैमरा नहीं मिला।");
        } else {
          setCameraError(
            "कैमरा प्रारंभ करने में त्रुटि। कृपया नीचे दिए गए उपकरण विकल्प का उपयोग करें।"
          );
        }
      } finally {
        setIsInitializing(false);
      }
    },
    [checkCameras, stopStream, stream]
  );

  // Trigger camera startup when dialog opens
  useEffect(() => {
    if (open) {
      startCamera(facingMode);
    } else {
      stopStream(stream);
      setStream(null);
      setCameraError(null);
    }

    return () => {
      stopStream(stream);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Handle switching between user and environment cameras
  const toggleFacingMode = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture current frame from video element
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        // Stop camera immediately after capture
        stopStream(stream);
        setStream(null);
        onOpenChange(false);
        onCapture(blob);
      },
      "image/jpeg",
      0.95
    );
  };

  // Native mobile camera fallback upload
  const handleFallbackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopStream(stream);
      setStream(null);
      onOpenChange(false);
      onCapture(file);
    }
  };

  const handleClose = () => {
    stopStream(stream);
    setStream(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="max-w-xl p-4 sm:p-6 sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Camera className="w-5 h-5 text-primary" />
            {title || (mode === "pdf" ? "दस्तावेज़ स्कैन करें / Scan Document" : "फ़ोटो लें / Capture Photo")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {mode === "pdf"
              ? "दस्तावेज़ को कैमरे के सामने सीधा रखें और कैप्चर करें"
              : "कैमरे के सामने फोटो संरेखित करें और कैप्चर बटन दबाएं"}
          </DialogDescription>
        </DialogHeader>

        {/* Live Camera View or Error View */}
        <div className="relative aspect-4/3 w-full bg-black/90 rounded-lg overflow-hidden flex items-center justify-center border">
          {cameraError ? (
            <div className="p-4 text-center text-white max-w-sm space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <p className="text-sm font-medium">{cameraError}</p>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fallbackInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  उपकरण से कैमरा खोलें / Native Camera
                </Button>
              </div>
            </div>
          ) : (
            <>
              {isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 text-white gap-2 text-sm">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  कैमरा लोड हो रहा है...
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </>
          )}

          {/* Switch camera overlay button if multiple cameras exist */}
          {!cameraError && hasMultipleCameras && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleFacingMode}
              title="कैमरा बदलें / Switch Camera"
              className="absolute top-2 right-2 bg-background/80 hover:bg-background z-20 h-9 w-9 rounded-full shadow-md"
            >
              <SwitchCamera className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Hidden native camera fallback input */}
        <input
          ref={fallbackInputRef}
          type="file"
          accept="image/*"
          capture={mode === "pdf" ? "environment" : "user"}
          className="hidden"
          onChange={handleFallbackChange}
        />

        <DialogFooter className="flex flex-row justify-between items-center sm:justify-between pt-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
          >
            रद्द करें / Cancel
          </Button>

          <div className="flex items-center gap-2">
            {/* Show fallback trigger on mobile or if needed */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fallbackInputRef.current?.click()}
              className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline-flex"
            >
              Native Camera
            </Button>

            <Button
              type="button"
              onClick={handleCapture}
              disabled={!!cameraError || isInitializing}
              className="gap-2 font-medium"
            >
              <Camera className="w-4 h-4" />
              कैप्चर करें / Capture
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
