import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

// Block ghost clicks leaking to underlying elements after interacting with Popover content
let __popoverGhostInstalled = false
let __lastPopoverPointerDownAt = 0
const __POPOVER_GHOST_TIMEOUT__ = 250
if (typeof window !== "undefined" && !__popoverGhostInstalled) {
  window.addEventListener(
    "click",
    (e) => {
      if (Date.now() - __lastPopoverPointerDownAt < __POPOVER_GHOST_TIMEOUT__) {
        e.stopPropagation()
        e.preventDefault()
      }
    },
    true
  )
  __popoverGhostInstalled = true
}

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 max-h-[80vh] overflow-auto overscroll-contain rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      onPointerDownCapture={() => { __lastPopoverPointerDownAt = Date.now() }}
      onMouseDownCapture={() => { __lastPopoverPointerDownAt = Date.now() }}
      onTouchStartCapture={() => { __lastPopoverPointerDownAt = Date.now() }}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
