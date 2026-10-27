import Link from "next/link";
import { EXAM } from "@/lib/constants";
import { examLabel } from "@/lib/time";
import type { PublicPost, Summary } from "@/lib/types";

const schedule = [
  ["입실 완료", "08:10"],
  ["국어", "08:40–10:00"],
  ["수학", "10:30–12:10"],
  ["영어", "13:10–14:20"],
  ["한국사", "14:50–15:20"],
  ["탐구", "15:35–16:37"],
  ["제2외국어/한문", "17:05–17:45"],
];

export function BoardSidebar({ summary, best }: { summary: Summary; best: PublicPost[] }) {
  return (
    <aside className="space-y-3" aria-label="갤러리 정보">
      <section className="rounded-md border border-[#d3dde4] bg-white p-4">
        <h2 className="text-sm font-semibold text-[#14372c]">수능까지 {examLabel(summary.examOffset)}</h2>
        <p className="mt-1 text-xs leading-5 text-[#6b7680]">
          {EXAM.year}년 {EXAM.month}월 {EXAM.day}일 {EXAM.weekday}요일 시행. 성적 통지는{" "}
          {EXAM.scoreMonth}월 {EXAM.scoreDay}일입니다.
        </p>
      </section>
      <section className="rounded-md border border-[#d3dde4] bg-white p-4">
        <h2 className="text-sm font-semibold text-[#14372c]">추천 많은 글</h2>
        {best.length === 0 ? (
          <p className="mt-2 text-xs text-[#6b7680]">아직 추천이 모이지 않았습니다.</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {best.map((post, index) => (
              <li key={post.id} className="flex gap-2 text-sm">
                <span className="w-4 shrink-0 font-semibold text-[#1f6b4a]">{index + 1}</span>
                <Link href={`/post/${post.id}`} className="min-w-0 text-[#1a4f86] hover:underline">
                  <span className="line-clamp-2">{post.title}</span>
                  <span className="mt-0.5 block text-[11px] text-[#8b97a3]">
                    추천 {post.upvotes} · 조회 {post.views}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section className="rounded-md border border-[#d3dde4] bg-white p-4">
        <h2 className="text-sm font-semibold text-[#14372c]">최근 수능과 같은 시간표</h2>
        <p className="mt-1 text-[11px] leading-5 text-[#8b97a3]">
          당일 공식 안내가 우선입니다. 바뀌면 공지와 질문글에 적어 주세요.
        </p>
        <dl className="mt-2 space-y-1.5 text-xs">
          {schedule.map(([name, time]) => (
            <div key={name} className="flex justify-between gap-3">
              <dt className="text-[#3e4c59]">{name}</dt>
              <dd className="font-medium text-[#14372c]">{time}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="rounded-md border border-[#d3dde4] bg-[#f7fbf8] p-4">
        <h2 className="text-sm font-semibold text-[#14372c]">이 갤의 약속</h2>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-[#3e4c59]">
          <li>등수나 점수를 약속시키지 않습니다.</li>
          <li>학교, 연락처, 수험번호는 적지 않습니다.</li>
          <li>비밀번호는 글 수정과 삭제에만 씁니다.</li>
        </ul>
      </section>
    </aside>
  );
}
