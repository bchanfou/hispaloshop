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
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium font-body transition-[background-color,box-shadow,opacity,transform] duration-[120ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-stone-950 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97] active:duration-[60ms] will-change-transform select-none",
  {
    variants: {
      variant: {
        default:
          "bg-stone-950 text-white shadow-sm hover:opacity-95 hover:shadow-sm",
        destructive:
          "bg-stone-950 text-white shadow-sm hover:opacity-95 hover:shadow-sm",
        outline:
          "border border-stone-200 bg-white text-stone-900 hover:bg-stone-50 hover:shadow-sm",
        secondary:
          "bg-stone-100 text-stone-900 hover:bg-stone-200",
        ghost: 
          "bg-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-950",
        link: 
          "rounded-none bg-transparent px-0 py-0 text-stone-950 underline-offset-4 hover:underline",
        success:
          "bg-stone-950 text-white shadow-sm hover:opacity-95 hover:shadow-sm",
      },
      size: {
        default: "h-10",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-5 text-base",
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
