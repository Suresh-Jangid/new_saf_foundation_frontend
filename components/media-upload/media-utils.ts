import { PDFDocument } from "pdf-lib";

/**
 * Safely revokes an object URL if it is a blob URL to prevent memory leaks.
 */
export function safeRevokeUrl(url?: string | null): void {
  if (url && typeof url === "string" && url.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore errors during revocation
    }
  }
}

/**
 * Wraps an image Blob into a standard File object.
 */
export function createImageFile(
  blob: Blob,
  baseName = "captured-photo",
  mimeType = "image/jpeg"
): File {
  const timestamp = Date.now();
  const ext = mimeType === "image/png" ? "png" : "jpg";
  const filename = `${baseName}-${timestamp}.${ext}`;
  return new File([blob], filename, {
    type: mimeType,
    lastModified: timestamp,
  });
}

/**
 * Ensures an image blob is either JPEG or PNG for pdf-lib embedding.
 * Converts WebP or other canvas formats to JPEG.
 */
async function ensureJpegOrPngBlob(imageBlob: Blob): Promise<{ bytes: Uint8Array; isPng: boolean }> {
  if (imageBlob.type === "image/png") {
    const arrayBuf = await imageBlob.arrayBuffer();
    return { bytes: new Uint8Array(arrayBuf), isPng: true };
  }

  if (imageBlob.type === "image/jpeg" || imageBlob.type === "image/jpg") {
    const arrayBuf = await imageBlob.arrayBuffer();
    return { bytes: new Uint8Array(arrayBuf), isPng: false };
  }

  // Convert WebP or other formats to JPEG via offscreen canvas
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Unable to create 2d canvas context for image conversion"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        async (convertedBlob) => {
          if (!convertedBlob) {
            reject(new Error("Canvas conversion to JPEG failed"));
            return;
          }
          const arrayBuf = await convertedBlob.arrayBuffer();
          resolve({ bytes: new Uint8Array(arrayBuf), isPng: false });
        },
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for PDF conversion"));
    };
    img.src = url;
  });
}

/**
 * Converts an image Blob into a valid, single-page application/pdf File using pdf-lib.
 */
export async function convertImageBlobToPdfFile(
  imageBlob: Blob,
  baseName = "scanned-document"
): Promise<File> {
  const { bytes, isPng } = await ensureJpegOrPngBlob(imageBlob);
  const pdfDoc = await PDFDocument.create();

  const embeddedImage = isPng
    ? await pdfDoc.embedPng(bytes)
    : await pdfDoc.embedJpg(bytes);

  // Set page dimensions matching the image aspect ratio
  const imgWidth = embeddedImage.width;
  const imgHeight = embeddedImage.height;

  const page = pdfDoc.addPage([imgWidth, imgHeight]);
  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width: imgWidth,
    height: imgHeight,
  });

  const pdfBytes = await pdfDoc.save();
  const timestamp = Date.now();
  const cleanBaseName = baseName.replace(/\.[^/.]+$/, "");
  const filename = `${cleanBaseName}-${timestamp}.pdf`;

  const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
  return new File([pdfBlob], filename, {
    type: "application/pdf",
    lastModified: timestamp,
  });
}

/**
 * Dispatches or creates a SyntheticEvent for legacy handlers expecting
 * `e: React.ChangeEvent<HTMLInputElement>` with `e.target.files`.
 */
export function createSyntheticFileChangeEvent(
  file: File,
  inputId?: string
): React.ChangeEvent<HTMLInputElement> {
  const targetObj = {
    id: inputId || "",
    name: inputId || "",
    files: [file] as unknown as FileList,
    value: "",
  };

  return {
    target: targetObj,
    currentTarget: targetObj,
    preventDefault: () => {},
    stopPropagation: () => {},
  } as unknown as React.ChangeEvent<HTMLInputElement>;
}
