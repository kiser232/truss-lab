import assert from "node:assert/strict";
import { test } from "node:test";
import { isSafeImageName, sniffImage } from "./images";
import { hashPassword, verifyPassword } from "./password";
import { queryPosts } from "./query";
import { examLabel, examOffset } from "./time";
import type { PublicPost } from "./types";
import { isMessage, parseNickname, parseTitle } from "./validators";

function post(partial: Partial<PublicPost> & Pick<PublicPost, "id" | "title">): PublicPost {
  return {
    content: "본문",
    author: "테스터",
    category: "응원",
    isNotice: false,
    views: 0,
    upvotes: 0,
    downvotes: 0,
    createdAt: "2026-10-20T09:00:00+09:00",
    comments: [],
    net: 0,
    isConcept: false,
    myVote: 0,
    image: null,
    ...partial,
  };
}

test("image sniff accepts photo signatures and rejects other bytes", () => {
  const png = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44,
  ]);
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const gif = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0]);
  const webp = Uint8Array.from([
    0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
  ]);
  assert.equal(sniffImage(png), "png");
  assert.equal(sniffImage(jpeg), "jpg");
  assert.equal(sniffImage(gif), "gif");
  assert.equal(sniffImage(webp), "webp");
  assert.equal(sniffImage(Uint8Array.from([0x3c, 0x73, 0x76, 0x67, 0, 0, 0, 0, 0, 0, 0, 0])), null);
  assert.equal(isSafeImageName("a".repeat(32) + ".png"), true);
  assert.equal(isSafeImageName("../board.json"), false);
  assert.equal(isSafeImageName(`${"a".repeat(32)}.svg`), false);
});

test("password round trip accepts the same secret and rejects another", () => {
  const stored = hashPassword("wonjun");
  assert.equal(verifyPassword("wonjun", stored), true);
  assert.equal(verifyPassword("wrong", stored), false);
  assert.equal(verifyPassword("wonjun", "not-a-hash"), false);
});

test("nickname and title validation", () => {
  assert.equal(parseNickname("  응원단  "), "응원단");
  assert.equal(isMessage(parseNickname("갤관리")), true);
  assert.equal(isMessage(parseNickname("")), true);
  assert.equal(isMessage(parseTitle("   ")), true);
  assert.equal(parseTitle("  오늘 페이스  "), "오늘 페이스");
});

test("notices stay pinned and regular posts paginate", () => {
  const notices = [
    post({ id: 1, title: "안내", isNotice: true, category: "공지" }),
    post({ id: 2, title: "출처", isNotice: true, category: "공지" }),
  ];
  const regular = Array.from({ length: 16 }, (_, index) =>
    post({ id: index + 3, title: `글 ${index + 3}` }),
  );
  const page1 = queryPosts([...notices, ...regular], {
    tab: "all",
    field: "all",
    q: "",
    page: 1,
    pageSize: 15,
  });
  assert.equal(page1.notices.length, 2);
  assert.equal(page1.posts.length, 15);
  assert.equal(page1.posts[0]?.id, 18);
  assert.equal(page1.pageCount, 2);

  const page2 = queryPosts([...notices, ...regular], {
    tab: "all",
    field: "all",
    q: "",
    page: 9,
    pageSize: 15,
  });
  assert.equal(page2.page, 2);
  assert.equal(page2.posts.length, 1);
});

test("concept tab and author search", () => {
  const posts = [
    post({ id: 3, title: "개념", author: "졸업생", isConcept: true, net: 8 }),
    post({ id: 4, title: "일반", author: "응원단" }),
    post({
      id: 5,
      title: "댓글글",
      comments: [
        {
          id: 1,
          author: "탐구러",
          content: "연표 감사",
          createdAt: "2026-10-21T10:00:00+09:00",
        },
      ],
    }),
  ];
  const concepts = queryPosts(posts, { tab: "concept", field: "all", q: "", page: 1 });
  assert.deepEqual(concepts.posts.map((item) => item.id), [3]);

  const byAuthor = queryPosts(posts, { tab: "all", field: "author", q: "응원", page: 1 });
  assert.deepEqual(byAuthor.posts.map((item) => item.id), [4]);

  const byComment = queryPosts(posts, { tab: "all", field: "comment", q: "연표", page: 1 });
  assert.deepEqual(byComment.posts.map((item) => item.id), [5]);
});

test("exam countdown uses the Seoul calendar date", () => {
  const morning = new Date("2026-10-27T00:30:00+09:00");
  assert.equal(examOffset(morning), 23);
  assert.equal(examLabel(23), "D-23");
  assert.equal(examLabel(0), "D-DAY");
  assert.equal(examLabel(-2), "D+2");
});
