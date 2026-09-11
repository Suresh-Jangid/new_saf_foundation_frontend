"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "group toast font-sans shadow-lg border text-sm rounded-lg p-3.5 transition-all duration-200 group-[.toaster]:shadow-md max-w-[calc(100vw-32px)] sm:max-w-[420px]",
          default:
            "group-[.toast]:bg-card group-[.toast]:text-card-foreground group-[.toast]:border-border",
          success:
            "!bg-[#f0fdf4] !border-[#86efac] !text-[#14532d] [&_[data-icon]]:!text-[#16a34a] [&_[data-title]]:!text-[#14532d] [&_[data-description]]:!text-[#166534]",
          error:
            "!bg-[#fef2f2] !border-[#fca5a5] !text-[#7f1d1d] [&_[data-icon]]:!text-[#dc2626] [&_[data-title]]:!text-[#7f1d1d] [&_[data-description]]:!text-[#991b1b]",
          warning:
            "!bg-[#fff7ed] !border-[#fdba74] !text-[#7c2d12] [&_[data-icon]]:!text-[#ea580c] [&_[data-title]]:!text-[#7c2d12] [&_[data-description]]:!text-[#9a3412]",
          info:
            "!bg-[#f0f7ff] !border-[#7cc5fb] !text-[#071E3D] [&_[data-icon]]:!text-[#0B4A8F] [&_[data-title]]:!text-[#071E3D] [&_[data-description]]:!text-[#072E5C]",
          loading:
            "!bg-[#f8fafc] !border-[#cbd5e1] !text-[#0f172a] [&_[data-icon]]:!text-[#64748b] [&_[data-title]]:!text-[#0f172a] [&_[data-description]]:!text-[#334155]",
          description: "text-xs font-normal mt-0.5 opacity-90",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-medium text-xs px-2.5 py-1 rounded",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-medium text-xs px-2.5 py-1 rounded",
          closeButton:
            "!bg-white/60 dark:!bg-black/40 hover:!bg-white dark:hover:!bg-black !border-black/10 !text-foreground shadow-sm",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
