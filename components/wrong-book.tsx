"use client";

import { useState } from "react";
import { analyze } from "@/lib/analyze";
import { examModel } from "@/lib/exams";
import { LAB_MATERIALS } from "@/lib/materials";
import { forgetWrong, useMade, type WrongNote } from "@/lib/memory";
import { jointModel } from "@/lib/quiz";
import { isSpaceModel } from "@/lib/space";
import type { Model } from "@/lib/types";
import { SolutionPanel } from "./solution-panel";
import { Workspace } from "./workspace";

export function WrongBook({ notes, onChange }: { notes: WrongNote[]; onChange: () => void }) {
  const made = useMade();
  if (notes.length === 0) {
    return (
      <div className="panel" style={{ padding: 18 }}>
        <p className="note" style={{ margin: 0 }}>
          아직 틀린 문제가 없습니다. 퀴즈와 기출에서 놓치면 여기에 모입니다.
        </p>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {notes.map((note) => (
        <WrongCard key={note.key} note={note} model={drawingOf(note, made)} onChange={onChange} />
      ))}
    </div>
  );
}

function drawingOf(note: WrongNote, made: { id: string; model: Model }[]): Model | null {
  if (note.model && note.model.nodes.length >= 2) return note.model;
  const id = note.key.slice(note.key.indexOf(":") + 1);
  if (note.key.startsWith("joint:")) return jointModel(id);
  if (note.key.startsWith("기출:")) return examModel(id);
  if (note.key.startsWith("내가 낸 문제:")) return made.find((item) => item.id === id)?.model ?? null;
  return null;
}

function WrongCard({ note, model, onChange }: { note: WrongNote; model: Model | null; onChange: () => void }) {
  const [mine, setMine] = useState<string | undefined>();
  const revealed = mine !== undefined;
  const good = mine === note.answer;
  return (
    <article className="post">
      <div className="row-tools">
        <span className="badge">{note.source}</span>
        <span className="note">{new Date(note.at).toLocaleDateString("ko-KR")}</span>
        <button
          type="button"
          className="quiet-btn"
          onClick={() => {
            forgetWrong(note.key);
            onChange();
          }}
        >
          지우기
        </button>
      </div>
      <h3>{note.prompt}</h3>
      <p className="note">지난 답 {note.picked}</p>
      {model ? <RetryBoard key={note.key} model={model} revealed={revealed} /> : null}
      {note.choices.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: model ? "1fr 1fr" : "1fr", gap: 8 }}>
          {note.choices.map((choice) => {
            const cls = !revealed ? "" : choice === note.answer ? "good" : mine === choice ? "bad" : "";
            return (
              <button
                key={choice}
                type="button"
                className={`quiz-option ${cls}`}
                disabled={revealed}
                onClick={() => pick(choice)}
              >
                {choice}
              </button>
            );
          })}
        </div>
      ) : null}
      {revealed ? <p style={{ fontWeight: 800, color: good ? "#157a3a" : "#be123c" }}>{good ? "맞아서 노트에서 뺐습니다." : `정답 ${note.answer}`}</p> : null}
    </article>
  );

  function pick(choice: string) {
    setMine(choice);
    if (choice === note.answer) {
      forgetWrong(note.key);
      onChange();
    }
  }
}

function RetryBoard({
  model: problem,
  revealed,
}: {
  model: Model;
  revealed: boolean;
}) {
  const [model, setModel] = useState<Model>(problem);
  const [calculated, setCalculated] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const analysis = analyze(model);
  const official = analyze(problem);
  const showForces = calculated || revealed;
  const visible = analysis.status === "unstable" || analysis.status === "invalid" || analysis.status === "empty" ? null : analysis;
  const focus = showForces && step !== null ? official.steps[step] : undefined;
  return (
    <div className="lab-grid" style={{ margin: "10px 0 12px" }}>
      <div>
        <p className="note" style={{ marginTop: 0 }}>
          {showForces ? "부재력이 표시되었습니다." : "부재력은 계산을 누른 뒤에만 나옵니다. 처음 풀 때와 같은 그림입니다."}
        </p>
        <Workspace
          model={model}
          onChange={(next) => {
            setModel(next);
            setCalculated(false);
            setStep(null);
          }}
          materials={LAB_MATERIALS}
          analysis={showForces ? visible : null}
          tools={["select", "node", "member", "pin", "rollerY", "load", "erase"]}
          scene="paper"
          space={isSpaceModel(model)}
          focusNodeId={focus?.focusNodeId}
          focusMemberIds={focus?.memberIds}
          focusKind={focus?.kind}
        />
        <div className="row-tools" style={{ marginTop: 8 }}>
          <button type="button" className="primary-btn" onClick={() => setCalculated(true)}>
            계산
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setModel(problem);
              setCalculated(false);
              setStep(null);
            }}
          >
            문제 배치로
          </button>
        </div>
      </div>
      {revealed ? (
        <SolutionPanel analysis={official} active={step} onPick={setStep} kicker="풀이" />
      ) : (
        <aside className="panel solution">
          <div className="badge">풀이</div>
          <p className="note">답을 고른 뒤에 절점 순서가 열립니다.</p>
        </aside>
      )}
      <style>{`
        .lab-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 14px; align-items: start; }
        @media (max-width: 980px) { .lab-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
