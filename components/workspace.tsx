"use client";

import { useEffect, useMemo, useState } from "react";
import { memberName } from "@/lib/analyze";
import { compressionAllow } from "@/lib/materials";
import type { Analysis, Load, Material, Model, SupportType } from "@/lib/types";
import { TrussBoard, type Hit, type WorldPoint } from "./truss-board";

export type Tool = "select" | "node" | "member" | "pin" | "rollerY" | "rollerX" | "load" | "erase";

const TOOL_LABEL: Record<Tool, string> = {
  select: "선택",
  node: "절점",
  member: "부재",
  pin: "핀",
  rollerY: "롤러",
  rollerX: "가로",
  load: "하중",
  erase: "지우기",
};

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
}) {
  const [tool, setTool] = useState<Tool>(tools.includes("member") ? "member" : tools[0]);
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
  const [selected, setSelected] = useState<{ kind: "node" | "member"; id: number } | null>(null);
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
    if (tool === "node" && hit.grid && !hit.nodeId) {
      const occupied = model.nodes.some((node) => Math.hypot(node.x - hit.grid!.x, node.y - hit.grid!.y) < 0.2);
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
    if ((tool === "pin" || tool === "rollerY" || tool === "rollerX") && hit.nodeId) {
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
      const length = a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
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
          {tools.map((item) => (
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
      />

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

function lengthOf(model: Model, member: Model["members"][number]) {
  const a = model.nodes.find((node) => node.id === member.i);
  const b = model.nodes.find((node) => node.id === member.j);
  if (!a || !b) return 0;
  return Math.hypot(b.x - a.x, b.y - a.y);
}
