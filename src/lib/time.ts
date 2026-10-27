import { EXAM } from "@/lib/constants";

type SeoulParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
};

export function seoulParts(date: Date): SeoulParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  let hour = pick("hour");
  if (hour === "24") hour = "00";
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour,
    minute: pick("minute"),
  };
}

export function seoulDayKey(date: Date): string {
  const parts = seoulParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatListDate(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const current = seoulParts(now);
  const parts = seoulParts(date);
  if (
    parts.year === current.year &&
    parts.month === current.month &&
    parts.day === current.day
  ) {
    return `${parts.hour}:${parts.minute}`;
  }
  if (parts.year === current.year) return `${parts.month}.${parts.day}`;
  return `${parts.year.slice(2)}.${parts.month}.${parts.day}`;
}

export function formatDateTime(iso: string): string {
  const parts = seoulParts(new Date(iso));
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}

export function examOffset(now = new Date()): number {
  const parts = seoulParts(now);
  const today = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
  );
  const exam = Date.UTC(EXAM.year, EXAM.month - 1, EXAM.day);
  return Math.round((exam - today) / 86_400_000);
}

export function examLabel(offset: number): string {
  if (offset > 0) return `D-${offset}`;
  if (offset === 0) return "D-DAY";
  return `D+${Math.abs(offset)}`;
}

export function isFresh(iso: string, now = new Date()): boolean {
  return now.getTime() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;
}
