"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"

import { persistTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  isDark?: boolean
  duration?: number
  disableViewTransition?: boolean
}

export const AnimatedThemeToggler = ({
  className,
  isDark: controlledIsDark,
  duration = 400,
  disableViewTransition = false,
  onClick,
  ...props
}: AnimatedThemeTogglerProps) => {
  const [uncontrolledIsDark, setUncontrolledIsDark] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const isControlled = controlledIsDark !== undefined
  const isDark = controlledIsDark ?? uncontrolledIsDark

  useEffect(() => {
    if (isControlled) {
      return
    }

    const updateTheme = () => {
      setUncontrolledIsDark(document.documentElement.classList.contains("dark"))
    }

    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [isControlled])

  const runLightweightAnimation = useCallback(() => {
    const target = document.body
    if (!target || typeof target.animate !== "function") {
      return
    }

    target.animate(
      [
        { opacity: 0.82, filter: "brightness(0.98)" },
        { opacity: 1, filter: "brightness(1)" },
      ],
      {
        duration: Math.min(duration, 220),
        easing: "ease-out",
      }
    )
  }, [duration])

  const toggleTheme = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const button = buttonRef.current
    if (!button) return

    const { top, left, width, height } = button.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight
    const maxRadius = Math.hypot(
      Math.max(x, viewportWidth - x),
      Math.max(y, viewportHeight - y)
    )

    const applyTheme = () => {
      const newTheme = !isDark
      if (!isControlled) {
        setUncontrolledIsDark(newTheme)
        document.documentElement.classList.toggle("dark", newTheme)
        persistTheme(newTheme ? "dark" : "light")
      }
      onClick?.(event)
    }

    if (disableViewTransition) {
      applyTheme()
      runLightweightAnimation()
      return
    }

    if (typeof document.startViewTransition !== "function") {
      applyTheme()
      return
    }

    const transition = document.startViewTransition(() => {
      flushSync(applyTheme)
    })

    const ready = transition?.ready
    if (ready && typeof ready.then === "function") {
      ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${maxRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          }
        )
      })
    }
  }, [disableViewTransition, duration, isControlled, isDark, onClick, runLightweightAnimation])

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn("inline-flex items-center justify-center shrink-0", className)}
      {...props}
    >
      {isDark ? <Sun /> : <Moon />}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
