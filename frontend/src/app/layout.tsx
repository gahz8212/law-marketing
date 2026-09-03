import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "법무법인 (미지정) 홍보팀 | Legal Marketing AX Studio",
  description:
    "변호사 승소 판결문 및 소장 메모를 후킹 제목 3선, 인스타그램 카드뉴스, 네이버 블로그 원고로 자동 가공하고 n8n으로 원클릭 배포하는 사내 마케팅 업무 자동화 솔루션",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-100/70 text-gray-900 font-sans flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
