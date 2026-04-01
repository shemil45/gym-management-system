"use client";
import React, { useState, useEffect } from "react";

import { motion } from "motion/react";
import { cn } from "@/lib/utils/cn";

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = "button",
  duration = 1,
  clockwise = true,
  ...props
}: React.PropsWithChildren<
  {
    as?: React.ElementType;
    containerClassName?: string;
    className?: string;
    duration?: number;
    clockwise?: boolean;
  } & React.HTMLAttributes<HTMLElement>
>) {
  const [hovered, setHovered] = useState<boolean>(false);
  const [direction, setDirection] = useState<Direction>("TOP");

  const movingMap: Record<Direction, string> = {
    TOP: "radial-gradient(26% 58% at 50% 0%, rgba(16, 185, 129, 0.52) 0%, rgba(59, 130, 246, 0.28) 42%, rgba(255, 255, 255, 0) 100%)",
    LEFT: "radial-gradient(22% 48% at 0% 50%, rgba(16, 185, 129, 0.48) 0%, rgba(59, 130, 246, 0.26) 42%, rgba(255, 255, 255, 0) 100%)",
    BOTTOM:
      "radial-gradient(26% 58% at 50% 100%, rgba(16, 185, 129, 0.52) 0%, rgba(59, 130, 246, 0.28) 42%, rgba(255, 255, 255, 0) 100%)",
    RIGHT:
      "radial-gradient(22% 48% at 100% 50%, rgba(16, 185, 129, 0.48) 0%, rgba(59, 130, 246, 0.26) 42%, rgba(255, 255, 255, 0) 100%)",
  };

  const highlight =
    "radial-gradient(90% 190% at 50% 50%, rgba(16, 185, 129, 0.34) 0%, rgba(59, 130, 246, 0.22) 40%, rgba(255, 255, 255, 0) 100%)";

  useEffect(() => {
    if (!hovered) {
      const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
      const interval = setInterval(() => {
        setDirection((prevState) => {
          const currentIndex = directions.indexOf(prevState);
          const nextIndex = clockwise
            ? (currentIndex - 1 + directions.length) % directions.length
            : (currentIndex + 1) % directions.length;
          return directions[nextIndex];
        });
      }, duration * 1000);
      return () => clearInterval(interval);
    }
  }, [clockwise, duration, hovered]);
  return (
    <Tag
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative flex rounded-full border border-slate-200/80 content-center bg-white/70 transition duration-500 items-center flex-col flex-nowrap gap-10 h-min justify-center overflow-visible p-px decoration-clone w-fit",
        containerClassName
      )}
      {...props}
    >
      <div
        className={cn(
          "z-10 w-auto rounded-[inherit] bg-white px-4 py-2 text-slate-900",
          className
        )}
      >
        {children}
      </div>
      <motion.div
        className={cn(
          "flex-none inset-0 overflow-hidden absolute z-0 rounded-[inherit]"
        )}
        style={{
          filter: "blur(3px)",
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
        initial={{ background: movingMap[direction] }}
        animate={{
          background: hovered
            ? [movingMap[direction], highlight]
            : movingMap[direction],
        }}
        transition={{ ease: "linear", duration: duration ?? 1 }}
      />
      <div className="absolute inset-[1px] z-1 flex-none rounded-[inherit] bg-white/96 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)]" />
    </Tag>
  );
}
