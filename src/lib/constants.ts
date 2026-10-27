export const GALLERY_NAME = "장원준 수능 응원 갤러리";

export const EXAM = {
  year: 2026,
  month: 11,
  day: 19,
  weekday: "목",
  scoreYear: 2026,
  scoreMonth: 12,
  scoreDay: 11,
} as const;

export const PAGE_SIZE = 15;
export const CONCEPT_NET = 20;

export const CATEGORIES = ["응원", "정보", "질문", "후기", "잡담"] as const;

export type UserCategory = (typeof CATEGORIES)[number];
export type Category = UserCategory | "공지";

export const RESERVED_NICKNAMES = ["갤관리", "관리자", "운영자"];

export const CHEERS = [
  "원준아, 오늘은 진도보다 컨디션이다.",
  "맞는 문제만 차분히 가져가도 충분하다.",
  "막판 실력은 잠과 밥에서 갈린다.",
  "틀려도 다음 장. 한 문제에 머물지 말자.",
  "네 페이스가 정답이다. 남과 비교하지 말자.",
  "익숙한 문제를 정확하게. 새로운 욕심은 접자.",
  "시험장에서는 아는 걸 꺼내면 된다.",
  "숨 한 번 고르고, 문제의 첫 줄부터.",
];
