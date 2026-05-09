"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "画像を認識中...",
  "成分データベースを照会中...",
  "肌適合性を分析中...",
  "刺激物質を検出中...",
  "専門家レポートを生成中...",
];

export default function AnalysisLoader() {
  const [step, setStep] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, 2000);
    const dotTimer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => {
      clearInterval(stepTimer);
      clearInterval(dotTimer);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-8">
      {/* Scanning animation */}
      <div className="relative w-32 h-32">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border border-gold/20 animate-ping" />
        <div className="absolute inset-2 rounded-full border border-gold/10" />
        {/* Center orb */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-radial from-gold/20 to-transparent flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-2 border-gold/40 border-t-gold animate-spin" />
          </div>
        </div>
        {/* Scan line */}
        <div className="absolute inset-4 rounded-full overflow-hidden">
          <div
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent"
            style={{
              animation: "scan 2s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      {/* Step text */}
      <div className="text-center space-y-2">
        <p className="text-gold text-sm font-medium tracking-wider">
          AI分析中{dots}
        </p>
        <p className="text-pearl-dim text-xs transition-all duration-500">
          {STEPS[step]}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i === step ? "bg-gold w-4" : "bg-white/15"
            }`}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
}
