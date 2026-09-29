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
import { Slider } from "@/components/ui/slider";
import {
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Check,
  Camera,
  Crop as CropIcon,
  Maximize2,
  Square,
} from "lucide-react";
import { MediaUploadMode } from "./types";
import { safeRevokeUrl } from "./media-utils";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageBlob: Blob | null;
  mode: MediaUploadMode;
  onConfirm: (croppedBlob: Blob) => void;
  onRetake: () => void;
  onCancel: () => void;
}

export const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  open,
  onOpenChange,
  imageBlob,
  mode,
  onConfirm,
  onRetake,
  onCancel,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "free">(
    mode === "image" ? "1:1" : "free"
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize and clean up Blob URL
  useEffect(() => {
    if (imageBlob) {
      const url = URL.createObjectURL(imageBlob);
      setImageSrc(url);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setAspectRatio(mode === "image" ? "1:1" : "free");

      return () => {
        safeRevokeUrl(url);
      };
    } else {
      setImageSrc(null);
    }
  }, [imageBlob, mode]);

  // Reset adjustments
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // 90° clockwise rotation
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Mouse & Touch Pan Handling
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Render crop to a high-resolution Blob
  const handleConfirmCrop = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;
    setIsProcessing(true);

    try {
      const img = imageRef.current;
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();

      // Determine the crop box relative to container
      let cropWidth = containerRect.width * 0.85;
      let cropHeight = containerRect.height * 0.85;

      if (aspectRatio === "1:1") {
        const minDim = Math.min(cropWidth, cropHeight);
        cropWidth = minDim;
        cropHeight = minDim;
      }

      const cropLeft = (containerRect.width - cropWidth) / 2;
      const cropTop = (containerRect.height - cropHeight) / 2;

      // Offscreen canvas matching the cropped output dimension
      const outputCanvas = document.createElement("canvas");
      // Scale resolution for high quality (e.g. 1000px on major axis)
      const targetSize = mode === "image" ? 800 : 1200;
      const scale = targetSize / cropWidth;
      outputCanvas.width = Math.round(cropWidth * scale);
      outputCanvas.height = Math.round(cropHeight * scale);

      const ctx = outputCanvas.getContext("2d");
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Translate and rotate around the crop center
      ctx.translate(outputCanvas.width / 2, outputCanvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Determine image scale within container
      const displayedImgRect = img.getBoundingClientRect();
      const imgCenterX = displayedImgRect.left + displayedImgRect.width / 2;
      const imgCenterY = displayedImgRect.top + displayedImgRect.height / 2;
      const cropCenterX = containerRect.left + containerRect.width / 2;
      const cropCenterY = containerRect.top + containerRect.height / 2;

      // Distance from crop center to image center in screen pixels
      const deltaX = (imgCenterX - cropCenterX) * scale;
      const deltaY = (imgCenterY - cropCenterY) * scale;

      const drawWidth = displayedImgRect.width * scale;
      const drawHeight = displayedImgRect.height * scale;

      // Account for 90/270 rotation in coordinate space
      if (rotation === 90 || rotation === 270) {
        ctx.drawImage(
          img,
          -drawHeight / 2 + (rotation === 90 ? deltaY : -deltaY),
          -drawWidth / 2 + (rotation === 90 ? -deltaX : deltaX),
          drawHeight,
          drawWidth
        );
      } else {
        ctx.drawImage(
          img,
          -drawWidth / 2 + (rotation === 180 ? -deltaX : deltaX),
          -drawHeight / 2 + (rotation === 180 ? -deltaY : deltaY),
          drawWidth,
          drawHeight
        );
      }

      outputCanvas.toBlob(
        (blob) => {
          setIsProcessing(false);
          if (blob) {
            onOpenChange(false);
            onConfirm(blob);
          }
        },
        "image/jpeg",
        0.92
      );
    } catch (err) {
      console.error("Error cropping image:", err);
      setIsProcessing(false);
    }
  }, [aspectRatio, mode, onConfirm, onOpenChange, rotation]);

  const handleClose = () => {
    onOpenChange(false);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="max-w-2xl p-4 sm:p-6 sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CropIcon className="w-5 h-5 text-primary" />
            {mode === "pdf" ? "दस्तावेज़ क्रॉप करें / Adjust Document" : "फ़ोटो क्रॉप करें / Crop Photo"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {mode === "pdf"
              ? "दस्तावेज़ को ज़ूम, घुमाएं या स्थानांतरित करें ताकि वह फ्रेम में स्पष्ट दिखे"
              : "फ़ोटो को फ्रेम के अनुसार ज़ूम और व्यवस्थित करें"}
          </DialogDescription>
        </DialogHeader>

        {/* Interactive Crop Container */}
        <div
          ref={containerRef}
          className="relative aspect-4/3 w-full bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center select-none cursor-move border"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {imageSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              draggable={false}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                transition: isDragging ? "none" : "transform 0.1s ease-out",
                maxWidth: "80%",
                maxHeight: "80%",
                objectFit: "contain",
              }}
              className="pointer-events-none select-none"
            />
          )}

          {/* Dimmed Overlay with Cutout Bounding Box */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className={`border-2 border-primary/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] ${
                aspectRatio === "1:1" ? "aspect-square w-64 h-64 sm:w-72 sm:h-72" : "w-[85%] h-[85%]"
              } rounded-md relative`}
            >
              {/* Corner indicators */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-primary" />
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-primary" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-primary" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-primary" />
            </div>
          </div>
        </div>

        {/* Controls Toolbar: Zoom, Rotate, Aspect Ratio, Reset */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-4">
            <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider
              value={[zoom]}
              min={0.5}
              max={3}
              step={0.05}
              onValueChange={([val]) => setZoom(val)}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-mono text-muted-foreground w-12 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRotate}
                className="gap-1.5 text-xs h-8"
              >
                <RotateCw className="w-3.5 h-3.5" />
                90° घुमाएं / Rotate
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-1.5 text-xs h-8"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                रीसेट / Reset
              </Button>

              {/* Aspect Ratio Toggle (1:1 vs Freeform) */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAspectRatio((prev) => (prev === "1:1" ? "free" : "1:1"))}
                className="gap-1 text-xs h-8 text-muted-foreground hover:text-foreground"
                title="फ्रेम अनुपात बदलें / Toggle Aspect Ratio"
              >
                {aspectRatio === "1:1" ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-primary" />
                    1:1 (Photo)
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-primary" />
                    Free (Doc)
                  </>
                )}
              </Button>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRetake}
              className="gap-1.5 text-xs h-8"
            >
              <Camera className="w-3.5 h-3.5" />
              पुनः फ़ोटो लें / Retake
            </Button>
          </div>
        </div>

        <DialogFooter className="flex flex-row justify-between items-center sm:justify-between pt-3 border-t gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isProcessing}
          >
            रद्द करें / Cancel
          </Button>

          <Button
            type="button"
            onClick={handleConfirmCrop}
            disabled={isProcessing || !imageSrc}
            className="gap-1.5 font-medium"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                क्रॉप हो रहा है...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                पुष्टि करें / Confirm Crop
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
