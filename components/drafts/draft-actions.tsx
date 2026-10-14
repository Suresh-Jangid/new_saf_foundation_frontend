"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Save, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";

export interface DraftActionsProps {
  /** Callback when user clicks "Save as Draft" */
  onSaveDraft: (formData?: any) => void | Promise<any>;
  /** Whether draft saving is currently in progress */
  isSavingDraft?: boolean;
  isDraftSaving?: boolean;
  /** Whether final submission is in progress */
  isSubmitting?: boolean;
  /** Disabled state for final submit button (e.g. pending payment or missing terms) */
  submitDisabled?: boolean;
  /** Text for the final submit button */
  submitLabel?: string;
  /** Text for the final submit loading state */
  submittingLabel?: string;
  /** Text for the draft button */
  draftLabel?: string;
  /** Callback for cancel button */
  onCancel?: () => void;
  /** Optional cancel link destination */
  cancelHref?: string;
  /** Custom cancel label */
  cancelLabel?: string;
  /** Additional custom class names */
  className?: string;
}

export const DraftActions: React.FC<DraftActionsProps> = ({
  onSaveDraft,
  isDraftSaving = false,
  isSubmitting = false,
  submitDisabled = false,
  submitLabel = "फाइनल सबमिट / Final Submit",
  submittingLabel = "आवेदन जमा हो रहा है... / Submitting...",
  draftLabel = "ड्राफ्ट सहेजें / Save as Draft",
  onCancel,
  cancelLabel = "रद्द करें / Cancel",
  className = "",
}) => {
  const isBusy = isDraftSaving || isSubmitting;

  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-6 border-t ${className}`}>
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isBusy}
          className="w-full sm:w-auto order-3 sm:order-1"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          {cancelLabel}
        </Button>
      )}

      {/* Save as Draft Action */}
      <Button
        type="button"
        variant="secondary"
        onClick={onSaveDraft}
        disabled={isBusy}
        className="w-full sm:w-auto border border-blue-200 dark:border-blue-900 bg-blue-50/70 hover:bg-blue-100/90 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/60 font-medium order-2 sm:order-2"
        title="वर्तमान डेटा को बिना फाइनल सबमिट किए सहेजें"
      >
        {isDraftSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-700 dark:text-blue-300" />
            ड्राफ्ट सहेजा जा रहा है...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2 text-blue-700 dark:text-blue-300" />
            {draftLabel}
          </>
        )}
      </Button>

      {/* Final Submit Action */}
      <Button
        type="submit"
        disabled={isBusy || submitDisabled}
        className="w-full sm:w-auto bg-[#0B4A8F] hover:bg-[#0D5EB3] text-white font-semibold order-1 sm:order-3 shadow-sm"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
            {submittingLabel}
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2 text-white" />
            {submitLabel}
          </>
        )}
      </Button>
    </div>
  );
};
