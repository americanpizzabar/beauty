"use client";

import { useEffect, useRef } from "react";
import Navigation from "./Navigation";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageWrapper({ children, className = "" }: PageWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.opacity = "0";
      ref.current.style.transform = "translateY(16px)";
      requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.style.transition = "opacity 0.6s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)";
          ref.current.style.opacity = "1";
          ref.current.style.transform = "translateY(0)";
        }
      });
    }
  }, []);

  return (
    <div className="min-h-screen relative z-10">
      <Navigation />
      <div
        ref={ref}
        className={`pt-20 pb-24 md:pb-10 px-4 max-w-2xl mx-auto ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
