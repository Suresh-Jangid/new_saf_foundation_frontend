/**
 * Client-Side Media Upload Helper
 * SAF Foundation CRM
 *
 * Safely uploads local files to the Next.js /api/upload gateway (ImageKit)
 * before submitting form data to the backend database.
 */

export interface ClientUploadOptions {
  category?: "passport" | "nominee" | "father" | "mother" | "document" | "affidavit" | "general" | "profile";
  entityType?: "application" | "insurance" | "mayra" | "janni" | "lado_bahin" | "dhundhotsav" | "agent" | "document" | "aawas" | "general" | "loan" | "shubh_laxmi" | "pension" | "sewing_machine";
  entityId?: string;
}

export interface ClientUploadResponse {
  success: boolean;
  url?: string;
  key?: string;
  fileId?: string;
  error?: string;
}

function dataURLtoFile(dataurl: string, filename: string): File | Blob | null {
  try {
    const arr = dataurl.split(",");
    if (arr.length < 2) return null;
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    if (typeof File !== "undefined") {
      return new File([u8arr], filename, { type: mime });
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.warn("Failed to parse data URL to File:", err);
    return null;
  }
}

export async function uploadMediaFile(
  fileInput: File | Blob | string | null | undefined,
  options: ClientUploadOptions = {}
): Promise<ClientUploadResponse> {
  if (!fileInput) {
    return { success: false, error: "No file provided" };
  }

  // If already an absolute HTTPS/HTTP URL or existing storage/legacy path, pass through
  if (typeof fileInput === "string") {
    const trimmed = fileInput.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return { success: true, url: trimmed };
    }
    if (
      !trimmed.startsWith("data:") &&
      trimmed.length < 500 &&
      (trimmed.startsWith("/") ||
        trimmed.startsWith("saf-") ||
        trimmed.startsWith("uploads/") ||
        trimmed.startsWith("user/"))
    ) {
      return { success: true, url: trimmed };
    }
  }

  try {
    let fileToUpload: File | Blob | null = null;

    if (typeof fileInput === "string") {
      if (fileInput.startsWith("data:")) {
        const ext = fileInput.includes("image/png") ? "png" : fileInput.includes("application/pdf") ? "pdf" : "jpg";
        fileToUpload = dataURLtoFile(fileInput, `upload-${Date.now()}.${ext}`);
      }
      if (!fileToUpload) {
        return { success: false, error: "Invalid data URL format" };
      }
    } else {
      fileToUpload = fileInput;
    }

    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("category", options.category || "general");
    formData.append("entityType", options.entityType || "application");
    formData.append("entityId", options.entityId || "new");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || `Upload failed with status ${response.status}`,
      };
    }

    return {
      success: true,
      url: data.url,
      key: data.key,
      fileId: data.fileId,
    };
  } catch (err: any) {
    console.error("Client uploadMediaFile error:", err);
    return {
      success: false,
      error: err.message || "Network error occurred while uploading file",
    };
  }
}

/**
 * Automatically inspects a form data object.
 * If any values are File instances or base64 data URLs,
 * it uploads them to ImageKit via /api/upload and replaces the value with the returned ImageKit URL.
 * If upload fails or is unconfigured, it preserves the original value so form submission can proceed.
 */
export async function prepareMediaPayload<T extends Record<string, any>>(
  payload: T,
  context: { entityType?: ClientUploadOptions["entityType"]; entityId?: string } = {}
): Promise<T> {
  const result: any = { ...payload };

  const keyToCategory = (key: string): ClientUploadOptions["category"] => {
    const k = key.toLowerCase();
    if (k.includes("nominee")) return "nominee";
    if (k.includes("father")) return "father";
    if (k.includes("mother")) return "mother";
    if (k.includes("profile")) return "profile";
    if (k.includes("doc") || k.includes("aadhaar") || k.includes("certificate") || k.includes("niwas")) return "document";
    if (k.includes("affidavit")) return "affidavit";
    return "passport";
  };

  for (const [key, value] of Object.entries(result)) {
    const isFile = typeof File !== "undefined" && value instanceof File;
    const isDataUrl = typeof value === "string" && (value.startsWith("data:image/") || value.startsWith("data:application/pdf"));

    if (isFile || isDataUrl) {
      try {
        const uploadRes = await uploadMediaFile(value as any, {
          category: keyToCategory(key),
          entityType: context.entityType || "application",
          entityId: context.entityId || "new",
        });

        if (uploadRes.success && uploadRes.url) {
          result[key] = uploadRes.url;
        }
      } catch (err) {
        console.warn(`Automatic ImageKit upload for ${key} note:`, err);
      }
    }
  }

  return result as T;
}
