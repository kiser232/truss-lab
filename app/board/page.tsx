"use client";

import { useState, useSyncExternalStore } from "react";
import { SEED_TIPS } from "@/lib/gallery";
import { removeTip, saveTip, useTips } from "@/lib/memory";

function useHash() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("hashchange", onChange);
      return () => window.removeEventListener("hashchange", onChange);
    },
    () => window.location.hash,
    () => "",
  );
}

function tipFromHash(hash: string) {
  if (!hash.startsWith("#tip=")) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(hash.slice(5))) as { title?: string; body?: string };
    if (!parsed.title || !parsed.body) return null;
    return { title: parsed.title.slice(0, 80), body: parsed.body.slice(0, 600) };
  } catch {
    return null;
  }
}

export default function BoardPage() {
  const mine = useTips();
  const shared = tipFromHash(useHash());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [hideShared, setHideShared] = useState(false);
  const [copied, setCopied] = useState("");
  const incoming = hideShared ? null : shared;

  function share(post: { title: string; body: string }) {
    const url = `${window.location.origin}${window.location.pathname}#tip=${encodeURIComponent(JSON.stringify({ title: post.title, body: post.body }))}`;
    void navigator.clipboard.writeText(url).then(
      () => {
        setCopied(post.title);
        window.setTimeout(() => setCopied(""), 1600);
      },
      () => setCopied(""),
    );
  }

  function publish(post: { title: string; body: string }) {
    saveTip({ id: `tip-${Date.now()}`, title: post.title.trim(), body: post.body.trim(), at: Date.now() });
    setTitle("");
    setBody("");
    setHideShared(true);
    history.replaceState(null, "", window.location.pathname);
  }

  return (
    <main className="doc">
      <p className="kicker">NOTES</p>
      <h1>풀이 게시판</h1>
      <p className="note">짧은 팁을 남기고 링크를 복사해 나눌 수 있습니다. 내가 쓴 글은 이 브라우저에 저장됩니다.</p>

      {incoming ? (
        <article className="post">
          <span className="badge">받은 팁</span>
          <h3>{incoming.title}</h3>
          <p>{incoming.body}</p>
          <button type="button" className="primary-btn" onClick={() => publish(incoming)}>
            내 게시판에 담기
          </button>
        </article>
      ) : null}

      <form
        className="post"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim() || !body.trim()) return;
          publish({ title, body });
        }}
      >
        <h3 style={{ marginTop: 0 }}>팁 남기기</h3>
        <input className="text-input" value={title} placeholder="제목" aria-label="제목" onChange={(event) => setTitle(event.target.value)} />
        <textarea className="text-input" value={body} placeholder="한두 문장. 식은 ΣFx, ΣFy처럼." aria-label="내용" rows={4} onChange={(event) => setBody(event.target.value)} />
        <button type="submit" className="primary-btn">
          올리기
        </button>
      </form>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {mine.map((post) => (
          <article key={post.id} className="post">
            <div className="row-tools">
              <span className="badge">내 글</span>
              <span className="note">{new Date(post.at).toLocaleDateString("ko-KR")}</span>
            </div>
            <h3>{post.title}</h3>
            <p>{post.body}</p>
            <div className="row-tools">
              <button type="button" className="quiet-btn" onClick={() => share(post)}>
                {copied === post.title ? "링크 복사됨" : "공유 링크"}
              </button>
              <button
                type="button"
                className="quiet-btn"
                onClick={() => removeTip(post.id)}
              >
                삭제
              </button>
            </div>
          </article>
        ))}
        {SEED_TIPS.map((post) => (
          <article key={post.id} className="post">
            <span className="badge">기본</span>
            <h3>{post.title}</h3>
            <p>{post.body}</p>
            <button type="button" className="quiet-btn" onClick={() => share(post)}>
              {copied === post.title ? "링크 복사됨" : "공유 링크"}
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}
