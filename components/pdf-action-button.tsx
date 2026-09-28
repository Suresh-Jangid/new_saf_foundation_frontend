"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileText, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PdfActionButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  type: "form" | "bond";
  label?: string;
  tooltip?: string;
  ariaLabel?: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  iconClassName?: string;
}

/** Standard icon component for Form PDF actions */
export const PdfFormIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <FileText className={cn("w-4 h-4 shrink-0", className)} />
);

/** Standard icon component for Bond PDF actions */
export const PdfBondIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <FileCheck2 className={cn("w-4 h-4 shrink-0", className)} />
);

/**
 * Standardized PDF Action Button for "Generate PDF Form" and "Generate PDF Bond".
 * Guarantees visual, semantic, and accessibility consistency across all modules.
 */
export const PdfActionButton = React.forwardRef<HTMLButtonElement, PdfActionButtonProps>(
  (
    {
      type,
      label,
      tooltip,
      ariaLabel,
      className,
      size = "sm",
      variant = "outline",
      iconClassName,
      children,
      disabled = false,
      onClick,
      ...props
    },
    ref
  ) => {
    const isForm = type === "form";
    const defaultTooltip = isForm ? "Generate PDF Form" : "Generate Bond PDF";
    const resolvedTooltip = tooltip || defaultTooltip;
    const defaultAria = isForm ? "Generate PDF Form" : "Generate PDF Bond";
    const resolvedAria = ariaLabel || defaultAria;

    const IconComponent = isForm ? FileText : FileCheck2;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={ref}
            type="button"
            size={size}
            variant={variant}
            onClick={onClick}
            disabled={disabled}
            aria-label={resolvedAria}
            className={cn(className)}
            {...props}
          >
            <IconComponent className={cn("w-4 h-4 shrink-0", iconClassName)} />
            {label && <span className="ml-1 sm:hidden">{label}</span>}
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{resolvedTooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
);

PdfActionButton.displayName = "PdfActionButton";
