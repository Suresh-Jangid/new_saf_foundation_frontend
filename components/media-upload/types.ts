export type MediaUploadMode = "image" | "pdf";

export interface CropArea {
  x: number; // percentage 0-100 or pixel
  y: number;
  width: number;
  height: number;
}

export interface MediaUploadControlProps {
  id?: string;
  name?: string;
  mode: MediaUploadMode;
  accept?: string;
  label?: string;
  buttonText?: string;
  cameraButtonText?: string;
  disabled?: boolean;
  className?: string;
  standaloneCameraOnly?: boolean;
  onFileSelect: (file: File) => void;
  // Fallback / bridge for existing event-driven handlers:
  onNativeChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
