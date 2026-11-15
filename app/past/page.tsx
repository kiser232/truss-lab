"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExamDesk } from "@/components/exam-desk";
import { SpaceBoard } from "@/components/space-board";
import { TrussBoard } from "@/components/truss-board";
import { EXAM_YEARS, examsFor, type Problem } from "@/lib/exams";
import { loadFile, removeFile, removeMade, saveFile, saveMade, useMade, type MadeProblem } from "@/lib/memory";
import { isSpaceModel } from "@/lib/space";

type Mode = "paper" | "solve" | "mine";

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

export default function PastPage() {
  const [year, setYear] = useState<number>(2019);
  const [mode, setMode] = useState<Mode>("paper");
  const [index, setIndex] = useState(0);
  const made = useMade();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const problems = examsFor(year);

  useEffect(() => {
    let url = "";
    let alive = true;
    loadFile(`pdf-${year}`)
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
  }, [year, tick]);

  const current = mode === "mine" ? (made[index] ? asProblem(made[index]) : null) : problems[index] ?? problems[0];

  return (
    <main className="work">
      <p className="kicker">ARCHIVE</p>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
        <h1 style={{ margin: "4px 0 8px", fontSize: 28, letterSpacing: "-0.04em" }}>기출</h1>
        <Link href="/quiz#wrongs" className="ghost" style={{ borderRadius: 10, padding: "8px 12px" }}>
          오답노트
        </Link>
      </div>
      <p className="note" style={{ marginTop: 0 }}>
        연도별 문제지입니다. 가지고 있는 기출 PDF를 그 해에 올리면 이 브라우저에서 원본이 열립니다. 계산기를 옆에 두고 답을 고르세요.
      </p>
      <div className="row-tools" style={{ marginBottom: 12 }}>
        {EXAM_YEARS.map((item) => (
          <button
            key={item}
            type="button"
            className={`stage-chip ${year === item && mode !== "mine" ? "on" : ""}`}
            onClick={() => {
              setYear(item);
              setMode("paper");
              setIndex(0);
            }}
          >
            {item}
          </button>
        ))}
        <button type="button" className={`stage-chip ${mode === "mine" ? "on" : ""}`} onClick={() => { setMode("mine"); setIndex(0); }}>
          내가 낸 문제 {made.length ? made.length : ""}
        </button>
      </div>
      {mode !== "mine" ? (
        <div className="row-tools" style={{ marginBottom: 12 }}>
          <button type="button" className={`tool ${mode === "paper" ? "on" : ""}`} onClick={() => setMode("paper")}>
            문제지 · 원본
          </button>
          <button type="button" className={`tool ${mode === "solve" ? "on" : ""}`} onClick={() => setMode("solve")}>
            계산기로 풀기
          </button>
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
          {pdfUrl ? (
            <button
              type="button"
              className="quiet-btn"
              onClick={() => {
                void removeFile(`pdf-${year}`).then(() => setTick((n) => n + 1));
              }}
            >
              PDF 빼기
            </button>
          ) : null}
        </div>
      ) : null}

      {mode === "paper" ? (
        <div style={{ display: "grid", gap: 14 }}>
          {pdfUrl ? (
            <iframe className="pdf-frame" title={`${year} 기출 원본`} src={pdfUrl} />
          ) : (
            <p className="note">이 해의 PDF 원본은 아직 없습니다. 파일을 올리면 이 자리에 열립니다.</p>
          )}
          <p style={{ fontWeight: 800, margin: 0 }}>{problems[0]?.blurb}</p>
          {problems.map((problem, problemIndex) => {
            const showBoard = problemIndex === 0 || problems[problemIndex - 1].model !== problem.model;
            return (
              <article key={problem.id} className="post">
                {showBoard ? <PaperBoard model={problem.model} /> : null}
                <h3>
                  {problemIndex + 1}. {problem.prompt}
                </h3>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    setIndex(problemIndex);
                    setMode("solve");
                  }}
                >
                  계산기로 이 문제
                </button>
              </article>
            );
          })}
        </div>
      ) : null}

      {mode === "solve" && current ? (
        <div>
          <div className="row-tools" style={{ marginBottom: 10 }}>
            {problems.map((problem, problemIndex) => (
              <button key={problem.id} type="button" className={`stage-chip ${index === problemIndex ? "on" : ""}`} onClick={() => setIndex(problemIndex)}>
                {problemIndex + 1}
              </button>
            ))}
          </div>
          <ExamDesk key={current.id} problem={current} source="기출" onGraded={() => setTick((n) => n + 1)} onSave={(next) => {
            saveMade({ id: next.id, prompt: next.prompt, model: next.model, ask: next.ask, at: Date.now() });
            setTick((n) => n + 1);
            setMode("mine");
            setIndex(0);
          }} />
        </div>
      ) : null}

      {mode === "mine" ? (
        made.length === 0 ? (
          <div className="panel" style={{ padding: 18 }}>
            <p className="note" style={{ margin: 0 }}>
              계산기로 풀기에서 배치를 고친 뒤 “문제로 저장”을 누르면 여기에 쌓입니다.
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
              {current ? (
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
              ) : null}
            </div>
            {current ? <ExamDesk key={current.id} problem={current} source="내가 낸 문제" onGraded={() => setTick((n) => n + 1)} /> : null}
          </div>
        )
      ) : null}
    </main>
  );
}

function PaperBoard({ model }: { model: Problem["model"] }) {
  if (isSpaceModel(model)) {
    return (
      <SpaceBoard model={model} analysis={null} pendingId={null} tool="select" compact onLeft={() => undefined} onRight={() => undefined} />
    );
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
