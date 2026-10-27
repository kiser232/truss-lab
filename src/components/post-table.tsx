import Link from "next/link";
import { CategoryBadge } from "@/components/category-badge";
import { ImageMark } from "@/components/image-mark";
import type { Tab } from "@/lib/query";
import { formatListDate, isFresh } from "@/lib/time";
import type { PublicPost } from "@/lib/types";

function TitleLink({ post, now }: { post: PublicPost; now: Date }) {
  const fresh = isFresh(post.createdAt, now);
  return (
    <Link href={`/post/${post.id}`} className="group/title inline">
      <span
        className={
          post.isConcept
            ? "font-semibold text-[#c5362b] group-hover/title:underline"
            : "text-[#1a4f86] group-hover/title:underline"
        }
      >
        {post.title}
      </span>
      {post.comments.length > 0 ? (
        <span className="ml-1 text-[12px] font-medium text-[#e25b16]">
          [{post.comments.length}]
        </span>
      ) : null}
      {post.image ? <ImageMark /> : null}
      {fresh ? (
        <span className="ml-1 align-text-top text-[10px] font-bold text-[#e25b16]">N</span>
      ) : null}
    </Link>
  );
}

function Meta({ post, now }: { post: PublicPost; now: Date }) {
  return (
    <span className="text-[12px] text-[#6b7680]">
      {post.author}
      <span className="mx-1.5 text-[#c5ced6]">·</span>
      {formatListDate(post.createdAt, now)}
      <span className="mx-1.5 text-[#c5ced6]">·</span>
      조회 {post.views.toLocaleString("ko-KR")}
      <span className="mx-1.5 text-[#c5ced6]">·</span>
      추천 {post.upvotes.toLocaleString("ko-KR")}
    </span>
  );
}

export function PostTable({
  posts,
  notices,
  tab,
  q,
  total,
  now,
}: {
  posts: PublicPost[];
  notices: PublicPost[];
  tab: Tab;
  q: string;
  total: number;
  now: Date;
}) {
  const rows = [...notices, ...posts];
  const emptyMessage = q
    ? "검색 결과가 없습니다. 다른 단어로 찾아보거나 글을 남겨 주세요."
    : tab === "concept"
      ? "아직 개념글이 없습니다. 추천이 비추천보다 20개 이상 많으면 이곳에 모입니다."
      : tab === "notice"
        ? "등록된 공지가 없습니다."
        : "아직 글이 없습니다. 첫 응원을 남겨 주세요.";

  return (
    <section id="board" className="overflow-hidden rounded-md border border-[#d3dde4] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e6edf2] px-3 py-2 text-xs text-[#6b7680]">
        <p>
          {q ? "검색 결과" : tab === "concept" ? "개념글" : tab === "notice" ? "공지" : "전체글"}{" "}
          <span className="font-semibold text-[#14372c]">{total.toLocaleString("ko-KR")}</span>
          {notices.length > 0 && tab === "all" ? ` · 공지 ${notices.length}` : ""}
        </p>
        <p>개념 기준 추천 − 비추천 20 이상</p>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-14 text-center">
          <p className="text-sm text-[#3e4c59]">{emptyMessage}</p>
          <Link href="/write" className="mt-3 inline-block text-sm font-medium text-[#1a4f86] underline">
            글쓰기로 이동
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <table className="w-full border-collapse text-left text-[13px]">
              <caption className="sr-only">게시글 목록</caption>
              <thead className="bg-[#f6f8fa] text-[12px] text-[#6b7680]">
                <tr className="border-b border-[#e6edf2]">
                  <th className="w-14 px-3 py-2 font-medium">번호</th>
                  <th className="w-16 px-2 py-2 font-medium">말머리</th>
                  <th className="px-2 py-2 font-medium">제목</th>
                  <th className="w-24 px-2 py-2 font-medium">글쓴이</th>
                  <th className="w-16 px-2 py-2 font-medium">작성일</th>
                  <th className="w-14 px-2 py-2 text-right font-medium">조회</th>
                  <th className="w-14 px-3 py-2 text-right font-medium">추천</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((post) => (
                  <tr
                    key={post.id}
                    className={
                      post.isNotice
                        ? "border-b border-[#f3ead2] bg-[#fffaf0]"
                        : "border-b border-[#f0f3f6] hover:bg-[#f4faf7]"
                    }
                  >
                    <td className="px-3 py-2 text-[#8b97a3]">
                      {post.isNotice ? "공지" : post.id}
                    </td>
                    <td className="px-2 py-2">
                      <CategoryBadge category={post.category} />
                    </td>
                    <td className="px-2 py-2">
                      <TitleLink post={post} now={now} />
                    </td>
                    <td className="truncate px-2 py-2 text-[#495057]">{post.author}</td>
                    <td className="px-2 py-2 text-[#6b7680]">
                      {formatListDate(post.createdAt, now)}
                    </td>
                    <td className="px-2 py-2 text-right text-[#6b7680]">
                      {post.views.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-[#c5362b]">
                      {post.upvotes.toLocaleString("ko-KR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-[#eef2f5] md:hidden">
            {rows.map((post) => (
              <li key={post.id} className={post.isNotice ? "bg-[#fffaf0] px-3 py-3" : "px-3 py-3"}>
                <div className="mb-1.5 flex items-center gap-2">
                  <CategoryBadge category={post.category} />
                  <span className="text-[11px] text-[#8b97a3]">
                    {post.isNotice ? "공지" : `No.${post.id}`}
                  </span>
                </div>
                <TitleLink post={post} now={now} />
                <div className="mt-1">
                  <Meta post={post} now={now} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
