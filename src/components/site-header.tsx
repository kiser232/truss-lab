import Link from "next/link";
import { PenLine } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { GALLERY_NAME } from "@/lib/constants";
import { cn } from "cn";

const links = [
  { href: "/", label: "전체글" },
  { href: "/?tab=concept", label: "개념글" },
  { href: "/?tab=notice", label: "공지" },
];

export function SiteHeader() {
  return (
    <header className="border-b-4 border-[#e4b15a] bg-[#14372c] text-white">
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3">
        <Link href="/" className="font-display text-[1.45rem] leading-none tracking-wide">
          원준갤
        </Link>
        <nav className="flex items-center gap-1 text-sm" aria-label="갤러리">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded px-2 py-1 text-[#e7f3ec] hover:bg-white/10"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="hidden text-xs text-[#d5e6dc] md:ml-2 md:block">{GALLERY_NAME}</p>
        <Link
          href="/write"
          className={cn(
            buttonVariants({ size: "sm" }),
            "ml-auto bg-[#f3d48a] text-[#14372c] hover:bg-[#ffe3a3]",
          )}
        >
          <PenLine />
          글쓰기
        </Link>
      </div>
    </header>
  );
}
