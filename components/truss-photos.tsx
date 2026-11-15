"use client";

import { useEffect, useState } from "react";
import { asset } from "@/lib/asset";
import { TRUSS_TYPES, type TrussType } from "@/lib/gallery";
import { loadFile, loadPhotos, removeFile, saveFile, savePhoto } from "@/lib/memory";

export function TrussPhotos() {
  const [open, setOpen] = useState<TrussType | null>(null);
  const [index, setIndex] = useState(0);
  const [extras, setExtras] = useState<Record<string, string[]>>({});
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const urls: string[] = [];
    Promise.all(
      TRUSS_TYPES.map(async (type) => {
        const rows = await loadPhotos(type.id);
        const local = rows.map((row) => {
          const url = URL.createObjectURL(row.blob);
          urls.push(url);
          return url;
        });
        return [type.id, local] as const;
      }),
    )
      .then((pairs) => {
        if (!alive) {
          urls.forEach((url) => URL.revokeObjectURL(url));
          return;
        }
        setExtras(Object.fromEntries(pairs));
      })
      .catch(() => setExtras({}));
    return () => {
      alive = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [tick]);

  useEffect(() => {
    let url = "";
    let alive = true;
    loadFile("photo-pdf")
      .then((blob) => {
        if (!alive || !blob) {
          if (alive) setPdfUrl(null);
          return;
        }
        url = URL.createObjectURL(blob);
        setPdfUrl(url);
      })
      .catch(() => setPdfUrl(null));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [tick]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shots = open ? [...open.shots.map((shot) => ({ ...shot, src: asset(shot.src) })), ...(extras[open.id] ?? []).map((src) => ({ src, place: "내가 올린 사진", credit: "이 브라우저" }))] : [];
  const shot = shots[index];

  return (
    <>
      <div className="row-tools" style={{ marginTop: 8 }}>
        <label className="primary-btn" style={{ cursor: "pointer" }}>
          사진 자료 PDF
          <input
            type="file"
            accept="application/pdf"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void saveFile("photo-pdf", file).then(() => setTick((n) => n + 1));
              event.target.value = "";
            }}
          />
        </label>
        {pdfUrl ? (
          <button type="button" className="quiet-btn" onClick={() => void removeFile("photo-pdf").then(() => setTick((n) => n + 1))}>
            PDF 빼기
          </button>
        ) : (
          <span className="note">올리면 이 브라우저에 남아 있습니다.</span>
        )}
      </div>
      {pdfUrl ? <iframe className="pdf-frame" title="트러스 사진 자료" src={pdfUrl} /> : null}
      <div className="doc-grid">
        {TRUSS_TYPES.map((type) => (
          <article key={type.id} className="doc-card photo-card">
            <button
              type="button"
              className="shot-button"
              onClick={() => {
                setOpen(type);
                setIndex(0);
              }}
            >
              {/* Local gallery files and browser-saved photos share this tag. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset(type.shots[0].src)} alt={type.shots[0].place} />
              <span>사진 {type.shots.length + (extras[type.id]?.length ?? 0)}</span>
            </button>
            <h3>{type.name}</h3>
            <p>{type.note}</p>
            <label className="quiet-btn" style={{ display: "inline-block", marginTop: 10, cursor: "pointer" }}>
              이 항목에 사진 추가
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void savePhoto(type.id, file).then(() => setTick((n) => n + 1));
                  event.target.value = "";
                }}
              />
            </label>
          </article>
        ))}
      </div>
      <p className="note">
        자료집의 대표 사진입니다. 누르면 같은 항목의 다른 사진이 열립니다.{" "}
        <a href={asset("/exams/photos.pdf")}>사진 PDF 원본</a>
      </p>
      {open && shot ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${open.name} 사진`}>
          <button type="button" className="lightbox-back" aria-label="닫기" onClick={() => setOpen(null)} />
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot.src} alt={shot.place} />
            <figcaption>
              <strong>
                {open.name} · {shot.place}
              </strong>
              <span>{shot.credit}</span>
              <div className="row-tools">
                <button type="button" className="quiet-btn" onClick={() => setIndex((n) => (n + shots.length - 1) % shots.length)}>
                  이전
                </button>
                <span>
                  {index + 1}/{shots.length}
                </span>
                <button type="button" className="quiet-btn" onClick={() => setIndex((n) => (n + 1) % shots.length)}>
                  다음
                </button>
                <button type="button" className="primary-btn" onClick={() => setOpen(null)}>
                  닫기
                </button>
              </div>
            </figcaption>
          </figure>
        </div>
      ) : null}
    </>
  );
}
