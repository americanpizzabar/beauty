"use client";

import Link from "next/link";
import { Camera, Sparkles, Search, ArrowRight, Star } from "lucide-react";
import { useEffect, useRef } from "react";
import Navigation from "@/components/Navigation";

const FEATURES = [
  {
    href: "/analyze",
    icon: Camera,
    titleJa: "製品分析",
    title: "PRODUCT ANALYSIS",
    desc: "化粧品・美容品の写真を撮るだけでAIが成分、効果、肌適合性を詳細に分析します。",
    gradient: "from-amber-500/10 to-orange-500/5",
    border: "border-amber-500/15",
    iconColor: "text-amber-400",
    tag: "AI Vision",
  },
  {
    href: "/recommend",
    icon: Sparkles,
    titleJa: "パーソナル推薦",
    title: "PERSONALIZED RECOMMEND",
    desc: "肌のデータを入力すると、あなたに最適な化粧品を理由付きで厳選してご提案します。",
    gradient: "from-gold/10 to-gold-dark/5",
    border: "border-gold/15",
    iconColor: "text-gold",
    tag: "AI + Database",
  },
  {
    href: "/search",
    icon: Search,
    titleJa: "フリー検索",
    title: "FREE SEARCH",
    desc: "気になることを自由に入力するだけ。成分、効果、用途など何でもAIが詳しく答えます。",
    gradient: "from-purple-500/10 to-pink-500/5",
    border: "border-purple-500/15",
    iconColor: "text-purple-400",
    tag: "AI Search",
  },
];

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (heroRef.current) {
      heroRef.current.style.opacity = "0";
      heroRef.current.style.transform = "translateY(30px)";
      const t = setTimeout(() => {
        if (heroRef.current) {
          heroRef.current.style.transition =
            "opacity 0.9s ease, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)";
          heroRef.current.style.opacity = "1";
          heroRef.current.style.transform = "translateY(0)";
        }
      }, 100);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navigation />

      {/* Hero section */}
      <div
        ref={heroRef}
        className="relative z-10 min-h-[85svh] flex flex-col items-center justify-center px-4 text-center"
      >
        {/* Decorative glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 40% at 50% 30%, rgba(212,165,116,0.08), transparent)",
          }}
        />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 glass-gold rounded-full px-4 py-1.5 mb-8 animate-fade-in">
          <Star size={11} className="text-gold fill-gold" />
          <span className="text-xs text-gold tracking-[0.2em] font-medium">
            AI BEAUTY CONSULTANT
          </span>
          <Star size={11} className="text-gold fill-gold" />
        </div>

        {/* Main title */}
        <h1
          className="font-serif mb-4"
          style={{ fontFamily: "var(--font-playfair, 'Playfair Display', serif)" }}
        >
          <span
            className="block text-shimmer text-6xl md:text-8xl font-semibold tracking-[0.1em] leading-none"
          >
            BEAUTÉ
          </span>
          <span className="block text-pearl/60 text-sm md:text-base font-normal tracking-[0.4em] mt-3">
            AI FASHION &amp; BEAUTY
          </span>
        </h1>

        <p className="text-pearl-muted text-sm md:text-base max-w-md leading-relaxed mt-6 mb-10 font-light">
          AIがあなたの美容をプロ仕様でサポート。
          <br />
          化粧品の成分分析から、パーソナライズされた
          <br />
          スキンケアアドバイスまで。
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/analyze"
            className="group flex items-center justify-center gap-2 bg-gold hover:bg-gold-light text-obsidian font-semibold text-sm px-7 py-3.5 rounded-full transition-all duration-300 hover:shadow-[0_0_30px_rgba(212,165,116,0.3)]"
          >
            <Camera size={16} />
            製品を分析する
            <ArrowRight
              size={14}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
          <Link
            href="/recommend"
            className="flex items-center justify-center gap-2 glass border border-white/10 hover:border-gold/30 text-pearl text-sm px-7 py-3.5 rounded-full transition-all duration-300"
          >
            <Sparkles size={16} />
            おすすめを探す
          </Link>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float">
          <span className="text-pearl-dim text-[10px] tracking-[0.2em]">SCROLL</span>
          <div className="w-px h-8 bg-gradient-to-b from-gold/40 to-transparent" />
        </div>
      </div>

      {/* Features section */}
      <div className="relative z-10 px-4 pb-32 md:pb-16 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-pearl-dim text-xs tracking-[0.3em] uppercase">Features</p>
          <h2
            className="font-serif text-2xl md:text-3xl text-pearl mt-2"
            style={{ fontFamily: "var(--font-playfair, 'Playfair Display', serif)" }}
          >
            3つの AI 機能
          </h2>
        </div>

        <div className="space-y-4">
          {FEATURES.map(({ href, icon: Icon, titleJa, title, desc, gradient, border, iconColor, tag }, i) => (
            <Link
              key={href}
              href={href}
              className={`group block glass bg-gradient-to-br ${gradient} border ${border} rounded-2xl p-5 md:p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_4px_40px_rgba(212,165,116,0.05)]`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/5 ${iconColor}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3
                      className="text-pearl font-semibold text-base"
                      style={{ fontFamily: "var(--font-playfair, 'Playfair Display', serif)" }}
                    >
                      {titleJa}
                    </h3>
                    <span className="tag-chip bg-white/5 text-pearl-dim">{tag}</span>
                  </div>
                  <p className="text-xs text-pearl-dim/70 tracking-[0.1em] mb-2 font-medium">{title}</p>
                  <p className="text-sm text-pearl-muted leading-relaxed">{desc}</p>
                </div>
                <ArrowRight
                  size={16}
                  className="text-pearl-dim group-hover:text-gold group-hover:translate-x-1 transition-all flex-shrink-0 mt-1"
                />
              </div>
            </Link>
          ))}
        </div>

        {/* Footer note */}
        <div className="text-center mt-12 space-y-1">
          <p className="text-pearl-dim/40 text-[10px] tracking-[0.2em]">
            POWERED BY CLAUDE AI · ANTHROPIC
          </p>
          <p className="text-pearl-dim/30 text-[10px]">
            © 2025 BEAUTÉ. Professional Beauty Consulting.
          </p>
        </div>
      </div>
    </div>
  );
}
