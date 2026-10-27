import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { boardHref } from "@/lib/hrefs";
import type { SearchField, Tab } from "@/lib/query";
import { cn } from "cn";

const tabs: { id: Tab; label: string }[] = [
  { id: "all", label: "전체글" },
  { id: "concept", label: "개념글" },
  { id: "notice", label: "공지" },
];

export function BoardToolbar({
  tab,
  field,
  q,
}: {
  tab: Tab;
  field: SearchField;
  q: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1" role="tablist" aria-label="게시글 분류">
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <Link
              key={item.id}
              href={boardHref({ tab: item.id, field, q })}
              role="tab"
              aria-selected={active}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                active
                  ? "bg-[#14372c] font-medium text-white"
                  : "bg-white text-[#3e4c59] ring-1 ring-[#d3dde4] hover:bg-[#f4faf7]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      <form key={`${tab}:${field}:${q}`} action="/" className="flex items-center gap-1.5">
        {tab !== "all" ? <input type="hidden" name="tab" value={tab} /> : null}
        <label className="sr-only" htmlFor="field">
          검색 범위
        </label>
        <select
          id="field"
          name="field"
          defaultValue={field}
          className="h-8 rounded-lg border border-[#d3dde4] bg-white px-2 text-sm text-[#3e4c59]"
        >
          <option value="all">제목+내용</option>
          <option value="title">제목</option>
          <option value="author">글쓴이</option>
          <option value="comment">댓글</option>
        </select>
        <label className="sr-only" htmlFor="q">
          검색어
        </label>
        <Input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="검색어"
          maxLength={40}
          className="w-36 bg-white sm:w-48"
        />
        <Button type="submit" size="sm" variant="outline" className="bg-white">
          <Search />
          검색
        </Button>
      </form>
    </div>
  );
}
