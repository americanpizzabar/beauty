"use client";

import { useEffect, useRef, useState } from "react";

interface ScoreBarProps {
  label: string;
  value: number;
  color?: string;
  delay?: number;
}

export default function ScoreBar({ label, value, color = "gold", delay = 0 }: ScoreBarProps) {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(value);
    }, delay + 300);
    return () => clearTimeout(timer);
  }, [value, delay]);

  const colorMap: Record<string, string> = {
    gold: "from-gold-dark to-gold-light",
    rose: "from-rose-deep to-rose-skin",
    blue: "from-blue-600 to-blue-400",
    green: "from-emerald-600 to-emerald-400",
  };

  return (
    <div ref={ref} className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-pearl-dim font-medium tracking-wider">{label}</span>
        <span className="text-xs font-semibold text-gold">{value}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${colorMap[color] || colorMap.gold} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
