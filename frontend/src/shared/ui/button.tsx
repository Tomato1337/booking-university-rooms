import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "group/button cursor-pointer relative inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-colors duration-150 ease-linear outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-dim",
        "sidebar-active":
          "bg-primary/20 transition-all text-primary hover:bg-primary-dim hover:text-primary-foreground before:absolute before:h-full before:w-2 before:-left-1 before:rounded-none before:bg-primary before:content-['']",
        outline:
          "border-outline-variant bg-transparent text-on-surface hover:bg-surface-container-high",
        secondary: "bg-surface-container-highest text-on-surface hover:bg-surface-container-high",
        ghost: "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
        //      "text-sm font-bold -ml-2 uppercase tracking-widest transition-colors duration-150 ease-linear hover:text-on-surface",
        //   {
        //     "text-primary font-black": activeTab === "active",
        //     "text-on-surface-variant": activeTab !== "active",
        //   },
        tab: "text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-sm font-bold uppercase tracking-widest transition-colors duration-150 ease-linear hover:text-on-surface",
        destructive: "bg-secondary/15 text-secondary hover:bg-secondary/25",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-none px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-none px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs": "size-6 rounded-none [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-none",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
