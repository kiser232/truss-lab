"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { memberName } from "@/lib/analyze";
import { compressionAllow } from "@/lib/materials";
import { rotateSupport } from "@/lib/support";
import { quantize } from "@/lib/view";
import type { Analysis, Load, Material, Model, SupportType } from "@/lib/types";
import { SpaceBoard } from "./space-board";
import { LIMIT, TrussBoard, type Hit, type WorldPoint } from "./truss-board";

export type Tool = "select" | "node" | "member" | "pin" | "rollerY" | "rollerX" | "ball" | "slot" | "load" | "erase";

const TOOL_LABEL: Record<Tool, string> = {
  select: "선택",
  node: "절점",
  member: "부재",
  pin: "핀",
  rollerY: "롤러",
  rollerX: "가로",
  ball: "볼",
  slot: "홈",
  load: "하중",
  erase: "지우기",
};

const SPACE_TOOLS: Tool[] = ["select", "node", "member", "ball", "slot", "rollerY", "load", "erase"];

function maxId(model: Model) {
  return Math.max(0, ...model.nodes.map((node) => node.id), ...model.members.map((member) => member.id));
}

export function Workspace({
  model,
  onChange,
  materials,
  analysis,
  scene = "paper",
  tools,
  lockedNodeIds = [],
  lockSupports = false,
  readOnly = false,
  displayLoads,
  focusNodeId,
  focusMemberIds,
  showCost = false,
  materialId: controlledMaterial,
  onMaterial,
  space = false,
  onSpace,
}: {
  model: Model;
  onChange: (model: Model) => void;
  materials: Material[];
  analysis: Analysis | null;
  scene?: "paper" | "valley" | "road" | "cliff" | "desk";
  tools: Tool[];
  lockedNodeIds?: number[];
  lockSupports?: boolean;
  readOnly?: boolean;
  displayLoads?: Load[];
  focusNodeId?: number;
  focusMemberIds?: number[];
  showCost?: boolean;
  materialId?: string;
  onMaterial?: (id: string) => void;
  space?: boolean;
  onSpace?: (next: boolean) => void;
}) {
  const [tool, setTool] = useState<Tool>(space ? "node" : tools.includes("member") ? "member" : tools[0]);
  const [innerMaterial, setInnerMaterial] = useState(
    () => materials.find((item) => item.id === "wood")?.id ?? materials[0]?.id ?? "wood",
  );
  const materialId = controlledMaterial ?? innerMaterial;
  function setMaterialId(id: string) {
    setInnerMaterial(id);
    onMaterial?.(id);
  }
  const [pending, setPending] = useState<number | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; memberId: number | null } | null>(null);
  const [newton, setNewton] = useState(60);
  const [height, setHeight] = useState("2");
  const [selected, setSelected] = useState<{ kind: "node" | "member"; id: number } | null>(null);
  const activeTools = (space ? SPACE_TOOLS : tools).filter((item) => item !== "rollerX");
  const [coord, setCoord] = useState({ x: "", y: "", z: "" });
  const [coordNote, setCoordNote] = useState("");
  const material = materials.find((item) => item.id === materialId) ?? materials[0];
  const activeMaterialId = material?.id ?? materialId;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key === "Escape") {
        setPending(null);
        setMenu(null);
        setSelected(null);
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selected && !readOnly) {
        event.preventDefault();
        erase(selected.kind === "node" ? { nodeId: selected.id, memberId: null } : { nodeId: null, memberId: selected.id });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function erase(hit: { nodeId: number | null; memberId: number | null }) {
    if (hit.memberId) {
      onChange({ ...model, members: model.members.filter((member) => member.id !== hit.memberId) });
      setSelected(null);
      return;
    }
    if (hit.nodeId && !lockedNodeIds.includes(hit.nodeId)) {
      const id = hit.nodeId;
      onChange({
        ...model,
        nodes: model.nodes.filter((node) => node.id !== id),
        members: model.members.filter((member) => member.i !== id && member.j !== id),
        supports: model.supports.filter((support) => support.nodeId !== id),
        loads: model.loads.filter((load) => load.nodeId !== id),
      });
      if (pending === id) setPending(null);
      setSelected(null);
    }
  }

  function setSupport(nodeId: number, type: SupportType) {
    if (lockSupports) return;
    onChange({
      ...model,
      supports: [...model.supports.filter((support) => support.nodeId !== nodeId), { nodeId, type }],
    });
  }

  function turnSupport(nodeId: number) {
    if (lockSupports || readOnly) return;
    onChange({
      ...model,
      supports: model.supports.map((support) => (support.nodeId === nodeId ? rotateSupport(support) : support)),
    });
  }

  function addNodeByCoord(event: FormEvent) {
    event.preventDefault();
    const x = readCoord(coord.x);
    const y = readCoord(coord.y);
    const z = readCoord(coord.z);
    if (x === null || y === null || (space && z === null)) {
      setCoordNote(space ? "x, y, z를 숫자로 입력하세요." : "x, y를 숫자로 입력하세요.");
      return;
    }
    const raw = { x: quantize(x, 0.001), y: quantize(y, 0.001), z: quantize(z ?? 0, 0.001) };
    const point = space
      ? { x: clampNum(raw.x, -16, 24), y: clampNum(raw.y, 0, 16), z: clampNum(raw.z, -16, 16) }
      : { x: clampNum(raw.x, LIMIT.minX, LIMIT.maxX), y: clampNum(raw.y, LIMIT.minY, LIMIT.maxY), z: undefined as number | undefined };
    const placedZ = point.z ?? 0;
    const moved = point.x !== raw.x || point.y !== raw.y || (space && placedZ !== raw.z);
    const occupied = model.nodes.some((node) => Math.hypot(node.x - point.x, node.y - point.y, (node.z ?? 0) - placedZ) < 0.02);
    if (occupied) {
      setCoordNote("그 좌표에 절점이 있습니다.");
      return;
    }
    onChange({
      ...model,
      nodes: [...model.nodes, { id: maxId(model) + 1, x: point.x, y: point.y, ...(space ? { z: placedZ } : {}) }],
    });
    setCoordNote(moved ? "판 안으로 맞춰 절점을 넣었습니다." : "");
  }

  function onLeft(hit: Hit) {
    if (readOnly) return;
    setMenu(null);
    if (tool === "select") {
      if (hit.memberId) setSelected({ kind: "member", id: hit.memberId });
      else if (hit.nodeId) setSelected({ kind: "node", id: hit.nodeId });
      else setSelected(null);
      return;
    }
    if (tool === "erase") {
      erase(hit);
      return;
    }
    if (tool === "node" && space && hit.ground && !hit.nodeId) {
      const y = Math.min(16, Math.max(0, quantize(Number(height) || 0, 0.05)));
      const next = { x: hit.ground.x, y, z: hit.ground.z };
      const occupied = model.nodes.some((node) => Math.hypot(node.x - next.x, node.y - next.y, (node.z ?? 0) - next.z) < 0.12);
      if (occupied) return;
      onChange({ ...model, nodes: [...model.nodes, { id: maxId(model) + 1, ...next }] });
      return;
    }
    if (tool === "node" && !space && hit.grid && !hit.nodeId) {
      const occupied = model.nodes.some((node) => Math.hypot(node.x - hit.grid!.x, node.y - hit.grid!.y) < 0.02);
      if (occupied) return;
      onChange({
        ...model,
        nodes: [...model.nodes, { id: maxId(model) + 1, x: hit.grid.x, y: hit.grid.y }],
      });
      return;
    }
    if (tool === "member" && hit.nodeId) {
      if (pending === null) {
        setPending(hit.nodeId);
        return;
      }
      if (pending === hit.nodeId) {
        setPending(null);
        return;
      }
      const exists = model.members.some(
        (member) =>
          (member.i === pending && member.j === hit.nodeId) || (member.j === pending && member.i === hit.nodeId),
      );
      if (!exists) {
        onChange({
          ...model,
          members: [...model.members, { id: maxId(model) + 1, i: pending, j: hit.nodeId, materialId: activeMaterialId }],
        });
      }
      setPending(null);
      return;
    }
    if (tool === "member" && hit.memberId) {
      onChange({
        ...model,
        members: model.members.map((member) => (member.id === hit.memberId ? { ...member, materialId: activeMaterialId } : member)),
      });
      return;
    }
    if ((tool === "pin" || tool === "rollerY" || tool === "rollerX" || tool === "ball" || tool === "slot") && hit.nodeId) {
      setSupport(hit.nodeId, tool);
      return;
    }
    if (tool === "load" && hit.nodeId && !lockSupports) {
      onChange({
        ...model,
        loads: [
          ...model.loads.filter((load) => load.nodeId !== hit.nodeId),
          { nodeId: hit.nodeId, fx: 0, fy: -newton, label: `${newton}N` },
        ],
      });
    }
  }

  function onRight(hit: Hit, x: number, y: number) {
    if (readOnly) return;
    setMenu({
      x: Math.min(x, window.innerWidth - 300),
      y: Math.min(y, window.innerHeight - 420),
      memberId: hit.memberId,
    });
  }

  function chooseMaterial(id: string) {
    setMaterialId(id);
    if (menu?.memberId) {
      onChange({
        ...model,
        members: model.members.map((member) => (member.id === menu.memberId ? { ...member, materialId: id } : member)),
      });
    }
    setMenu(null);
  }

  const menuMember = model.members.find((member) => member.id === menu?.memberId);
  const costRows = useMemo(() => {
    if (!showCost) return [];
    return model.members.map((member) => {
      const a = model.nodes.find((node) => node.id === member.i);
      const b = model.nodes.find((node) => node.id === member.j);
      const length = a && b ? Math.hypot(b.x - a.x, b.y - a.y, (b.z ?? 0) - (a.z ?? 0)) : 0;
      const mat = materials.find((item) => item.id === member.materialId);
      return {
        id: member.id,
        name: memberName(model.nodes, member),
        material: mat?.name ?? "?",
        cost: length * (mat?.costPerM ?? 0),
      };
    });
  }, [model, materials, showCost]);

  return (
    <div>
      {!readOnly ? (
        <div className="row-tools" style={{ marginBottom: 10 }}>
          {onSpace ? (
            <span className="segmented">
              <button type="button" className={!space ? "on" : ""} onClick={() => { onSpace(false); if (tool === "ball" || tool === "slot") setTool("pin"); }}>평면</button>
              <button type="button" className={space ? "on" : ""} onClick={() => { onSpace(true); setTool("node"); setPending(null); }}>3D</button>
            </span>
          ) : null}
          {activeTools.map((item) => (
            <button key={item} type="button" className={`tool ${tool === item ? "on" : ""}`} onClick={() => { setTool(item); setPending(null); }}>
              {TOOL_LABEL[item]}
            </button>
          ))}
          <button
            type="button"
            className="material-chip"
            onClick={(event) => setMenu({ x: event.clientX, y: event.clientY, memberId: null })}
            onContextMenu={(event) => {
              event.preventDefault();
              setMenu({ x: event.clientX, y: event.clientY, memberId: null });
            }}
          >
            <i className="swatch" style={{ background: material?.color ?? "#999" }} />
            <b>{material?.name}</b>
            <small>{material?.costPerM}/m</small>
            <small>우클릭</small>
          </button>
          {space && tool === "node" ? (
            <label className="height-field">
              높이 y
              <input value={height} inputMode="decimal" onChange={(event) => setHeight(event.target.value)} />
            </label>
          ) : null}
          {space && selected?.kind === "node" ? (
            <label className="height-field">
              선택 y
              <input
                inputMode="decimal"
                value={String(model.nodes.find((node) => node.id === selected.id)?.y ?? 0)}
                onChange={(event) => {
                  const y = Number(event.target.value);
                  if (!Number.isFinite(y)) return;
                  onChange({
                    ...model,
                    nodes: model.nodes.map((node) => (node.id === selected.id ? { ...node, y } : node)),
                  });
                }}
              />
            </label>
          ) : null}
          {activeTools.includes("node") ? (
            <form className="coord-field" onSubmit={addNodeByCoord}>
              <span>좌표</span>
              <input aria-label="절점 x" placeholder="x" inputMode="decimal" value={coord.x} onChange={(event) => setCoord({ ...coord, x: event.target.value })} />
              <input aria-label="절점 y" placeholder="y" inputMode="decimal" value={coord.y} onChange={(event) => setCoord({ ...coord, y: event.target.value })} />
              {space ? (
                <input aria-label="절점 z" placeholder="z" inputMode="decimal" value={coord.z} onChange={(event) => setCoord({ ...coord, z: event.target.value })} />
              ) : null}
              <button type="submit" className="tool">넣기</button>
              {coordNote ? <small>{coordNote}</small> : null}
            </form>
          ) : null}
          {tool === "load" ? (
            <span className="row-tools">
              {[20, 40, 60, 80, 100].map((value) => (
                <button key={value} type="button" className={`tool ${newton === value ? "on" : ""}`} onClick={() => setNewton(value)}>
                  {value}N
                </button>
              ))}
            </span>
          ) : null}
        </div>
      ) : null}

      {space ? (
        <SpaceBoard
          model={model}
          analysis={analysis}
          pendingId={pending}
          tool={readOnly ? "select" : tool}
          placeY={tool === "node" ? Math.min(16, Math.max(0, quantize(Number(height) || 0, 0.05))) : null}
          focusNodeId={focusNodeId}
          focusMemberIds={focusMemberIds}
          onLeft={onLeft}
          onRight={onRight}
          onRotate={readOnly || lockSupports ? undefined : turnSupport}
        />
      ) : (
        <TrussBoard
          model={model}
          loads={displayLoads}
          analysis={analysis}
          scene={scene}
          pendingId={pending}
          cursor={cursor}
          tool={readOnly ? "select" : tool}
          focusNodeId={focusNodeId}
          focusMemberIds={focusMemberIds}
          onLeft={onLeft}
          onRight={onRight}
          onMove={(point: WorldPoint | null) => setCursor(point ? { x: point.x, y: point.y } : null)}
          onRotate={readOnly || lockSupports ? undefined : turnSupport}
        />
      )}

      {showCost && costRows.length > 0 ? (
        <div className="chips" style={{ marginTop: 8 }}>
          {costRows.map((row) => (
            <span key={row.id} className="chip">
              {row.name} {row.material} {row.cost.toFixed(1)}
            </span>
          ))}
        </div>
      ) : null}

      {menu && !readOnly ? (
        <>
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setMenu(null)}
            style={{ position: "fixed", inset: 0, zIndex: 40, background: "transparent", border: 0 }}
          />
          <div className="menu" style={{ left: menu.x, top: menu.y }}>
            <h4>{menuMember ? memberName(model.nodes, menuMember) : "다음 부재"} · 우클릭 자재</h4>
            {materials.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mat ${item.id === activeMaterialId ? "on" : ""}`}
                onClick={() => chooseMaterial(item.id)}
              >
                <i className="swatch" style={{ background: item.color }} />
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    인 {item.tension} · 압 {item.buckling ? `${item.compression} 짧음` : item.compression}
                    {menuMember ? ` · 이 길이 압 ${compressionAllow(item, lengthOf(model, menuMember)).toFixed(0)}` : ""}
                  </small>
                </span>
                <span className="cost">
                  {item.costPerM}
                  <span>/m</span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function readCoord(text: string) {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() === "" || !Number.isFinite(value) ? null : value;
}

function clampNum(value: number, min: number, max: number) {
  return quantize(Math.min(max, Math.max(min, value)), 0.001);
}

function lengthOf(model: Model, member: Model["members"][number]) {
  const a = model.nodes.find((node) => node.id === member.i);
  const b = model.nodes.find((node) => node.id === member.j);
  if (!a || !b) return 0;
  return Math.hypot(b.x - a.x, b.y - a.y, (b.z ?? 0) - (a.z ?? 0));
}
