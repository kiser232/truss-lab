import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_KR } from "next/font/google";
import { Header } from "@/components/chrome";
import "./globals.css";

const noto = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-noto",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-face",
});

export const metadata: Metadata = {
  title: "트러스 랩",
  description: "절점법으로 트러스 축력을 계산하고, 자재 비용 안에서 실습하는 구조역학 실습실.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${noto.variable} ${mono.variable}`}>
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
