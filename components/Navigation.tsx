"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Sparkles, Search, Package, Scale, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "/analyze", label: "製品分析", labelEn: "ANALYZE", icon: Camera },
  { href: "/recommend", label: "おすすめ", labelEn: "RECOMMEND", icon: Sparkles },
  { href: "/search", label: "フリー検索", labelEn: "SEARCH", icon: Search },
  { href: "/products", label: "商品DB", labelEn: "PRODUCTS", icon: Package },
  { href: "/compare", label: "比較", labelEn: "COMPARE", icon: Scale },
];

export default function Navigation() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "glass border-b border-white/5 py-3" : "bg-transparent py-5"}`}>
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="w-8 h-8 relative">
              <div className="absolute inset-0 rounded-full bg-gold/20 animate-pulse-gold" />
              <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-gold-light to-gold-dark flex items-center justify-center">
                <span className="text-obsidian text-[10px] font-serif font-bold">B</span>
              </div>
            </div>
            <span className="text-shimmer font-serif text-lg font-semibold tracking-[0.2em]" style={{ fontFamily: "var(--font-playfair,'Playfair Display',serif)" }}>
              BEAUTÉ
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ href, labelEn, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium tracking-[0.15em] transition-all duration-300 ${active ? "bg-gold/10 text-gold border border-gold/20" : "text-pearl-muted hover:text-pearl hover:bg-white/5"}`}>
                  <Icon size={13} />{labelEn}
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 rounded-lg text-pearl-muted hover:text-gold transition-colors"
            onClick={() => setMenuOpen(!menuOpen)} aria-label="メニュー">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-obsidian/90 backdrop-blur-xl" />
          <div className="absolute top-20 left-4 right-4 glass-gold rounded-2xl p-6">
            <p className="text-pearl-dim text-xs tracking-[0.2em] uppercase mb-4">Menu</p>
            <div className="space-y-2">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? "bg-gold/10 text-gold" : "text-pearl hover:bg-white/5"}`}>
                    <Icon size={18} />{label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass border-t border-white/5 pb-safe">
        <div className="flex">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-center transition-all ${active ? "text-gold" : "text-pearl-dim"}`}>
                <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                <span className="text-[9px] font-medium tracking-wider">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
