"use client";

import { useState } from "react";
import { analyze } from "@/lib/analyze";
import { correctText, memberOptions, problemChoices, reactionOptions, type Problem } from "@/lib/exams";
import { gradeAnswer } from "@/lib/memory";
import { LAB_MATERIALS } from "@/lib/materials";
import { isSpaceModel } from "@/lib/space";
import type { Model } from "@/lib/types";
import { SolutionPanel } from "./solution-panel";
import { Workspace } from "./workspace";

export function ExamDesk({
  problem,
  source,
  onGraded,
  onSave,
}: {
  problem: Problem;
  source: string;
  onGraded: () => void;
  onSave?: (problem: Problem) => void;
}) {
  const [model, setModel] = useState<Model>(problem.model);
  const [picked, setPicked] = useState<number | null>(null);
  const [step, setStep] = useState<number | null>(null);
  const [calculated, setCalculated] = useState(false);
  const [prompt, setPrompt] = useState(problem.prompt);
  const [target, setTarget] = useState(`axial:${problem.ask.kind === "axial" ? problem.ask.member : memberOptions(problem.model)[0] ?? "AB"}`);
  const choices = problemChoices(problem);
  const analysis = analyze(model);
  const visible = analysis.status === "unstable" || analysis.status === "invalid" || analysis.status === "empty" ? null : analysis;
  const showForces = calculated || picked !== null;
  const focus = showForces && step !== null ? analysis.steps[step] : undefined;

  function choose(index: number) {
    setPicked(index);
    gradeAnswer({
      key: `${source}:${problem.id}`,
      source,
      prompt: `${problem.year ? `${problem.year} ` : ""}${problem.prompt}`,
      choices,
      picked: index,
    });
    onGraded();
  }

  function publish() {
    if (!onSave) return;
    const [kind, rest] = target.split(":");
    const ask =
      kind === "reaction"
        ? { kind: "reaction" as const, nodeId: Number(rest.split("/")[0]), axis: rest.split("/")[1] as "rx" | "ry" | "rz" }
        : { kind: "axial" as const, member: rest };
    onSave({
      id: `made-${Date.now()}`,
      title: "내가 낸 문제",
      prompt: prompt.trim() || "축력",
      blurb: "계산기에 그려 둔 배치",
      model,
      ask,
    });
  }

  return (
    <div className="lab-grid">
      <div>
        <p className="note" style={{ marginTop: 0 }}>
          {problem.blurb}
        </p>
        <p style={{ fontWeight: 800, marginTop: 0 }}>{problem.prompt}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {choices.map((choice, index) => {
            const revealed = picked !== null;
            const cls = !revealed ? "" : choice.ok ? "good" : picked === index ? "bad" : "";
            return (
              <button key={choice.text} type="button" className={`quiz-option ${cls}`} disabled={revealed} onClick={() => choose(index)}>
                {choice.text}
              </button>
            );
          })}
        </div>
        <div className="row-tools" style={{ margin: "8px 0" }}>
          <button type="button" className="primary-btn" onClick={() => setCalculated(true)}>
            계산
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setModel(problem.model);
              setCalculated(false);
              setStep(null);
            }}
          >
            문제 배치로
          </button>
        </div>
        {picked !== null ? (
          <p style={{ fontWeight: 800, color: choices[picked]?.ok ? "#157a3a" : "#be123c" }}>
            {choices[picked]?.ok ? "맞음" : `정답 ${correctText(problem)}`}
            {choices[picked]?.ok ? "" : " · 오답노트에 넣었습니다."}
          </p>
        ) : (
          <p className="note">
            {showForces ? "부재력이 표시되었습니다. 같은 보기를 고르세요." : "부재력은 계산을 누른 뒤에만 나옵니다. 먼저 직접 풀어 보세요."}
          </p>
        )}
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
        />
        {onSave ? (
          <div className="panel" style={{ marginTop: 12, padding: 14 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>이 배치로 문제 내기</h3>
            <p className="note" style={{ marginTop: 0 }}>
              계산기를 고친 뒤 묻는 부재를 고르면, 정답은 절점법이 채웁니다.
            </p>
            <div className="row-tools">
              <input className="text-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="문제 문장" />
              <select className="text-input" value={target} onChange={(event) => setTarget(event.target.value)} aria-label="묻는 값">
                {memberOptions(model).map((name) => (
                  <option key={name} value={`axial:${name}`}>
                    {name} 축력
                  </option>
                ))}
                {reactionOptions(model).map((item) => (
                  <option key={item.label} value={`reaction:${item.nodeId}/${item.axis}`}>
                    반력 {item.label}
                  </option>
                ))}
              </select>
              <button type="button" className="primary-btn" onClick={publish}>
                문제로 저장
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <SolutionPanel
        analysis={showForces ? analysis : null}
        active={step}
        onPick={setStep}
        kicker="계산"
        placeholder="계산을 누르면 부재력과 절점 순서가 나옵니다."
      />
      <style>{`
        .lab-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 14px; align-items: start; }
        @media (max-width: 980px) { .lab-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
