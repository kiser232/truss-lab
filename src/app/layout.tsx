import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, IBM_Plex_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "트러스 실습실",
  description: "건축공학과 학생을 위한 트러스 계산기, 실습, 퀴즈. 절점법으로 축력을 읽고 재료의 인장·압축을 구분합니다.",
  applicationName: "트러스 실습실",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${noto.variable} ${fraunces.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
