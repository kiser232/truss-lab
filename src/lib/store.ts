import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CONCEPT_NET } from "@/lib/constants";
import { imageUrl, isSafeImageName, type ImageChange, type ImageExt } from "@/lib/images";
import { hashPassword, verifyPassword } from "@/lib/password";
import { queryPosts, type ListQuery, type ListResult } from "@/lib/query";
import { buildSeed } from "@/lib/seed";
import { examOffset, seoulDayKey } from "@/lib/time";
import type { Category, UserCategory } from "@/lib/constants";
import type { Database, Post, PublicPost, Summary } from "@/lib/types";

const DATA_PATH = path.join(process.cwd(), "data", "board.json");
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

let queue: Promise<void> = Promise.resolve();

function readDB(): Database {
  if (!existsSync(DATA_PATH)) {
    const seed = buildSeed();
    writeDB(seed);
    return seed;
  }
  const parsed = JSON.parse(readFileSync(DATA_PATH, "utf8")) as Database;
  if (!parsed || !Array.isArray(parsed.posts) || typeof parsed.votes !== "object") {
    throw new Error("게시판 데이터를 읽지 못했습니다.");
  }
  if (!parsed.seen || typeof parsed.seen !== "object") parsed.seen = {};
  for (const post of parsed.posts) {
    if (typeof post.image !== "string" || !isSafeImageName(post.image)) post.image = null;
  }
  return parsed;
}

function saveImage(bytes: Buffer, ext: ImageExt): string {
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  mkdirSync(UPLOAD_DIR, { recursive: true });
  writeFileSync(path.join(UPLOAD_DIR, name), bytes);
  return name;
}

function removeImage(name: string | null | undefined) {
  if (!name || !isSafeImageName(name)) return;
  const file = path.join(UPLOAD_DIR, name);
  if (existsSync(file)) unlinkSync(file);
}

function writeDB(db: Database) {
  const dir = path.dirname(DATA_PATH);
  mkdirSync(dir, { recursive: true });
  const tmp = `${DATA_PATH}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(db, null, 2)}\n`);
  renameSync(tmp, DATA_PATH);
}

