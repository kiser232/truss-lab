"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { designCost, evaluateDesign, type Trial } from "@/lib/truss/evaluate";
import { explain } from "@/lib/truss/explain";
import { sampleRoad } from "@/lib/truss/geometry";
import { MATERIALS } from "@/lib/truss/materials";
import { analyze } from "@/lib/truss/solver";
import { STAGES, type Stage } from "@/lib/truss/stages";
import type { Load, Member, Node } from "@/lib/truss/types";
import { Board, type BoardPick } from "./board";
import { COLS, ROWS } from "./grid";
import { ExplanationView, ForceReport, hoverText } from "./report";

type Tool = "node" | "member" | "erase";

export function Practice() {
  const [stageId, setStageId] = useState(1);
  const stage = STAGES.find((item) => item.id === stageId) ?? STAGES[0];
  const [build, setBuild] = useState(() => fresh(stage));
  const [tool, setTool] = useState<Tool>("node");
  const [materialId, setMaterialId] = useState("wood");
  const [pending, setPending] = useState<number | null>(null);
  const [carT, setCarT] = useState(0);
  const [phase, setPhase] = useState<"build" | "run" | "done">("build");
  const [trial, setTrial] = useState<Trial | null>(null);
  const [targetT, setTargetT] = useState(1);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [hint, setHint] = useState(false);
  const [cleared, setCleared] = useState<number[]>([]);
  const carRef = useRef(0);

  useEffect(() => {
    const raw = window.sessionStorage.getItem("truss-lab-cleared");
    if (!raw) return;
    const timer = window.setTimeout(() => {
      try {
        const parsed = JSON.parse(raw) as number[];
        if (Array.isArray(parsed)) setCleared(parsed.filter((id) => typeof id === "number"));
      } catch {
        window.sessionStorage.removeItem("truss-lab-cleared");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== "run") return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = Math.min(targetT, carRef.current + dt / 6);
      carRef.current = next;
      setCarT(next);
      if (next >= targetT - 0.001) {
        setPhase("done");
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [phase, targetT]);

  const cost = designCost(build.nodes, build.members);
  const liveLoads = useMemo(() => loadsAt(stage, build.nodes, phase === "build" ? null : carT), [stage, build.nodes, phase, carT]);
  const analysis = useMemo(
    () => analyze({ nodes: build.nodes, members: build.members, supports: stage.supports, loads: phase === "build" ? [] : liveLoads }),
    [build, stage.supports, liveLoads, phase],
  );
  const shownLoads = phase === "build" ? stage.staticLoads : liveLoads;
  const carSample = stage.car && phase !== "build" ? sampleRoad(build.nodes, stage.car.road, stage.car.weight, carT, stage.staticLoads) : null;
  const storyAnalysis = phase === "done" && trial?.worst ? trial.worst.analysis : analysis;
  const storyLoads = phase === "done" && trial?.worst ? loadsAt(stage, build.nodes, trial.worst.t) : liveLoads;
  const explanation = phase === "build" ? null : explain(
    { nodes: build.nodes, members: build.members, supports: stage.supports, loads: storyLoads },
    storyAnalysis,
  );
  const broken = phase !== "build" && (trial?.passed === false || analysis.status === "overstressed" || analysis.status === "unstable");

  function selectStage(next: Stage) {
    setStageId(next.id);
    setBuild(fresh(next));
    setPending(null);
    setPhase("build");
    setTrial(null);
    setCarT(0);
    setHint(false);
  }

  function onPick(pick: BoardPick) {
    if (phase === "run") return;
    if (tool === "node" && pick.grid && pick.nodeId === null) {
      if (pick.grid.x < 0 || pick.grid.x > COLS || pick.grid.y < 0 || pick.grid.y > ROWS) return;
      if (build.nodes.some((node) => Math.hypot(node.x - pick.grid!.x, node.y - pick.grid!.y) < 0.2)) return;
      setBuild((current) => ({
        ...current,
        nodes: [...current.nodes, { id: current.nextId, x: pick.grid!.x, y: pick.grid!.y }],
        nextId: current.nextId + 1,
      }));
    }
    if (tool === "member" && pick.nodeId !== null) {
      if (pending === null) setPending(pick.nodeId);
      else if (pending === pick.nodeId) setPending(null);
      else {
        const a = pending;
        const b = pick.nodeId;
        if (!build.members.some((member) => (member.i === a && member.j === b) || (member.i === b && member.j === a))) {
          setBuild((current) => ({
            ...current,
            members: [...current.members, { id: current.nextId, i: a, j: b, materialId }],
            nextId: current.nextId + 1,
          }));
        }
        setPending(null);
      }
    }
    if (tool === "member" && pick.memberId !== null && pick.nodeId === null) {
      setBuild((current) => ({
        ...current,
        members: current.members.map((member) => (member.id === pick.memberId ? { ...member, materialId } : member)),
      }));
    }
    if (tool === "erase") {
      if (pick.memberId !== null) {
        setBuild((current) => ({ ...current, members: current.members.filter((member) => member.id !== pick.memberId) }));
      } else if (pick.nodeId !== null && !stage.fixedNodeIds.includes(pick.nodeId)) {
        const id = pick.nodeId;
        setBuild((current) => ({
          ...current,
          nodes: current.nodes.filter((node) => node.id !== id),
          members: current.members.filter((member) => member.i !== id && member.j !== id),
        }));
        if (pending === id) setPending(null);
      }
    }
  }

  function runTest() {
    const result = evaluateDesign(stage, build.nodes, build.members);
    setTrial(result);
    if (result.passed) {
      const next = Array.from(new Set([...cleared, stage.id]));
      setCleared(next);
      window.sessionStorage.setItem("truss-lab-cleared", JSON.stringify(next));
    }
    if (stage.car) {
      const failT = result.cases.find((item) => item.analysis.status !== "ok")?.t;
      carRef.current = 0;
      setCarT(0);
      setTargetT(failT ?? 1);
      setPhase("run");
    } else {
      setPhase("done");
    }
  }

  const hoverMember = build.members.find((member) => member.id === hoverId) ?? null;
  const tip = phase === "build" ? null : hoverText(analysis, hoverMember);

  return (
    <div className="workspace">
      <aside className="panel tools">
        <div className="stage-pills">
          {STAGES.map((item) => (
            <button key={item.id} type="button" className={item.id === stage.id ? "on" : ""} onClick={() => selectStage(item)}>
              {item.id}
              {cleared.includes(item.id) ? " ★" : ""}
            </button>
          ))}
        </div>
        <p className="kicker">{stage.kicker}</p>
        <h2>{stage.title}</h2>
        <p>{stage.story}</p>
        <p>
          <strong>{stage.objective}</strong>
        </p>
        <p className={cost > stage.budget ? "over-budget" : "budget"}>
          예산 {cost.toFixed(1)} / {stage.budget}
        </p>
        <div className="tool-grid">
          {(
            [
              ["node", "절점"],
              ["member", "부재"],
              ["erase", "지우기"],
            ] as Array<[Tool, string]>
          ).map(([id, label]) => (
            <button key={id} type="button" className={tool === id ? "on" : ""} onClick={() => setTool(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="materials">
          {MATERIALS.map((material) => (
            <button key={material.id} type="button" className={materialId === material.id ? "on" : ""} onClick={() => setMaterialId(material.id)}>
              <i style={{ background: material.color }} />
              <span>
                <strong>{material.name}</strong>
                <small>
                  인 {material.tension} / 압 {material.compression} · {material.costPerM}/m
                </small>
              </span>
            </button>
          ))}
        </div>
        <button type="button" className="primary" onClick={runTest} disabled={phase === "run"}>
          시험하기
        </button>
        <button type="button" onClick={() => selectStage(stage)}>
          이 단계 다시
        </button>
        <button type="button" className="text-button" onClick={() => setHint((value) => !value)}>
          {hint ? "힌트 접기" : "힌트"}
        </button>
        {hint ? <p className="note">{stage.hint}</p> : null}
      </aside>
      <div className="stage">
        <div className="stage-bar">
          <span>{phase === "build" ? "파란 테두리 절점은 고정입니다. 하중은 시험 때 절점에만 작용합니다." : trial?.title}</span>
        </div>
        <Board
          nodes={build.nodes}
          members={build.members}
          supports={stage.supports}
          loads={shownLoads}
          analysis={phase === "build" ? null : analysis}
          car={carSample ? { x: carSample.x, y: carSample.y } : null}
          carPath={stage.car?.road ?? []}
          pendingNodeId={pending}
          hoverMemberId={hoverId}
          fixedNodeIds={stage.fixedNodeIds}
          ghostLoads={phase === "build"}
          showStones={phase !== "build" && stage.staticLoads.length > 0}
          onPick={onPick}
          onHoverMember={(id, point) => {
            setHoverId(id);
            setPointer(point);
          }}
        />
        {tip && pointer ? (
          <div className="tooltip" style={{ left: pointer.x + 14, top: pointer.y + 14 }}>
            {tip.split("\n").map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        ) : null}
        {broken && phase === "done" ? <p className="fail-banner">파괴되었습니다. 허용을 넘은 부재를 바꾸거나 높이와 배치를 조정하세요.</p> : null}
      </div>
      <aside className="panel readout">
        {trial ? (
          <>
            <h3 className={trial.passed ? "good" : "bad"}>{trial.title}</h3>
            <p>{trial.detail}</p>
          </>
        ) : (
          <>
            <p className="muted">부재를 올리고 시험하기를 누르면, 하중 경로 전체를 절점법(부정정이면 강성법)으로 검사합니다.</p>
            <p className="muted">
              지금 형태: {analyze({ nodes: build.nodes, members: build.members, supports: stage.supports, loads: [] }).message}
            </p>
          </>
        )}
        <ForceReport
          analysis={phase === "build" ? null : storyAnalysis}
          members={build.members}
          activeId={hoverId}
          onPick={setHoverId}
        />
        {phase !== "build" && explanation ? <ExplanationView explanation={explanation} /> : null}
      </aside>
    </div>
  );
}

function fresh(stage: Stage): { nodes: Node[]; members: Member[]; nextId: number } {
  return { nodes: stage.nodes.map((node) => ({ ...node })), members: [], nextId: 100 };
}

function loadsAt(stage: Stage, nodes: Node[], t: number | null): Load[] {
  const extra: Load[] = stage.staticLoads.map(({ nodeId, fx, fy }) => ({ nodeId, fx, fy }));
  if (!stage.car || t === null) return extra;
  return sampleRoad(nodes, stage.car.road, stage.car.weight, t, extra)?.loads ?? extra;
}
