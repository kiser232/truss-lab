import { EXAM, GALLERY_NAME } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-[#d3dde4] bg-white">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-1 px-3 py-5 text-xs leading-5 text-[#6b7680]">
        <p>
          {GALLERY_NAME} · {EXAM.year}년 {EXAM.month}월 {EXAM.day}일 {EXAM.weekday}요일 시험 ·
          성적 통지 {EXAM.scoreMonth}월 {EXAM.scoreDay}일
        </p>
        <p>응원과 공부 정보를 나누는 게시판입니다. 비방, 허위 성적, 개인정보는 올리지 말아 주세요.</p>
      </div>
    </footer>
  );
}
