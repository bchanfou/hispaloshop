import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

/**
 * Design System Button
 * Primary: bg-stone-950 text-white
 * Secondary: bg-stone-100 text-stone-700
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium font-body transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-stone-950 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-stone-950 text-white shadow-sm hover:bg-stone-950",
        destructive:
          "rounded-full bg-stone-950 text-white shadow-sm hover:bg-stone-950",
        outline:
          "rounded-full border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-950",
        secondary:
          "rounded-full border border-stone-200 bg-stone-100 text-stone-700 hover:bg-stone-200",
        ghost: 
          "rounded-lg bg-transparent text-stone-500 hover:bg-stone-100 hover:text-stone-950",
        link: 
          "bg-transparent text-stone-950 underline-offset-4 hover:underline",
        success:
          "rounded-full bg-stone-950 text-white shadow-sm hover:bg-stone-950",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