function withDB<T>(fn: (db: Database) => T, write: boolean): Promise<T> {
  const run = queue.then(() => {
    const db = readDB();
    const result = fn(db);
    if (write) writeDB(db);
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function toPublic(post: Post, votes: Database["votes"], voterId?: string): PublicPost {
  const net = post.upvotes - post.downvotes;
  const vote = voterId ? votes[`${post.id}:${voterId}`] : undefined;
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    author: post.author,
    category: post.category,
    isNotice: post.isNotice,
    views: post.views,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    createdAt: post.createdAt,
    comments: post.comments
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((comment) => ({
        id: comment.id,
        author: comment.author,
        content: comment.content,
        createdAt: comment.createdAt,
      })),
    net,
    isConcept: !post.isNotice && net >= CONCEPT_NET,
    myVote: vote === 1 || vote === -1 ? vote : 0,
    image: imageUrl(post.image),
  };
}

export async function getHome(query: ListQuery, voterId?: string, now = new Date()) {
  return withDB((db) => {
    const posts = db.posts.map((post) => toPublic(post, db.votes, voterId));
    const list: ListResult = queryPosts(posts, query);
    const today = seoulDayKey(now);
    const summary: Summary = {
      totalPosts: posts.length,
      todayPosts: posts.filter((post) => seoulDayKey(new Date(post.createdAt)) === today).length,
      conceptCount: posts.filter((post) => post.isConcept).length,
      commentCount: posts.reduce((sum, post) => sum + post.comments.length, 0),
      examOffset: examOffset(now),
    };
    const best = posts
      .filter((post) => !post.isNotice)
      .sort((a, b) => b.net - a.net || b.views - a.views)
      .slice(0, 5);
    return { list, summary, best };
  }, false);
}

export async function getPost(id: number, voterId?: string, recordView = false) {
  return withDB((db) => {
    const post = db.posts.find((item) => item.id === id);
    if (!post) return null;
    if (recordView) {
      if (voterId) {
        const key = `${post.id}:${voterId}`;
        if (!db.seen[key]) {
          db.seen[key] = 1;
          post.views += 1;
        }
      } else {
        post.views += 1;
      }
    }
    return toPublic(post, db.votes, voterId);
  }, recordView);
}

type WriteInput = {
  title: string;
  content: string;
  author: string;
  password: string;
  category: UserCategory;
  image: ImageChange;
};

export async function createPost(input: WriteInput) {
  let saved: string | null = null;
  try {
    return await withDB((db) => {
      saved = input.image.kind === "replace" ? saveImage(input.image.bytes, input.image.ext) : null;
      const post: Post = {
        id: db.nextPostId++,
        title: input.title,
        content: input.content,
        author: input.author,
        passwordHash: hashPassword(input.password),
        category: input.category,
        isNotice: false,
        views: 0,
        upvotes: 0,
        downvotes: 0,
        createdAt: new Date().toISOString(),
        comments: [],
        image: saved,
      };
      db.posts.push(post);
      return post.id;
    }, true);
  } catch (error) {
    removeImage(saved);
    throw error;
  }
}

export async function updatePost(id: number, input: WriteInput) {
  let saved: string | null = null;
  try {
    const result = await withDB((db) => {
      const post = db.posts.find((item) => item.id === id);
      if (!post) return { ok: false as const, message: "글을 찾을 수 없습니다." };
      if (post.isNotice) return { ok: false as const, message: "공지는 수정할 수 없습니다." };
      if (!verifyPassword(input.password, post.passwordHash)) {
        return { ok: false as const, message: "비밀번호가 일치하지 않습니다." };
      }
      const previous = typeof post.image === "string" ? post.image : null;
      post.title = input.title;
      post.content = input.content;
      post.author = input.author;
      post.category = input.category satisfies Category;
      post.passwordHash = hashPassword(input.password);
      if (input.image.kind === "replace") {
        saved = saveImage(input.image.bytes, input.image.ext);
        post.image = saved;
      }
      if (input.image.kind === "clear") post.image = null;
      const discard = input.image.kind === "keep" ? null : previous;
      return { ok: true as const, discard };
    }, true);
    if (!result.ok) return result;
    if (result.discard && result.discard !== saved) removeImage(result.discard);
    return { ok: true as const };
  } catch (error) {
    removeImage(saved);
    throw error;
  }
}

export async function deletePost(id: number, password: string) {
  const result = await withDB((db) => {
    const index = db.posts.findIndex((item) => item.id === id);
    if (index < 0) return { ok: false as const, message: "글을 찾을 수 없습니다." };
    const post = db.posts[index];
    if (post.isNotice) return { ok: false as const, message: "공지는 삭제할 수 없습니다." };
    if (!verifyPassword(password, post.passwordHash)) {
      return { ok: false as const, message: "비밀번호가 일치하지 않습니다." };
    }
    const image = typeof post.image === "string" ? post.image : null;
    db.posts.splice(index, 1);
    for (const key of Object.keys(db.votes)) {
      if (key.startsWith(`${id}:`)) delete db.votes[key];
    }
    for (const key of Object.keys(db.seen)) {
      if (key.startsWith(`${id}:`)) delete db.seen[key];
    }
    return { ok: true as const, image };
  }, true);
  if (!result.ok) return result;
  removeImage(result.image);
  return { ok: true as const };
}

export async function addComment(
  postId: number,
  input: { author: string; password: string; content: string },
) {
  return withDB((db) => {
    const post = db.posts.find((item) => item.id === postId);
    if (!post) return { ok: false as const, message: "글을 찾을 수 없습니다." };
    post.comments.push({
      id: db.nextCommentId++,
      author: input.author,
      content: input.content,
      passwordHash: hashPassword(input.password),
      createdAt: new Date().toISOString(),
    });
    return { ok: true as const };
  }, true);
}

export async function deleteComment(postId: number, commentId: number, password: string) {
  return withDB((db) => {
    const post = db.posts.find((item) => item.id === postId);
    if (!post) return { ok: false as const, message: "글을 찾을 수 없습니다." };
    const index = post.comments.findIndex((comment) => comment.id === commentId);
    if (index < 0) return { ok: false as const, message: "댓글을 찾을 수 없습니다." };
    if (!verifyPassword(password, post.comments[index].passwordHash)) {
      return { ok: false as const, message: "비밀번호가 일치하지 않습니다." };
    }
    post.comments.splice(index, 1);
    return { ok: true as const };
  }, true);
}

export async function castVote(postId: number, voterId: string, value: 1 | -1) {
  return withDB((db) => {
    const post = db.posts.find((item) => item.id === postId);
    if (!post || post.isNotice) return;
    const key = `${postId}:${voterId}`;
    const prev = db.votes[key] ?? 0;
    if (prev === value) {
      delete db.votes[key];
      if (value === 1) post.upvotes = Math.max(0, post.upvotes - 1);
      else post.downvotes = Math.max(0, post.downvotes - 1);
      return;
    }
    if (prev === 1) post.upvotes = Math.max(0, post.upvotes - 1);
    if (prev === -1) post.downvotes = Math.max(0, post.downvotes - 1);
    db.votes[key] = value;
    if (value === 1) post.upvotes += 1;
    else post.downvotes += 1;
  }, true);
}
