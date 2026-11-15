"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExamDesk } from "@/components/exam-desk";
import { SpaceBoard } from "@/components/space-board";
import { TrussBoard } from "@/components/truss-board";
import { Workspace } from "@/components/workspace";
import { analyze } from "@/lib/analyze";
import { EXAM_YEARS, examsFor, type Problem } from "@/lib/exams";
import { LAB_MATERIALS } from "@/lib/materials";
import type { Model } from "@/lib/types";
import { asset } from "@/lib/asset";
import { loadFile, removeFile, removeMade, saveFile, saveMade, useMade, type MadeProblem } from "@/lib/memory";
import { isSpaceModel } from "@/lib/space";

function asProblem(made: MadeProblem): Problem {
  return {
    id: made.id,
    title: "내가 낸 문제",
    prompt: made.prompt,
    blurb: "계산기에 저장한 배치",
    model: made.model,
    ask: made.ask,
  };
}

function useObjectUrl(key: string, tick: number) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl = "";
    let alive = true;
    loadFile(key)
      .then((blob) => {
        if (!alive || !blob) {
          if (alive) setUrl(null);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => setUrl(null));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [key, tick]);
  return url;
}

function useBundledPdf(year: number) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const path = asset(`/exams/${year}.pdf`);
    let alive = true;
    fetch(path, { method: "HEAD" })
      .then((res) => {
        if (!alive) return;
        const type = res.headers.get("content-type") ?? "";
        setUrl(res.ok && !type.includes("text/html") ? path : null);
      })
      .catch(() => {
        if (alive) setUrl(null);
      });
    return () => {
      alive = false;
    };
  }, [year]);
  return url;
}

