import { CATEGORIES, RESERVED_NICKNAMES, type UserCategory } from "@/lib/constants";

function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();
}

export function parseNickname(value: unknown): string | { message: string } {
  const nickname = clean(value).replace(/\s+/g, " ");
  if (!nickname) return { message: "닉네임을 입력해 주세요." };
  if (nickname.length > 12) return { message: "닉네임은 12자까지 쓸 수 있습니다." };
  if (nickname.includes("\n")) return { message: "닉네임은 한 줄로 입력해 주세요." };
  if (RESERVED_NICKNAMES.includes(nickname)) {
    return { message: "이 닉네임은 쓸 수 없습니다." };
  }
  return nickname;
}

export function parsePassword(value: unknown): string | { message: string } {
  const password = clean(value);
  if (password.length < 4) return { message: "비밀번호는 4자 이상이어야 합니다." };
  if (password.length > 20) return { message: "비밀번호는 20자까지 쓸 수 있습니다." };
  return password;
}

export function parseTitle(value: unknown): string | { message: string } {
  const title = clean(value).replace(/\s+/g, " ");
  if (!title) return { message: "제목을 입력해 주세요." };
  if (title.length > 80) return { message: "제목은 80자까지 쓸 수 있습니다." };
  return title;
}

export function parseContent(value: unknown): string | { message: string } {
  const content = clean(value);
  if (!content) return { message: "내용을 입력해 주세요." };
  if (content.length > 5000) return { message: "내용은 5000자까지 쓸 수 있습니다." };
  return content;
}

export function parseComment(value: unknown): string | { message: string } {
  const content = clean(value);
  if (!content) return { message: "댓글을 입력해 주세요." };
  if (content.length > 300) return { message: "댓글은 300자까지 쓸 수 있습니다." };
  return content;
}

export function parseCategory(value: unknown): UserCategory | { message: string } {
  const category = clean(value);
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    return { message: "말머리를 선택해 주세요." };
  }
  return category as UserCategory;
}

export function isMessage(value: unknown): value is { message: string } {
  return typeof value === "object" && value !== null && "message" in value;
}
