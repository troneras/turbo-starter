import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import type { ComponentProps } from "react"

type ToasterProps = ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <>
      <style>
        {`
          [data-sonner-toast] [data-description] {
            color: hsl(var(--foreground)) !important;
            opacity: 0.9 !important;
          }
          [data-sonner-toast] [data-title] {
            color: hsl(var(--foreground)) !important;
            font-weight: 500 !important;
          }
          [data-sonner-toast] {
            background: hsl(var(--popover)) !important;
            border: 1px solid hsl(var(--border)) !important;
            color: hsl(var(--popover-foreground)) !important;
          }
        `}
      </style>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        {...props}
      />
    </>
  )
}

export { Toaster }
