import Image from "next/image";
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
  const examDate = `${EXAM.year}.${String(EXAM.month).padStart(2, "0")}.${String(EXAM.day).padStart(2, "0")}`;

  return (
    <section className="overflow-hidden rounded-md border border-[#d3dde4] bg-white shadow-[0_1px_0_rgba(20,55,44,0.04)]">
      <div className="relative h-44 sm:h-64 md:h-[340px]">
        <Image
          src="/banner.jpg"
          alt="장원준"
          fill
          priority
          sizes="(min-width: 1100px) 1100px, 100vw"
          className="object-cover object-[center_70%] md:object-[center_84%]"
        />
        <div className="absolute inset-0 hidden bg-gradient-to-t from-[#0d241c] via-[#0d241c]/30 to-transparent md:block" />
        <div className="relative hidden h-full items-end justify-between gap-6 p-6 md:flex">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium tracking-[0.16em] text-[#f3d48a]">
              2027학년도 대학수학능력시험
            </p>
            <h1 className="mt-1 font-display text-[2.45rem] leading-[1.15] text-white drop-shadow">
              {GALLERY_NAME}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/90">
              {EXAM.month}월 {EXAM.day}일 {EXAM.weekday}요일, 수험생 장원준을 응원합니다. {cheer}
            </p>
          </div>
          <div className="flex w-[180px] flex-col items-center justify-center rounded-md bg-[#14372c]/90 px-4 py-3 text-center text-white">
            <p className="text-[11px] tracking-[0.18em] text-[#e4b15a]">시험까지</p>
            <p className="font-display text-5xl leading-none text-[#f3d48a]">{label}</p>
            <p className="mt-1 text-xs text-[#d5e6dc]">{examDate}</p>
          </div>
        </div>
      </div>
      <div className="flex items-end justify-between gap-3 bg-[#14372c] px-4 py-4 text-white md:hidden">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-[#f3d48a]">
            2027학년도 대학수학능력시험
          </p>
          <h1 className="mt-1 font-display text-[1.65rem] leading-[1.15]">{GALLERY_NAME}</h1>
          <p className="mt-2 text-sm leading-6 text-white/90">
            {EXAM.month}월 {EXAM.day}일 {EXAM.weekday}요일, 수험생 장원준을 응원합니다. {cheer}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-[#14372c] px-4 py-3 text-white md:hidden">
        <p className="text-[11px] tracking-[0.16em] text-[#e4b15a]">시험까지</p>
        <p className="font-display text-4xl leading-none text-[#f3d48a]">{label}</p>
        <p className="text-xs text-[#d5e6dc]">{examDate}</p>
      </div>
      <dl className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[#e6edf2] px-4 py-3 text-xs text-[#6b7680] sm:px-6">
        {stats.map(([name, value]) => (
          <div key={name}>
            <dt className="inline">{name} </dt>
            <dd className="inline font-semibold text-[#14372c]">{value.toLocaleString("ko-KR")}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
