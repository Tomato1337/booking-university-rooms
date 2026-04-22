import { Toaster as Sonner, type ToasterProps } from "sonner"
import { IconCircleCheckFilled, IconInfoCircleFilled, IconAlertTriangleFilled, IconAlertOctagonFilled, IconLoader2 } from "@tabler/icons-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="bottom-right"
      gap={8}
      icons={{
        success: (
          <IconCircleCheckFilled className="size-5 text-primary" />
        ),
        info: (
          <IconInfoCircleFilled className="size-5 text-on-surface" />
        ),
        warning: (
          <IconAlertTriangleFilled className="size-5 text-tertiary" />
        ),
        error: (
          <IconAlertOctagonFilled className="size-5 text-destructive" />
        ),
        loading: (
          <IconLoader2 className="size-5 animate-spin text-on-surface-variant" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:!bg-surface-container-highest group-[.toaster]:!text-on-surface group-[.toaster]:!border-2 group-[.toaster]:!border-on-surface/20 group-[.toaster]:!rounded-none group-[.toaster]:!shadow-[4px_4px_0_0_rgba(0,0,0,0.4)] group-[.toaster]:!font-sans group-[.toaster]:!tracking-wide",
          title:
            "group-[.toast]:!font-black group-[.toast]:!uppercase group-[.toast]:!tracking-widest group-[.toast]:!text-[0.8rem]",
          description:
            "group-[.toast]:!text-on-surface-variant group-[.toast]:!text-xs group-[.toast]:!tracking-wide",
          actionButton:
            "group-[.toast]:!bg-primary group-[.toast]:!text-primary-foreground group-[.toast]:!rounded-none group-[.toast]:!font-black group-[.toast]:!uppercase group-[.toast]:!text-xs group-[.toast]:!tracking-widest group-[.toast]:!border-2 group-[.toast]:!border-primary group-[.toast]:hover:!bg-primary/90",
          cancelButton:
            "group-[.toast]:!bg-surface-container group-[.toast]:!text-on-surface-variant group-[.toast]:!rounded-none group-[.toast]:!font-bold group-[.toast]:!uppercase group-[.toast]:!text-xs group-[.toast]:!tracking-widest group-[.toast]:!border-2 group-[.toast]:!border-on-surface/20 group-[.toast]:hover:!bg-surface-container-high",
          closeButton:
            "group-[.toast]:!bg-surface-container-highest group-[.toast]:!text-on-surface group-[.toast]:!border-2 group-[.toast]:!border-on-surface/20 group-[.toast]:!rounded-none group-[.toast]:hover:!bg-surface-container-high",
          success:
            "group-[.toaster]:!border-primary/60 group-[.toaster]:!shadow-[4px_4px_0_0_oklch(0.68_0.25_280/0.25)]",
          error:
            "group-[.toaster]:!border-destructive/60 group-[.toaster]:!shadow-[4px_4px_0_0_oklch(0.65_0.2_25/0.25)]",
          warning:
            "group-[.toaster]:!border-tertiary/60 group-[.toaster]:!shadow-[4px_4px_0_0_oklch(0.88_0.15_85/0.25)]",
          info:
            "group-[.toaster]:!border-on-surface/30",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
