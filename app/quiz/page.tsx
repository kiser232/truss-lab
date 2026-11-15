"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { analyze } from "@/lib/analyze";
import { CONCEPTS, jointProblems, type Choice } from "@/lib/quiz";
import { QUIZ_MATERIALS } from "@/lib/materials";
import { gradeAnswer, useWrongs } from "@/lib/memory";
import { TrussBoard } from "@/components/truss-board";
import { SolutionPanel } from "@/components/solution-panel";
import { WrongBook } from "@/components/wrong-book";

type Tab = "joint" | "material" | "concept" | "wrongs";

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

export default function QuizPage() {
  const hash = useHash();
  const [override, setOverride] = useState<Tab | null>(null);
  const tab = override ?? (hash === "#wrongs" ? "wrongs" : "joint");
  const wrongs = useWrongs();
  function setTab(next: Tab) {
    setOverride(next);
  }
  return (
    <main className="work">
      <p className="kicker">CHALLENGE</p>
      <h1 style={{ margin: "4px 0 12px", fontSize: 28, letterSpacing: "-0.04em" }}>퀴즈</h1>
      <div className="row-tools" style={{ marginBottom: 14 }}>
        {(
          [
            ["joint", "절점법"],
            ["material", "자재"],
            ["concept", "개념"],
            ["wrongs", wrongs.length ? `오답노트 ${wrongs.length}` : "오답노트"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={`tool ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "joint" ? <JointQuiz /> : null}
      {tab === "material" ? <MaterialQuiz /> : null}
      {tab === "concept" ? <ConceptQuiz /> : null}
      {tab === "wrongs" ? <WrongBook notes={wrongs} onChange={() => undefined} /> : null}
    </main>
  );
}

function JointQuiz() {
  const problems = useMemo(() => jointProblems(), []);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [step, setStep] = useState<number | null>(null);
  const problem = problems[index];
  const analysis = analyze(problem.model);
  const revealed = picked !== null;
  const correct = problem.choices[picked ?? -1]?.ok;
  const focus = step !== null ? analysis.steps[step] : undefined;

  function choose(choice: number) {
    setPicked(choice);
    setStep(null);
    gradeAnswer({
      key: `joint:${problem.id}`,
      source: "절점법",
      prompt: problem.prompt,
      choices: problem.choices,
      picked: choice,
    });
  }

  return (
    <div className="lab-grid">
      <div>
        <p style={{ fontWeight: 800, marginTop: 0 }}>
          {index + 1}/{problems.length} · {problem.prompt}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {problem.choices.map((choice, choiceIndex) => (
            <Option key={choice.text} choice={choice} index={choiceIndex} picked={picked} onPick={choose} />
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          <TrussBoard
            model={problem.model}
            analysis={revealed ? analysis : null}
            scene="paper"
            compact
            pendingId={null}
            cursor={null}
            tool="select"
            focusNodeId={focus?.focusNodeId}
            focusMemberIds={focus?.memberIds}
            onLeft={() => undefined}
            onRight={() => undefined}
            onMove={() => undefined}
          />
        </div>
        {revealed ? (
          <div className="row-tools" style={{ marginTop: 10 }}>
            <strong style={{ color: correct ? "#157a3a" : "#be123c" }}>{correct ? "맞음" : "다시"}</strong>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                setIndex((n) => (n + 1) % problems.length);
                setPicked(null);
                setStep(null);
              }}
            >
              다음
            </button>
          </div>
        ) : null}
      </div>
      {revealed ? (
        <SolutionPanel analysis={analysis} active={step} onPick={setStep} kicker="풀이" />
      ) : (
        <aside className="panel solution">
          <div className="badge">풀이</div>
          <p className="note">고른 뒤에 절점 순서가 열립니다.</p>
        </aside>
      )}
      <style>{`
        .lab-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 14px; align-items: start; }
        @media (max-width: 980px) { .lab-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

function Option({
  choice,
  index,
  picked,
  onPick,
}: {
  choice: Choice;
  index: number;
  picked: number | null;
  onPick: (index: number) => void;
}) {
  const revealed = picked !== null;
  const cls = !revealed ? (picked === index ? "on" : "") : choice.ok ? "good" : picked === index ? "bad" : "";
  return (
    <button type="button" className={`quiz-option ${cls}`} onClick={() => onPick(index)} disabled={revealed}>
      {choice.text}
    </button>
  );
}

function MaterialQuiz() {
  const [placed, setPlaced] = useState<Record<string, "tension" | "compression" | null>>({});
  const [checked, setChecked] = useState(false);
  const score = QUIZ_MATERIALS.filter((item) => placed[item.id] === item.group).length;

  return (
    <div className="panel" style={{ padding: 16 }}>
      <p className="note" style={{ marginTop: 0 }}>
        허용이 큰 쪽으로. 카드를 누르면 인 → 압.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
        {QUIZ_MATERIALS.map((item) => {
          const mine = placed[item.id];
          const good = checked && mine === item.group;
          const bad = checked && mine && mine !== item.group;
          return (
            <button
              key={item.id}
              type="button"
              className="mat-card"
              style={{ borderColor: good ? "#16a34a" : bad ? "#e11d48" : undefined }}
              onClick={() => {
                setChecked(false);
                setPlaced((prev) => ({
                  ...prev,
                  [item.id]: prev[item.id] === "tension" ? "compression" : prev[item.id] === "compression" ? null : "tension",
                }));
              }}
            >
              <i className="swatch" style={{ background: mine === "compression" ? "#e23b4a" : "#2a62ea", opacity: mine ? 1 : 0.25 }} />
              <span>
                <strong>{item.name}</strong>
                <small>{mine === "tension" ? "인장" : mine === "compression" ? "압축" : "미정"}</small>
                {checked ? <small>{item.fact}</small> : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="row-tools" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            setChecked(true);
            for (const item of QUIZ_MATERIALS) {
              const mine = placed[item.id];
              const answer = item.group === "tension" ? "인장" : "압축";
              const pickedText = mine === "tension" ? "인장" : mine === "compression" ? "압축" : "미정";
              gradeAnswer({
                key: `material:${item.id}`,
                source: "자재",
                prompt: `${item.name}은 어느 쪽?`,
                choices: [
                  { text: pickedText, ok: pickedText === answer },
                  { text: answer, ok: true },
                ],
                picked: pickedText === answer ? 1 : 0,
              });
            }
          }}
        >
          확인
        </button>
        {checked ? (
          <strong>
            {score}/{QUIZ_MATERIALS.length}
          </strong>
        ) : null}
      </div>
    </div>
  );
}

function ConceptQuiz() {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const item = CONCEPTS[index];
  const revealed = picked !== null;
  return (
    <div className="panel" style={{ padding: 18, maxWidth: 640 }}>
      <p style={{ fontWeight: 800 }}>
        {index + 1}/{CONCEPTS.length} · {item.q}
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {item.options.map((option, optionIndex) => {
          const cls = !revealed ? "" : optionIndex === item.answer ? "good" : picked === optionIndex ? "bad" : "";
          return (
            <button
              key={option}
              type="button"
              className={`quiz-option ${cls}`}
              disabled={revealed}
              onClick={() => {
                setPicked(optionIndex);
                gradeAnswer({
                  key: `concept:${item.q}`,
                  source: "개념",
                  prompt: item.q,
                  choices: item.options.map((text, index) => ({ text, ok: index === item.answer })),
                  picked: optionIndex,
                });
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
      {revealed ? (
        <div className="row-tools" style={{ marginTop: 12 }}>
          <span className="badge">{item.note}</span>
          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              setIndex((n) => (n + 1) % CONCEPTS.length);
              setPicked(null);
            }}
          >
            다음
          </button>
        </div>
      ) : null}
    </div>
  );
}
