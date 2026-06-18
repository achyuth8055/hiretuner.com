import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-on-primary",
        secondary:
          "bg-secondary/10 text-secondary",
        success:
          "bg-tertiary-fixed-dim/10 text-on-tertiary-container",
        warning:
          "bg-surface-variant text-on-surface-variant border border-outline-variant/30",
        disabled:
          "bg-surface-container text-outline",
        outline:
          "text-primary border border-outline-variant",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