export default function PastPage() {
  const [year, setYear] = useState<number>(2019);
  const [mine, setMine] = useState(false);
  const [index, setIndex] = useState(0);
  const made = useMade();
  const [tick, setTick] = useState(0);
  const uploaded = useObjectUrl(`pdf-${year}`, tick);
  const bundled = useBundledPdf(year);
  const pdfUrl = uploaded ?? bundled;
  const problems = examsFor(year);
  const current = mine ? (made[index] ? asProblem(made[index]) : null) : problems[index] ?? problems[0];

  return (
    <main className="work">
      <p className="kicker">ARCHIVE</p>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
        <h1 style={{ margin: "4px 0 8px", fontSize: 28, letterSpacing: "-0.04em" }}>기출 원본</h1>
        <Link href="/quiz#wrongs" className="ghost" style={{ borderRadius: 10, padding: "8px 12px" }}>
          오답노트
        </Link>
      </div>
      <p className="note" style={{ marginTop: 0 }}>
        왼쪽이 그 해 기출 원본입니다. 트러스 문항은 오른쪽 계산기에 같은 그림이 있습니다. 틀린 답은 오답노트로 갑니다.
      </p>
      <div className="row-tools" style={{ marginBottom: 12 }}>
        {EXAM_YEARS.map((item) => (
          <button
            key={item}
            type="button"
            className={`stage-chip ${year === item && !mine ? "on" : ""}`}
            onClick={() => {
              setYear(item);
              setMine(false);
              setIndex(0);
            }}
          >
            {item}
          </button>
        ))}
        <button type="button" className={`stage-chip ${mine ? "on" : ""}`} onClick={() => { setMine(true); setIndex(0); }}>
          내가 낸 문제 {made.length ? made.length : ""}
        </button>
      </div>

      {mine ? (
        made.length === 0 || !current ? (
          <div className="panel" style={{ padding: 18 }}>
            <p className="note" style={{ margin: 0 }}>
              오른쪽 계산기를 고친 뒤 “문제로 저장”을 누르면 여기에 쌓입니다.
            </p>
          </div>
        ) : (
          <div>
            <div className="row-tools" style={{ marginBottom: 10 }}>
              {made.map((problem, problemIndex) => (
                <button key={problem.id} type="button" className={`stage-chip ${index === problemIndex ? "on" : ""}`} onClick={() => setIndex(problemIndex)}>
                  {problemIndex + 1}
                </button>
              ))}
              <button
                type="button"
                className="quiet-btn"
                onClick={() => {
                  removeMade(current.id);
                  setIndex(0);
                  setTick((n) => n + 1);
                }}
              >
                이 문제 삭제
              </button>
            </div>
            <ExamDesk key={current.id} problem={current} source="내가 낸 문제" onGraded={() => setTick((n) => n + 1)} />
          </div>
        )
      ) : (
        <div className="exam-split">
          <section className="exam-source">
            <div className="row-tools">
              <label className="primary-btn" style={{ cursor: "pointer" }}>
                {year} PDF 올리기
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void saveFile(`pdf-${year}`, file).then(() => setTick((n) => n + 1));
                    event.target.value = "";
                  }}
                />
              </label>
              {uploaded ? (
                <button type="button" className="quiet-btn" onClick={() => void removeFile(`pdf-${year}`).then(() => setTick((n) => n + 1))}>
                  PDF 빼기
                </button>
              ) : null}
            </div>
            {pdfUrl ? (
              <iframe className="pdf-frame" title={`${year} 기출 원본`} src={pdfUrl} />
            ) : (
              <div className="panel" style={{ padding: 14 }}>
                <p className="note" style={{ marginTop: 0 }}>
                  {year} 원본 PDF가 없습니다. 파일을 올리면 이 칸에 열립니다.
                </p>
                {problems.map((problem, problemIndex) => {
                  const showBoard = problemIndex === 0 || problems[problemIndex - 1].model !== problem.model;
                  return (
                    <article key={problem.id} style={{ marginTop: 12 }}>
                      {showBoard && problem.model.nodes.length > 0 ? <PaperBoard model={problem.model} /> : null}
                      <button type="button" className={`stage-chip ${index === problemIndex ? "on" : ""}`} onClick={() => setIndex(problemIndex)}>
                        {problemIndex + 1}. {problem.prompt}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
            {pdfUrl ? (
              <div className="row-tools">
                {problems.map((problem, problemIndex) => (
                  <button key={problem.id} type="button" className={`stage-chip ${index === problemIndex ? "on" : ""}`} onClick={() => setIndex(problemIndex)}>
                    {problemIndex + 1}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
          {current ? (
            <ExamDesk
              key={current.id}
              problem={current}
              source="기출"
              onGraded={() => setTick((n) => n + 1)}
              onSave={(next) => {
                saveMade({ id: next.id, prompt: next.prompt, model: next.model, ask: next.ask, at: Date.now() });
                setTick((n) => n + 1);
                setMine(true);
                setIndex(0);
              }}
            />
          ) : (
            <ScratchPad key={year} note={problems.length === 0 ? "이 해는 왼쪽 원본을 보면서 계산기에 옮겨 그리세요." : ""} />
          )}
        </div>
      )}
    </main>
  );
}

function ScratchPad({ note }: { note: string }) {
  const [model, setModel] = useState<Model>({ nodes: [], members: [], supports: [], loads: [] });
  const analysis = analyze(model);
  const visible = analysis.status === "unstable" || analysis.status === "invalid" || analysis.status === "empty" ? null : analysis;
  return (
    <div>
      {note ? <p className="note" style={{ marginTop: 0 }}>{note}</p> : null}
      <Workspace
        model={model}
        onChange={setModel}
        materials={LAB_MATERIALS}
        analysis={visible}
        tools={["select", "node", "member", "pin", "rollerY", "load", "erase"]}
        scene="paper"
      />
    </div>
  );
}

function PaperBoard({ model }: { model: Problem["model"] }) {
  if (isSpaceModel(model)) {
    return <SpaceBoard model={model} analysis={null} pendingId={null} tool="select" compact onLeft={() => undefined} onRight={() => undefined} />;
  }
  return (
    <TrussBoard
      model={model}
      analysis={null}
      scene="paper"
      compact
      pendingId={null}
      cursor={null}
      tool="select"
      onLeft={() => undefined}
      onRight={() => undefined}
      onMove={() => undefined}
    />
  );
}
