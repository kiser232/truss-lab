import type { Metadata } from "next";
import { Black_Han_Sans, Noto_Sans_KR } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { GALLERY_NAME } from "@/lib/constants";
import "./globals.css";

const noto = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto",
  display: "swap",
});

const blackHan = Black_Han_Sans({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-black-han",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: GALLERY_NAME,
    template: `%s · ${GALLERY_NAME}`,
  },
  description:
    "2027학년도 수능을 앞둔 장원준을 응원하는 게시판. 응원, 막판 정보, 질문과 후기를 올립니다.",
  applicationName: GALLERY_NAME,
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${noto.variable} ${blackHan.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#e4ebf0] font-sans text-[#1c2430]">
        <a
          href="#content"
          className="absolute left-3 top-2 z-50 -translate-y-16 rounded bg-white px-3 py-1 text-sm text-[#14372c] focus:translate-y-0"
        >
          본문으로
        </a>
        <SiteHeader />
        <div id="content" className="mx-auto w-full max-w-[1100px] px-3 py-4">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
