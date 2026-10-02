/**
 * Client-Side Media Upload Helper
 * SAF Foundation CRM
 *
 * Safely uploads local files to the Next.js /api/upload gateway (ImageKit)
 * before submitting form data to the backend database.
 */

export interface ClientUploadOptions {
  category?: "passport" | "nominee" | "father" | "mother" | "document" | "affidavit" | "general" | "profile";
  entityType?: "application" | "insurance" | "mayra" | "janni" | "lado_bahin" | "dhundhotsav" | "agent" | "document" | "aawas" | "general";
  entityId?: string;
}

export interface ClientUploadResponse {
  success: boolean;
  url?: string;
  key?: string;
  fileId?: string;
  error?: string;
}

export async function uploadMediaFile(
  file: File | null | undefined,
  options: ClientUploadOptions = {}
): Promise<ClientUploadResponse> {
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  try {
    const formData = new FormData();
    formData.append("file", file);
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
