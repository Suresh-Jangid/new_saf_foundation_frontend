"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { DraftService, RegistrationDraft } from "@/lib/draft-service";

export interface UseRegistrationDraftOptions<T = any> {
  moduleKey: string;
  moduleTitle: string;
  formData?: T;
  onRestore?: (restoredData: T) => void;
  getApplicantName?: (formData: T) => string;
  getMobile?: (formData: T) => string;
}

export function useRegistrationDraft<T = Record<string, any>>({
  moduleKey,
  moduleTitle,
  formData,
  onRestore,
  getApplicantName,
  getMobile,
}: UseRegistrationDraftOptions<T>) {
  const searchParams = useSearchParams();
  const urlDraftId = searchParams?.get("draftId") || null;

  const [currentDraftId, setCurrentDraftId] = useState<string | null>(urlDraftId);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [existingDraft, setExistingDraft] = useState<RegistrationDraft<T> | null>(null);
  const hasHydratedFromUrlRef = useRef(false);
  const formDataRef = useRef<T | undefined>(formData);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Check for existing draft on component mount or module change
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (urlDraftId) {
      const draft = DraftService.getDraft(urlDraftId) as RegistrationDraft<T> | null;
      if (draft && draft.moduleKey === moduleKey) {
        setCurrentDraftId(draft.id);
        setExistingDraft(draft);
        setLastSavedTime(new Date(draft.updatedAt));
        if (onRestore && !hasHydratedFromUrlRef.current) {
          hasHydratedFromUrlRef.current = true;
          onRestore(draft.formData);
          toast.info(`ड्राफ्ट लोड किया गया (${draft.applicantName || moduleTitle})`, {
            description: `अंतिम सहेजा गया: ${new Date(draft.updatedAt).toLocaleTimeString()}`,
          });
        }
        return;
      }
    }

    // Otherwise check for the latest uncompleted draft for this module
    const latest = DraftService.getLatestDraftForModule(moduleKey) as RegistrationDraft<T> | null;
    if (latest) {
      setExistingDraft(latest);
    }
  }, [moduleKey, urlDraftId, onRestore, moduleTitle]);

  /**
   * Save the current form state as a draft without triggering registration validation or API calls
   */
  const saveDraft = useCallback(
    async (dataToSave?: T, extraMeta?: { applicantName?: string; mobile?: string }): Promise<RegistrationDraft<T> | null> => {
      try {
        setIsDraftSaving(true);
        const data = dataToSave || formDataRef.current;
        if (!data) {
          toast.error("सहेजने के लिए कोई डेटा नहीं है / No form data to save");
          return null;
        }

        const applicantName =
          extraMeta?.applicantName ||
          (getApplicantName ? getApplicantName(data) : undefined);

        const mobile =
          extraMeta?.mobile ||
          (getMobile ? getMobile(data) : undefined);

        const saved = DraftService.saveDraft<T>(moduleKey, data, {
          draftId: currentDraftId || undefined,
          applicantName,
          mobile,
          moduleTitle,
        });

        setCurrentDraftId(saved.id);
        setExistingDraft(saved);
        setLastSavedTime(new Date(saved.updatedAt));

        toast.success("ड्राफ्ट सफलतापूर्वक सहेजा गया / Draft Saved Successfully", {
          description: `आवेदक: ${saved.applicantName} | समय: ${new Date(saved.updatedAt).toLocaleTimeString()}`,
        });

        return saved;
      } catch (error: any) {
        console.error("[useRegistrationDraft] Save error:", error);
        toast.error("ड्राफ्ट सहेजने में विफल / Failed to save draft", {
          description: error?.message || "कृपया पुनः प्रयास करें",
        });
        return null;
      } finally {
        setIsDraftSaving(false);
      }
    },
    [moduleKey, moduleTitle, currentDraftId, getApplicantName, getMobile]
  );

  /**
   * Restore an existing draft into the active form
   */
  const restoreDraft = useCallback(
    (draftToRestore?: RegistrationDraft<any> | null) => {
      const target = draftToRestore || existingDraft;
      if (!target || !onRestore) return;

      setCurrentDraftId(target.id);
      setLastSavedTime(new Date(target.updatedAt));
      onRestore(target.formData);

      toast.success("ड्राफ्ट डेटा फॉर्म में लोड किया गया", {
        description: `अंतिम सहेजा गया: ${new Date(target.updatedAt).toLocaleString()}`,
      });
    },
    [existingDraft, onRestore]
  );

  /**
   * Discard/Delete the draft
   */
  const discardDraft = useCallback(
    (targetDraftId?: string) => {
      const idToDelete = targetDraftId || currentDraftId || existingDraft?.id;
      if (!idToDelete) return;

      DraftService.deleteDraft(idToDelete);
      if (currentDraftId === idToDelete) {
        setCurrentDraftId(null);
        setLastSavedTime(null);
      }
      if (existingDraft?.id === idToDelete) {
        setExistingDraft(null);
      }

      toast.info("ड्राफ्ट हटा दिया गया / Draft Discarded");
    },
    [currentDraftId, existingDraft]
  );

  /**
   * Call on successful final submit to purge the completed draft
   */
  const clearDraftOnSubmit = useCallback(() => {
    const idToClear = currentDraftId || existingDraft?.id;
    if (idToClear) {
      DraftService.markDraftCompleted(idToClear);
      setCurrentDraftId(null);
      setExistingDraft(null);
      setLastSavedTime(null);
    }
  }, [currentDraftId, existingDraft]);

  return {
    draft: existingDraft,
    currentDraftId,
    isDraftSaving,
    lastSavedTime,
    existingDraft,
    hasExistingDraft: Boolean(existingDraft && existingDraft.id !== currentDraftId),
    saveDraft,
    restoreDraft,
    discardDraft,
    clearDraftOnSubmit,
  };
}
