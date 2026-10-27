import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";

export function PaginationBar({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (number) => number === 1 || number === pageCount || Math.abs(number - page) <= 2,
  );

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="페이지">
      <PageLink href={page > 1 ? hrefFor(page - 1) : undefined} label="이전 페이지">
        <ChevronLeft className="size-4" />
        이전
      </PageLink>
      {pages.map((number, index) => {
        const prev = pages[index - 1];
        const gap = prev && number - prev > 1;
        return (
          <span key={number} className="flex items-center gap-1">
            {gap ? <span className="px-1 text-[#8b97a3]">…</span> : null}
            <Link
              href={hrefFor(number)}
              aria-current={number === page ? "page" : undefined}
              className={cn(
                "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm",
                number === page
                  ? "bg-[#14372c] font-medium text-white"
                  : "bg-white text-[#1a4f86] ring-1 ring-[#d3dde4] hover:bg-[#f4faf7]",
              )}
            >
              {number}
            </Link>
          </span>
        );
      })}
      <PageLink href={page < pageCount ? hrefFor(page + 1) : undefined} label="다음 페이지">
        다음
        <ChevronRight className="size-4" />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  label,
  children,
}: {
  href?: string;
  label: string;
  children: ReactNode;
}) {
  if (!href) {
    return (
      <span className="flex h-8 items-center gap-1 rounded-md px-2 text-sm text-[#b0b8c0]" aria-label={label}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-8 items-center gap-1 rounded-md bg-white px-2 text-sm text-[#1a4f86] ring-1 ring-[#d3dde4] hover:bg-[#f4faf7]"
    >
      {children}
    </Link>
  );
}
