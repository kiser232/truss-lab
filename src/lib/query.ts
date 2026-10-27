import { PAGE_SIZE } from "@/lib/constants";
import type { PublicPost } from "@/lib/types";

export type Tab = "all" | "concept" | "notice";
export type SearchField = "all" | "title" | "author" | "comment";

export type ListQuery = {
  tab: Tab;
  field: SearchField;
  q: string;
  page: number;
  pageSize?: number;
};

export type ListResult = {
  posts: PublicPost[];
  notices: PublicPost[];
  page: number;
  pageCount: number;
  total: number;
};

function includes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function matches(post: PublicPost, field: SearchField, q: string): boolean {
  if (!q) return true;
  if (field === "title") return includes(post.title, q);
  if (field === "author") return includes(post.author, q);
  if (field === "comment") {
    return post.comments.some(
      (comment) => includes(comment.content, q) || includes(comment.author, q),
    );
  }
  return (
    includes(post.title, q) ||
    includes(post.content, q) ||
    includes(post.author, q) ||
    post.comments.some((comment) => includes(comment.content, q))
  );
}

function byNewest(a: PublicPost, b: PublicPost): number {
  return b.id - a.id;
}

export function queryPosts(posts: PublicPost[], query: ListQuery): ListResult {
  const pageSize = query.pageSize ?? PAGE_SIZE;
  const q = query.q.trim();
  const matched = posts.filter((post) => matches(post, query.field, q));

  if (query.tab === "notice") {
    const notices = matched.filter((post) => post.isNotice).sort(byNewest);
    return paginate(notices, [], query.page, pageSize);
  }

  if (query.tab === "concept") {
    const concepts = matched.filter((post) => post.isConcept).sort(byNewest);
    return paginate(concepts, [], query.page, pageSize);
  }

  const notices = matched.filter((post) => post.isNotice).sort(byNewest);
  const regular = matched.filter((post) => !post.isNotice).sort(byNewest);
  return paginate(regular, notices, query.page, pageSize);
}

function paginate(
  items: PublicPost[],
  notices: PublicPost[],
  requestedPage: number,
  pageSize: number,
): ListResult {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage || 1), pageCount);
  const start = (page - 1) * pageSize;
  return {
    posts: items.slice(start, start + pageSize),
    notices,
    page,
    pageCount,
    total: items.length,
  };
}

export function parseTab(value: string | undefined): Tab {
  if (value === "concept" || value === "notice") return value;
  return "all";
}

export function parseField(value: string | undefined): SearchField {
  if (value === "title" || value === "author" || value === "comment") return value;
  return "all";
}

export function parsePage(value: string | undefined): number {
  const page = Number(value);
  if (!Number.isInteger(page) || page < 1) return 1;
  return page;
}

export function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
