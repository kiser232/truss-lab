"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { modelCost } from "@/lib/analyze";
import { gradeMission } from "@/lib/grade";
import { CONTEST_MATERIALS, LAB_MATERIALS } from "@/lib/materials";
import { blankMissionModel, exampleModel, MISSIONS, openDeckLinks } from "@/lib/missions";
import { fmt } from "@/lib/format";
import type { Grade, Model } from "@/lib/types";
import { SolutionPanel } from "@/components/solution-panel";
import { Workspace } from "@/components/workspace";

function subscribeBest(onStoreChange: () => void) {
  window.addEventListener("truss-best", onStoreChange);
  return () => window.removeEventListener("truss-best", onStoreChange);
}

function readBest() {
  return Number(window.localStorage.getItem("truss-lab-best")) || 0;
}

function cueOf(mission: (typeof MISSIONS)[number]) {
  if (mission.walkers === "kids") return "kids" as const;
  if (mission.contest) return "book" as const;
  if (mission.car) return "car" as const;
  if (mission.scene === "cliff") return "walk" as const;
  return "rock" as const;
}

export default function PracticePage() {
  const [stageId, setStageId] = useState<number | null>(null);
  const [storyOpen, setStoryOpen] = useState(false);
  const [cue, setCue] = useState(0);
  const [designs, setDesigns] = useState<Record<number, Model>>({});
  const [grades, setGrades] = useState<Record<number, Grade | null>>({});
  const [tab, setTab] = useState<"mine" | "example">("mine");
  const [books, setBooks] = useState(1);
  const [step, setStep] = useState<number | null>(null);
  const best = useSyncExternalStore(subscribeBest, readBest, () => 0);
  const [brush, setBrush] = useState("wood");
  const mission = MISSIONS.find((item) => item.id === stageId) ?? null;
  const active = mission ?? MISSIONS[0];
  const materials = active.materials === "contest" ? CONTEST_MATERIALS : LAB_MATERIALS;
  const mine = designs[active.id] ?? blankMissionModel(active);
  const example = useMemo(() => exampleModel(active, 3), [active]);
  const exampleGrade = useMemo(() => gradeMission(active, example, active.contest ? 3 : 0), [active, example]);
  const mineGrade = grades[active.id] ?? null;
  const shown = tab === "example" ? example : mine;
  const grade = tab === "example" ? exampleGrade : mineGrade;
  const analysis = grade?.governing ?? null;
  const focus = step !== null && analysis ? analysis.steps[step] : undefined;
  const cost = modelCost(shown);
  const bookLoads = active.contest
    ? [{ nodeId: active.bookNodeId ?? 3, fx: 0, fy: -20 * (tab === "example" ? 3 : books), label: `${tab === "example" ? 3 : books}권` }]
    : undefined;

  function selectStage(id: number) {
    const next = MISSIONS.find((item) => item.id === id) ?? MISSIONS[0];
    setStageId(id);
    setStep(null);
    setTab("mine");
    setBrush(next.materials === "contest" ? "paper" : "wood");
    setStoryOpen(true);
    setCue(0);
  }

  function test() {
    if (!mission) return;
    const result = gradeMission(mission, mine, books);
    setGrades((prev) => ({ ...prev, [mission.id]: result }));
    setTab("mine");
    setStep(null);
    setCue((value) => value + 1);
    if (mission.contest && result.passed && result.score > best) {
      window.localStorage.setItem("truss-lab-best", String(result.score));
      window.dispatchEvent(new Event("truss-best"));
    }
  }

  if (!mission) {
    return (
      <main className="work">
        <p className="kicker">EXPLORE</p>
        <h1 style={{ margin: "4px 0 8px", fontSize: 28, letterSpacing: "-0.04em" }}>레벨을 고르세요</h1>
        <p className="note" style={{ marginTop: 0 }}>단계를 누르면 그 판의 이야기가 열립니다. 경진대회는 다른 색입니다.</p>
        <div className="level-grid">
          {MISSIONS.map((item) => (
            <button key={item.id} type="button" className={`level-card ${item.contest ? "contest" : ""}`} onClick={() => selectStage(item.id)}>
              <span>{item.space ? "3D" : item.contest ? "대회" : `STAGE ${item.kicker}`}</span>
              <strong>{item.title}</strong>
              <small>{item.hint}</small>
            </button>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="work">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", marginBottom: 12, flexWrap: "wrap" }}>
        <div>
          <p className="kicker">EXPLORE</p>
          <h1 style={{ margin: "4px 0 0", fontSize: 28, letterSpacing: "-0.04em" }}>실습</h1>
        </div>
        <button type="button" className="ghost" onClick={() => setStoryOpen(true)}>미션</button>
        <div className="row-tools">
          {MISSIONS.map((item) => (
            <button key={item.id} type="button" className={`stage-chip ${item.contest ? "contest" : ""} ${item.id === mission.id ? "on" : ""}`} onClick={() => selectStage(item.id)}>
              {item.kicker} {item.title}
            </button>
          ))}
        </div>
      </div>

      <div className="practice-grid">
        <aside className="panel" style={{ padding: 14 }}>
          <strong>
            {mission.kicker} · {mission.title}
          </strong>
          <p className="note" style={{ margin: "6px 0 10px" }}>
            {mission.story}
          </p>
          <p style={{ margin: "0 0 8px", fontWeight: 800 }}>예산 {mission.budget}</p>
          <div className={`budget ${cost > mission.budget ? "over" : ""}`}>
            <div style={{ width: `${Math.min(100, (cost / mission.budget) * 100)}%` }} />
          </div>
          <p style={{ margin: "6px 0 12px", fontWeight: 800 }}>
            {fmt(cost)} <span style={{ color: "#7b8798" }}>/ {mission.budget}</span>
          </p>
          <p className="note" style={{ marginTop: 0 }}>{mission.hint}</p>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {materials.map((item) => (
              <button key={item.id} type="button" className={`mat-card ${brush === item.id ? "on" : ""}`} onClick={() => setBrush(item.id)}>
                <i className="swatch" style={{ background: item.color }} />
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    인 {item.tension} · 압 {item.buckling ? `${item.compression}·짧음` : item.compression}
                  </small>
                </span>
                <span className="cost">
                  {item.costPerM}
                  <span>/m</span>
                </span>
              </button>
            ))}
          </div>
          {mission.contest ? (
            <div className="row-tools" style={{ marginTop: 12 }}>
              <button type="button" className="ghost" onClick={() => { setBooks((n) => Math.max(1, n - 1)); setGrades((prev) => ({ ...prev, [mission.id]: null })); }}>−</button>
              <strong>책 {tab === "example" ? 3 : books}권 · {(tab === "example" ? 3 : books) * 20}N</strong>
              <button type="button" className="ghost" onClick={() => { setBooks((n) => n + 1); setGrades((prev) => ({ ...prev, [mission.id]: null })); }}>+</button>
            </div>
          ) : null}
          {mission.contest && best > 0 ? <p className="note">최고 {best.toFixed(2)}</p> : null}
          <div className="row-tools" style={{ marginTop: 12 }}>
            <button type="button" className="primary-btn" onClick={test}>시험</button>
            <button type="button" className="quiet-btn" onClick={() => { setDesigns((prev) => ({ ...prev, [mission.id]: blankMissionModel(mission) })); setGrades((prev) => ({ ...prev, [mission.id]: null })); setTab("mine"); }}>
              다시
            </button>
            <button type="button" className={`quiet-btn ${tab === "example" ? "tool on" : ""}`} onClick={() => { setTab(tab === "example" ? "mine" : "example"); setStep(null); }}>
              {tab === "example" ? "내 설계" : "예시 풀이"}
            </button>
          </div>
          {mineGrade && tab === "mine" ? (
            <p style={{ fontWeight: 800, color: mineGrade.passed ? "#157a3a" : "#be123c" }}>
              {mineGrade.title} · {mineGrade.reason}
            </p>
          ) : null}
        </aside>

        <div style={{ position: "relative" }}>
        <Workspace
          key={`${mission.id}-${tab}`}
          model={shown}
          onChange={(next) => {
            if (tab === "example") return;
            setDesigns((prev) => ({ ...prev, [mission.id]: { ...next, supports: mission.supports } }));
            setGrades((prev) => ({ ...prev, [mission.id]: null }));
            setStep(null);
          }}
          materials={materials}
          analysis={analysis && analysis.status !== "unstable" && analysis.status !== "invalid" && analysis.status !== "empty" ? analysis : null}
          scene={mission.scene}
          tools={["select", "node", "member", "erase"]}
          lockedNodeIds={mission.fixedNodeIds}
          lockSupports
          readOnly={tab === "example"}
          displayLoads={bookLoads ?? grade?.loads}
          focusNodeId={focus?.focusNodeId}
          focusMemberIds={focus?.memberIds}
          showCost
          materialId={brush}
          onMaterial={setBrush}
          space={Boolean(mission.space)}
          cue={cue > 0 && !mission.space ? cueOf(mission) : null}
          cueKey={cue}
          links={openDeckLinks(mission, shown)}
        />
        {mission.space && cue > 0 ? <div key={cue} className="lantern-fall" aria-hidden>등불</div> : null}
        </div>

        <SolutionPanel
          analysis={tab === "mine" && !mineGrade ? null : analysis}
          envelope={grade?.envelope}
          active={step}
          onPick={setStep}
          cost={cost}
          budget={mission.budget}
          kicker={tab === "example" ? "예시" : "내 설계"}
          caseLabel={grade?.governingLabel}
          placeholder="시험하면 축력과 절점 순서가 나옵니다."
        />
      </div>
      {storyOpen ? (
        <div className="story-back" onClick={() => setStoryOpen(false)}>
          <div className="story-card" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <p className="kicker">{mission.space ? "3D" : `STAGE ${mission.kicker}`}</p>
            <h2 style={{ margin: "4px 0 8px" }}>{mission.title}</h2>
            <p style={{ marginTop: 0, lineHeight: 1.6 }}>{mission.story}</p>
            <button type="button" className="primary-btn" onClick={() => setStoryOpen(false)}>시작</button>
          </div>
        </div>
      ) : null}
      {mission.space && cue > 0 ? <p className="note">등불이 꼭짓점으로 내려앉습니다. 세 부재가 그 무게를 나눠 갖습니다.</p> : null}
      <style>{`
        .practice-grid { display: grid; grid-template-columns: 270px minmax(0, 1fr) 320px; gap: 12px; align-items: start; }
        @media (max-width: 1100px) { .practice-grid { grid-template-columns: 1fr; } }
      `}</style>
    </main>
  );
}
