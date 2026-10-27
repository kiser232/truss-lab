import { BoardSidebar } from "@/components/board-sidebar";
import { BoardToolbar } from "@/components/board-toolbar";
import { GalleryHero } from "@/components/gallery-hero";
import { PaginationBar } from "@/components/pagination-bar";
import { PostTable } from "@/components/post-table";
import { boardHref } from "@/lib/hrefs";
import { firstParam, parseField, parsePage, parseTab } from "@/lib/query";
import { getHome } from "@/lib/store";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const tab = parseTab(firstParam(params.tab));
  const field = parseField(firstParam(params.field));
  const q = firstParam(params.q).trim().slice(0, 40);
  const page = parsePage(firstParam(params.page));
  const now = new Date();
  const { list, summary, best } = await getHome({ tab, field, q, page }, undefined, now);

  return (
    <div className="space-y-3">
      <GalleryHero summary={summary} />
      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          <BoardToolbar tab={tab} field={field} q={q} />
          <PostTable
            posts={list.posts}
            notices={list.notices}
            tab={tab}
            q={q}
            total={list.total}
            now={now}
          />
          <PaginationBar
            page={list.page}
            pageCount={list.pageCount}
            hrefFor={(nextPage) => boardHref({ tab, field, q, page: nextPage })}
          />
        </div>
        <BoardSidebar summary={summary} best={best} />
      </div>
    </div>
  );
}
