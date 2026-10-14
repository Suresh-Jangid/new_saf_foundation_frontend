"use client";

import React, { useState } from "react";
import { AlertCircle, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegistrationDraft } from "@/lib/draft-service";

export interface DraftBannerProps {
  draft: RegistrationDraft<any> | null;
  onResume?: (draft: any) => void;
  onRestore?: (draft?: any) => void;
  onDiscard: (draftId: string) => void;
  className?: string;
}

export const DraftBanner: React.FC<DraftBannerProps> = ({
  draft,
  onResume,
  onRestore,
  onDiscard,
  className = "",
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const handleResume = () => {
    if (!draft) return;
    if (onResume) onResume(draft);
    else if (onRestore) onRestore(draft);
  };

  if (!draft || isDismissed) return null;

  const formattedDate = new Date(draft.updatedAt).toLocaleDateString("hi-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`relative mb-6 rounded-lg border border-amber-300 bg-amber-50/90 p-4 shadow-sm dark:border-amber-700 dark:bg-amber-950/40 ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
                अधूरा ड्राफ्ट मिला / Incomplete Draft Found:
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                {draft.applicantName || "अनाम आवेदक"}
              </span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              अंतिम सहेजा गया: <span className="font-mono">{formattedDate}</span>
              {draft.mobile ? ` • मोबाइल: ${draft.mobile}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0">
          <Button
            type="button"
            size="sm"
            onClick={handleResume}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium h-8 shadow-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            ड्राफ्ट लोड करें / Resume
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onDiscard(draft.id)}
            className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900 text-xs h-8"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1 text-red-600" />
            हटाएं / Discard
          </Button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss banner"
            className="p-1 rounded text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900 ml-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
