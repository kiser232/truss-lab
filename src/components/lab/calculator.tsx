"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mergeLoads, sampleRoad } from "@/lib/truss/geometry";
import { explain } from "@/lib/truss/explain";
import { MATERIALS } from "@/lib/truss/materials";
import { analyze } from "@/lib/truss/solver";
import type { Load, Member, Node, Support, SupportType } from "@/lib/truss/types";
import { Board, type BoardPick, type BoardWeight } from "./board";
import { COLS, ROWS } from "./grid";
import { ExplanationView, ForceReport, hoverText } from "./report";
import { ScenePicker, type SceneId } from "./scenes";

type Tool = "node" | "member" | "erase" | "pin" | "roller" | "weight" | "car";

const WEIGHTS = [
  { id: "pebble", name: "작은 돌", newton: 30 },
  { id: "stone", name: "돌", newton: 60 },
  { id: "crate", name: "상자", newton: 90 },
  { id: "ingot", name: "철괴", newton: 140 },
];

type WeightItem = { id: number; nodeId: number; weightId: string };

export function Calculator() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [supports, setSupports] = useState<Support[]>([]);
  const [weights, setWeights] = useState<WeightItem[]>([]);
  const [nextId, setNextId] = useState(1);
  const [tool, setTool] = useState<Tool>("node");
  const [materialId, setMaterialId] = useState("wood");
  const [weightId, setWeightId] = useState("stone");
  const [inputMode, setInputMode] = useState<"grid" | "coord">("grid");
  const [scene, setScene] = useState<SceneId>("workshop");
  const [gridLock, setGridLock] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const [carPath, setCarPath] = useState<number[]>([]);
  const [carWeight, setCarWeight] = useState(100);
  const [carT, setCarT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const carTRef = useRef(0);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [coord, setCoord] = useState({ x: "4", y: "2" });
  const [banner, setBanner] = useState("절점 도구를 고르면 격자가 나타납니다. 집 모양 예제로 바로 축력을 볼 수도 있습니다.");
  const [showExplain, setShowExplain] = useState(false);

  const loads = useMemo(() => buildLoads(nodes, weights, carPath, carWeight, carT), [nodes, weights, carPath, carWeight, carT]);
  const analysis = useMemo(
    () => (nodes.length ? analyze({ nodes, members, supports, loads }) : null),
    [nodes, members, supports, loads],
  );
  const carPoint = carPath.length >= 2 ? sampleRoad(nodes, carPath, carWeight, carT) : null;
  const car = carPoint ? { x: carPoint.x, y: carPoint.y } : null;
  const explanation = analysis ? explain({ nodes, members, supports, loads }, analysis) : null;

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = Math.min(1, carTRef.current + dt / 7);
      const nextLoads = buildLoads(nodes, weights, carPath, carWeight, next);
      const result = analyze({ nodes, members, supports, loads: nextLoads });
      if (result.status === "overstressed") {
        setPlaying(false);
        return;
      }
      carTRef.current = next;
      setCarT(next);
      if (next >= 1) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing, nodes, members, supports, weights, carPath, carWeight]);

  function addNode(x: number, y: number) {
    if (x < 0 || x > COLS || y < 0 || y > ROWS) {
      setBanner("좌표는 0부터 가로 12, 세로 8 칸 안이어야 합니다.");
      return;
    }
    if (nodes.some((node) => Math.hypot(node.x - x, node.y - y) < 0.15)) {
      setBanner("그 자리에는 이미 절점이 있습니다.");
      return;
    }
    const node = { id: nextId, x: round1(x), y: round1(y) };
    setNodes((current) => [...current, node]);
    setNextId((current) => current + 1);
    setBanner(`절점 ${node.id}을 (${node.x}, ${node.y})에 놓았습니다.`);
  }

  function addMember(a: number, b: number) {
    if (a === b) return;
    if (members.some((member) => (member.i === a && member.j === b) || (member.i === b && member.j === a))) {
      setBanner("이미 연결된 절점입니다.");
      return;
    }
    const member = { id: nextId, i: a, j: b, materialId };
    setMembers((current) => [...current, member]);
    setNextId((current) => current + 1);
    setPending(null);
    const materialName = MATERIALS.find((item) => item.id === materialId)?.name ?? "재료";
    setBanner(`부재 ${member.id}을 ${withRo(materialName)} 이었습니다.`);
  }

  function toggleSupport(nodeId: number, type: SupportType) {
    setSupports((current) => {
      const existing = current.find((support) => support.nodeId === nodeId);
      if (existing?.type === type) return current.filter((support) => support.nodeId !== nodeId);
      return [...current.filter((support) => support.nodeId !== nodeId), { nodeId, type }];
    });
  }

  function onPick(pick: BoardPick) {
    if (tool === "node" && inputMode === "grid" && pick.grid && pick.nodeId === null) addNode(pick.grid.x, pick.grid.y);
    if (tool === "member" && pick.nodeId !== null) {
      if (pending === null) setPending(pick.nodeId);
      else if (pending === pick.nodeId) setPending(null);
      else addMember(pending, pick.nodeId);
    }
    if (tool === "erase") {
      if (pick.memberId !== null) {
        setMembers((current) => current.filter((member) => member.id !== pick.memberId));
      } else if (pick.nodeId !== null) {
        const id = pick.nodeId;
        setNodes((current) => current.filter((node) => node.id !== id));
        setMembers((current) => current.filter((member) => member.i !== id && member.j !== id));
        setSupports((current) => current.filter((support) => support.nodeId !== id));
        setWeights((current) => current.filter((weight) => weight.nodeId !== id));
        setCarPath((current) => current.filter((nodeId) => nodeId !== id));
        if (pending === id) setPending(null);
      }
    }
    if (tool === "pin" && pick.nodeId !== null) toggleSupport(pick.nodeId, "pin");
    if (tool === "roller" && pick.nodeId !== null) toggleSupport(pick.nodeId, "rollerY");
    if (tool === "weight" && pick.nodeId !== null) {
      const item = { id: nextId, nodeId: pick.nodeId, weightId };
      setWeights((current) => [...current, item]);
      setNextId((current) => current + 1);
    }
    if (tool === "car" && pick.nodeId !== null) {
      setCarPath((current) => [...current, pick.nodeId!]);
      carTRef.current = 0;
      setCarT(0);
      setPlaying(false);
    }
    if (tool === "member" && pick.memberId !== null && pick.nodeId === null) {
      setMembers((current) => current.map((member) => (member.id === pick.memberId ? { ...member, materialId } : member)));
      setBanner("고른 재료로 부재를 바꿨습니다. 부재를 새로 이으려면 절점을 누르세요.");
    }
  }

  function loadExample() {
    setNodes([
      { id: 1, x: 2, y: 0 },
      { id: 2, x: 6, y: 0 },
      { id: 3, x: 4, y: 2 },
    ]);
    setMembers([
      { id: 4, i: 1, j: 2, materialId: "wood" },
      { id: 5, i: 1, j: 3, materialId: "wood" },
      { id: 6, i: 2, j: 3, materialId: "wood" },
    ]);
    setSupports([
      { nodeId: 1, type: "pin" },
      { nodeId: 2, type: "rollerY" },
    ]);
    setWeights([{ id: 7, nodeId: 3, weightId: "stone" }]);
    setCarPath([]);
    setPlaying(false);
    carTRef.current = 0;
    setCarT(0);
    setNextId(8);
    setPending(null);
    setBanner("마루의 60N은 빗변을 압축하고 밑변을 인장합니다. 부재에 마우스를 올려 보세요.");
    setShowExplain(true);
  }

  function clearAll() {
    setNodes([]);
    setMembers([]);
    setSupports([]);
    setWeights([]);
    setCarPath([]);
    setPlaying(false);
    carTRef.current = 0;
    setCarT(0);
    setPending(null);
    setNextId(1);
    setBanner("보드를 비웠습니다.");
  }

  const boardWeights: BoardWeight[] = weights.map((weight) => {
    const spec = WEIGHTS.find((item) => item.id === weight.weightId)!;
    return { id: weight.id, nodeId: weight.nodeId, name: spec.name, newton: spec.newton };
  });
  const hoverMember = members.find((member) => member.id === hoverId) ?? null;
  const tip = hoverText(analysis, hoverMember);
  const showGrid = gridLock || tool === "node" || inputMode === "coord";

  return (
    <div className="workspace">
      <aside className="panel tools">
        <div className="segmented">
          <button type="button" className={inputMode === "grid" ? "on" : ""} onClick={() => setInputMode("grid")}>
            격자
          </button>
          <button type="button" className={inputMode === "coord" ? "on" : ""} onClick={() => setInputMode("coord")}>
            좌표
          </button>
        </div>
        <div className="tool-grid">
          {(
            [
              ["node", "절점"],
              ["member", "부재"],
              ["erase", "지우기"],
              ["pin", "핀"],
              ["roller", "롤러"],
              ["weight", "하중"],
              ["car", "자동차"],
            ] as Array<[Tool, string]>
          ).map(([id, label]) => (
            <button key={id} type="button" className={tool === id ? "on" : ""} onClick={() => setTool(id)}>
              {label}
            </button>
          ))}
        </div>
        <h3>재료</h3>
        <div className="materials">
          {MATERIALS.map((material) => (
            <button
              key={material.id}
              type="button"
              className={materialId === material.id ? "on" : ""}
              onClick={() => {
                setMaterialId(material.id);
                setTool("member");
              }}
            >
              <i style={{ background: material.color }} />
              <span>
                <strong>{material.name}</strong>
                <small>
                  인 {material.tension} / 압 {material.compression} N · {material.costPerM}/m
                </small>
              </span>
            </button>
          ))}
        </div>
        {tool === "weight" ? (
          <div className="choice-row">
            {WEIGHTS.map((weight) => (
              <button key={weight.id} type="button" className={weightId === weight.id ? "on" : ""} onClick={() => setWeightId(weight.id)}>
                {weight.name} {weight.newton}N
              </button>
            ))}
          </div>
        ) : null}
        {tool === "car" ? (
          <label className="slider">
            자동차 {carWeight}N
            <input
              type="range"
              min={40}
              max={240}
              step={10}
              value={carWeight}
              onChange={(event) => setCarWeight(Number(event.target.value))}
            />
            <span className="muted">절점을 순서대로 찍어 길을 만든 뒤 달리게 하세요. 하중은 그 구간 양 끝 절점에만 나뉩니다.</span>
            <span className="row-actions">
              <button
                type="button"
                disabled={carPath.length < 2}
                onClick={() => {
                  carTRef.current = 0;
                  setCarT(0);
                  setPlaying(true);
                }}
              >
                달리기
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setCarPath([]);
                  carTRef.current = 0;
                  setCarT(0);
                }}
              >
                경로 삭제
              </button>
            </span>
          </label>
        ) : null}
        {inputMode === "coord" ? (
          <form
            className="coord-form"
            onSubmit={(event) => {
              event.preventDefault();
              addNode(Number(coord.x), Number(coord.y));
            }}
          >
            <label>
              x
              <input value={coord.x} onChange={(event) => setCoord({ ...coord, x: event.target.value })} inputMode="decimal" />
            </label>
            <label>
              y
              <input value={coord.y} onChange={(event) => setCoord({ ...coord, y: event.target.value })} inputMode="decimal" />
            </label>
            <button type="submit">절점 추가</button>
            <p className="muted">x는 오른쪽, y는 위입니다. 0.5처럼 격자 사이도 넣을 수 있습니다.</p>
          </form>
        ) : null}
        <p className="banner">{banner}</p>
      </aside>
      <div className="stage">
        <div className="stage-bar">
          <span>한 칸 = 1m · 하중은 절점에만</span>
          <span className="row-actions">
            <button type="button" onClick={loadExample}>
              집 모양 예제
            </button>
            <button type="button" onClick={clearAll}>
              비우기
            </button>
          </span>
        </div>
        <div className="board-options">
          <ScenePicker
            value={scene}
            onChange={(next) => {
              if (next !== "mission") setScene(next);
            }}
          />
          <button
            type="button"
            className={gridLock ? "on" : ""}
            aria-pressed={gridLock}
            title="절점을 놓을 때는 격자가 항상 보입니다. 다른 도구에서도 보려면 켜 두세요."
            onClick={() => setGridLock((value) => !value)}
          >
            격자 항상 표시
          </button>
        </div>
        <Board
          nodes={nodes}
          members={members}
          supports={supports}
          loads={[]}
          analysis={analysis}
          weights={boardWeights}
          car={car}
          carPath={carPath}
          pendingNodeId={pending}
          hoverMemberId={hoverId}
          showGrid={showGrid}
          scene={scene}
          onPick={onPick}
          onHoverMember={(id, point) => {
            setHoverId(id);
            setPointer(point);
          }}
          onRemoveWeight={(id) => setWeights((current) => current.filter((weight) => weight.id !== id))}
        />
        {tip && pointer ? (
          <div className="tooltip" style={{ left: pointer.x + 14, top: pointer.y + 14 }}>
            {tip.split("\n").map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        ) : null}
      </div>
      <aside className="panel readout">
        <ForceReport analysis={analysis} members={members} activeId={hoverId} onPick={setHoverId} />
        <button type="button" className="text-button" onClick={() => setShowExplain((value) => !value)} disabled={!explanation}>
          {showExplain ? "해설 접기" : "이 트러스의 절점법 해설"}
        </button>
        {showExplain && explanation ? <ExplanationView explanation={explanation} /> : null}
      </aside>
    </div>
  );
}

function buildLoads(nodes: Node[], weights: WeightItem[], carPath: number[], carWeight: number, carT: number): Load[] {
  const pieces: Load[] = weights.map((weight) => ({
    nodeId: weight.nodeId,
    fx: 0,
    fy: -(WEIGHTS.find((item) => item.id === weight.weightId)?.newton ?? 0),
  }));
  if (carPath.length >= 2) {
    const sample = sampleRoad(nodes, carPath, carWeight, carT);
    if (sample) pieces.push(...sample.loads);
  }
  return mergeLoads(pieces);
}

function withRo(name: string): string {
  const code = name.charCodeAt(name.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return `${name}로`;
  const batchim = (code - 0xac00) % 28;
  return batchim === 0 || batchim === 8 ? `${name}로` : `${name}으로`;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
