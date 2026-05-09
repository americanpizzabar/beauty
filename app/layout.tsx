import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BEAUTÉ — AI Fashion & Beauty Consultant",
  description: "プロのAIファッション・ビューティーコンサルタント。化粧品の成分分析、肌タイプ別おすすめ、パーソナライズされたビューティーアドバイス。",
  keywords: ["化粧品分析", "美容コンサルタント", "スキンケア", "AI", "成分分析"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BEAUTÉ",
  },
  openGraph: {
    title: "BEAUTÉ — AI Beauty Consultant",
    description: "AIによるプロ仕様の美容コンサルティング",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0A0A0F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {/* Background orbs */}
        <div
          className="orb w-[600px] h-[600px] opacity-[0.04]"
          style={{
            background: "radial-gradient(circle, #D4A574, transparent 70%)",
            top: "-100px",
            right: "-100px",
          }}
        />
        <div
          className="orb w-[400px] h-[400px] opacity-[0.03]"
          style={{
            background: "radial-gradient(circle, #C4857A, transparent 70%)",
            bottom: "20%",
            left: "-50px",
          }}
        />
        {children}
      </body>
    </html>
  );
}
