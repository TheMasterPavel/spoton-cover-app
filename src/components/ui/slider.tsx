
"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  themeMode?: 'dark' | 'light'; // 'dark' = elementos blancos, 'light' = elementos negros
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, themeMode = 'dark', ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track 
      className={cn(
        "relative h-2 w-full grow overflow-hidden rounded-full",
        themeMode === 'light' ? "bg-neutral-400" : "bg-secondary" // Pista gris medio para light, gris oscuro para dark
      )}
    >
      <SliderPrimitive.Range className="absolute h-full bg-primary" /> 
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb 
      className={cn(
        "block h-5 w-5 rounded-full border-2 border-primary ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        themeMode === 'light' ? "bg-neutral-700" : "bg-background" // Thumb gris oscuro para light, fondo app para dark
      )}
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }

