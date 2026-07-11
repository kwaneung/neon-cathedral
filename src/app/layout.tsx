import type { Metadata, Viewport } from "next";
import { Gowun_Batang, Cormorant_Garamond, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const gowun = Gowun_Batang({
  variable: "--font-gowun",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const notoSans = Noto_Sans_KR({
  variable: "--font-noto",
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "네온 성당 | Neon Cathedral",
  description:
    "흔적 없이 소멸하는 고해성사, 오직 따뜻한 불빛으로만 온기를 나누는 공간",
};

export const viewport: Viewport = {
  themeColor: "#0a0812",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${gowun.variable} ${cormorant.variable} ${notoSans.variable} h-full antialiased dark`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-dvh bg-nave font-sans text-text-body">
        {children}
      </body>
    </html>
  );
}
