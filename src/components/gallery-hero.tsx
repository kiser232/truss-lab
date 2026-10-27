import { CHEERS, EXAM, GALLERY_NAME } from "@/lib/constants";
import { examLabel } from "@/lib/time";
import type { Summary } from "@/lib/types";

export function GalleryHero({ summary }: { summary: Summary }) {
  const cheer = CHEERS[Math.abs(summary.examOffset) % CHEERS.length];
  const label = examLabel(summary.examOffset);
  const stats = [
    ["게시글", summary.totalPosts],
    ["오늘", summary.todayPosts],
    ["개념글", summary.conceptCount],
    ["댓글", summary.commentCount],
  ] as const;

  return (
    <section className="overflow-hidden rounded-md border border-[#d3dde4] bg-white shadow-[0_1px_0_rgba(20,55,44,0.04)]">
      <div className="grid md:grid-cols-[minmax(0,1fr)_210px]">
        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <p className="text-[11px] font-medium tracking-[0.16em] text-[#1f6b4a]">
            2027학년도 대학수학능력시험
          </p>
          <h1 className="mt-1 font-display text-[1.85rem] leading-[1.15] text-[#14372c] sm:text-[2.45rem]">
            {GALLERY_NAME}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3e4c59]">
            {EXAM.month}월 {EXAM.day}일 {EXAM.weekday}요일, 수험생 장원준을 응원합니다.{" "}
            {cheer}
          </p>
          <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6b7680]">
            {stats.map(([name, value]) => (
              <div key={name}>
                <dt className="inline">{name} </dt>
                <dd className="inline font-semibold text-[#14372c]">
                  {value.toLocaleString("ko-KR")}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-row items-center justify-between gap-3 bg-[#14372c] px-5 py-4 text-white md:flex-col md:justify-center md:text-center">
          <p className="text-[11px] tracking-[0.18em] text-[#e4b15a]">시험까지</p>
          <p className="font-display text-5xl leading-none text-[#f3d48a]">{label}</p>
          <p className="text-xs text-[#d5e6dc]">
            {EXAM.year}.{String(EXAM.month).padStart(2, "0")}.{String(EXAM.day).padStart(2, "0")}
          </p>
        </div>
      </div>
    </section>
  );
}
