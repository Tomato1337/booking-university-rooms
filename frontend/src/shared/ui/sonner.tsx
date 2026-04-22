import { Toaster as Sonner, type ToasterProps } from "sonner"
import { IconCircleCheck, IconInfoCircle, IconAlertTriangle, IconAlertOctagon, IconLoader } from "@tabler/icons-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: (
          <IconCircleCheck className="size-5 text-primary" />
        ),
        info: (
          <IconInfoCircle className="size-5 text-foreground" />
        ),
        warning: (
          <IconAlertTriangle className="size-5 text-tertiary" />
        ),
        error: (
          <IconAlertOctagon className="size-5 text-destructive" />
        ),
        loading: (
          <IconLoader className="size-5 animate-spin text-muted-foreground" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:rounded-sm group-[.toaster]:shadow-none",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-primary/90",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted/90",
          closeButton:
            "group-[.toast]:bg-popover group-[.toast]:text-popover-foreground group-[.toast]:border-border group-[.toast]:hover:bg-muted",
          success: "group-[.toaster]:border-primary/50",
          error: "group-[.toaster]:border-destructive/50",
          warning: "group-[.toaster]:border-tertiary/50",
          info: "group-[.toaster]:border-border",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
