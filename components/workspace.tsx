"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { memberName } from "@/lib/analyze";
import { normalizeMembers } from "@/lib/shape";
import { compressionAllow } from "@/lib/materials";
import { rotateSupport } from "@/lib/support";
import { quantize } from "@/lib/view";
import type { Analysis, Load, Material, Model, Node, Support, SupportType } from "@/lib/types";
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

type Clip = {
  nodes: Node[];
  members: Model["members"];
  supports: Support[];
  loads: Load[];
  dx: number;
  times: number;
};

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
  focusKind,
  showCost = false,
  materialId: controlledMaterial,
  onMaterial,
  space = false,
  onSpace,
  cue = null,
  cueKey = 0,
  links = [],
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
  focusKind?: "reaction" | "joint" | "note";
  showCost?: boolean;
  materialId?: string;
  onMaterial?: (id: string) => void;
  space?: boolean;
  onSpace?: (next: boolean) => void;
  cue?: "rock" | "walk" | "car" | "book" | "kids" | null;
  cueKey?: number;
  links?: { i: number; j: number }[];
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
  const [menu, setMenu] = useState<{ x: number; y: number; memberId: number | null; nodeId: number | null; kind: "material" | "group" | "node" } | null>(null);
  const [nodeCoord, setNodeCoord] = useState({ x: "", y: "", z: "" });
  const [nodeNote, setNodeNote] = useState("");
  const [group, setGroup] = useState<number[]>([]);
  const [axisPick, setAxisPick] = useState(false);
  const moveBase = useRef<Model | null>(null);
  const [loadInput, setLoadInput] = useState({ fx: "0", down: "60" });
  const [height, setHeight] = useState("2");
  const [selected, setSelected] = useState<{ kind: "node" | "member"; id: number } | null>(null);
  const activeTools = (space ? SPACE_TOOLS : tools).filter((item) => item !== "rollerX");
  const [coord, setCoord] = useState({ x: "", y: "", z: "" });
  const [coordNote, setCoordNote] = useState("");
  const material = materials.find((item) => item.id === materialId) ?? materials[0];
  const activeMaterialId = material?.id ?? materialId;
  const history = useRef<Model[]>([]);
  const emitted = useRef<Model | null>(null);
  const clipRef = useRef<Clip | null>(null);

  function emit(next: Model, record = true) {
    const normalized = normalizeMembers(next);
    if (record && !readOnly) {
      history.current.push(model);
      if (history.current.length > 60) history.current.shift();
    }
    emitted.current = normalized;
    onChange(normalized);
  }

  function undo() {
    const prev = history.current.pop();
    if (!prev || readOnly) return;
    const normalized = normalizeMembers(prev);
    emitted.current = normalized;
    onChange(normalized);
  }

  function copySelection() {
    const ids = new Set(group);
    if (ids.size === 0 && selected?.kind === "node") ids.add(selected.id);
    if (ids.size === 0 && selected?.kind === "member") {
      const member = model.members.find((item) => item.id === selected.id);
      if (member) {
        ids.add(member.i);
        ids.add(member.j);
      }
    }
    if (ids.size === 0) return false;
    const nodes = model.nodes.filter((node) => ids.has(node.id)).map((node) => ({ ...node }));
    if (nodes.length === 0) return false;
    const minX = Math.min(...nodes.map((node) => node.x));
    const maxX = Math.max(...nodes.map((node) => node.x));
    clipRef.current = {
      nodes,
      members: model.members.filter((member) => ids.has(member.i) && ids.has(member.j)).map((member) => ({ ...member })),
      supports: model.supports.filter((support) => ids.has(support.nodeId)).map((support) => ({ ...support })),
      loads: model.loads.filter((load) => ids.has(load.nodeId)).map((load) => ({ ...load })),
      dx: Math.max(1, maxX - minX + 1),
      times: 0,
    };
    return true;
  }

  function pasteSelection() {
    const clip = clipRef.current;
    if (!clip || readOnly || clip.nodes.length === 0) return;
    clip.times += 1;
    const dx = clip.dx * clip.times;
    let id = maxId(model) + 1;
    const map = new Map<number, number>();
    const nodes = clip.nodes.map((node) => {
      const copy = { ...node, id, x: node.x + dx };
      map.set(node.id, id);
      id += 1;
      return copy;
    });
    const members = clip.members.flatMap((member) => {
      const i = map.get(member.i);
      const j = map.get(member.j);
      if (!i || !j || i === j) return [];
      const copy = { ...member, id, i, j };
      id += 1;
      return [copy];
    });
    const supports = lockSupports
      ? []
      : clip.supports.flatMap((support) => {
          const nodeId = map.get(support.nodeId);
          return nodeId ? [{ ...support, nodeId }] : [];
        });
    const loads = clip.loads.flatMap((load) => {
      const nodeId = map.get(load.nodeId);
      return nodeId ? [{ ...load, nodeId }] : [];
    });
    emit({
      nodes: [...model.nodes, ...nodes],
      members: [...model.members, ...members],
      supports: [...model.supports, ...supports],
      loads: [...model.loads, ...loads],
    });
    setGroup(nodes.map((node) => node.id));
    setSelected(null);
    setMenu(null);
  }

  useEffect(() => {
    if (emitted.current === model) return;
    history.current = [];
    const normalized = normalizeMembers(model);
    emitted.current = normalized;
    if (normalized !== model) onChange(normalized);
  }, [model, onChange]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const shortcut = event.ctrlKey || event.metaKey;
      if (shortcut && !event.shiftKey && event.code === "KeyZ") {
        event.preventDefault();
        undo();
        return;
      }
      if (shortcut && event.code === "KeyC") {
        if (copySelection()) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
      if (shortcut && event.code === "KeyV") {
        if (!clipRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        pasteSelection();
        return;
      }
      if (event.key === "Escape") {
        setPending(null);
        setMenu(null);
        setSelected(null);
        setGroup([]);
        setAxisPick(false);
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selected && !readOnly) {
        event.preventDefault();
        erase(selected.kind === "node" ? { nodeId: selected.id, memberId: null } : { nodeId: null, memberId: selected.id });
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  function erase(hit: { nodeId: number | null; memberId: number | null; supportNodeId?: number | null; loadNodeId?: number | null; target?: Hit["target"] }) {
    const kind = hit.target?.kind;
    const id = hit.target?.id;
    if (kind === "load" && id) {
      if (model.loads.some((load) => load.nodeId === id)) {
        emit({ ...model, loads: model.loads.filter((load) => load.nodeId !== id) });
      }
      setSelected(null);
      return;
    }
    if (kind === "support" && id) {
      if (!lockSupports && model.supports.some((support) => support.nodeId === id)) {
        emit({ ...model, supports: model.supports.filter((support) => support.nodeId !== id) });
        setSelected(null);
      }
      return;
    }
    if ((kind === "member" && id) || hit.memberId) {
      const memberId = kind === "member" && id ? id : hit.memberId;
      emit({ ...model, members: model.members.filter((member) => member.id !== memberId) });
      setSelected(null);
      return;
    }
    if (hit.nodeId && !lockedNodeIds.includes(hit.nodeId)) {
      const id = hit.nodeId;
      emit({
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
    emit({
      ...model,
      supports: [...model.supports.filter((support) => support.nodeId !== nodeId), { nodeId, type }],
    });
  }

  function turnSupport(nodeId: number) {
    if (lockSupports || readOnly) return;
    emit({
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
    emit({
      ...model,
      nodes: [...model.nodes, { id: maxId(model) + 1, x: point.x, y: point.y, ...(space ? { z: placedZ } : {}) }],
    });
    setCoordNote(moved ? "판 안으로 맞춰 절점을 넣었습니다." : "");
  }

  function onLeft(hit: Hit) {
    if (readOnly) return;
    setMenu(null);
    if (tool === "select") {
      if (hit.memberId) {
        const member = model.members.find((item) => item.id === hit.memberId);
        if (member && !group.includes(member.i)) setGroup([member.i, member.j]);
        setSelected({ kind: "member", id: hit.memberId });
      } else if (hit.nodeId) {
        if (!group.includes(hit.nodeId)) setGroup([hit.nodeId]);
        setSelected({ kind: "node", id: hit.nodeId });
      } else {
        setSelected(null);
        setGroup([]);
      }
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
      emit({ ...model, nodes: [...model.nodes, { id: maxId(model) + 1, ...next }] });
      return;
    }
    if (tool === "node" && !space && hit.grid && !hit.nodeId) {
      const occupied = model.nodes.some((node) => Math.hypot(node.x - hit.grid!.x, node.y - hit.grid!.y) < 0.02);
      if (occupied) return;
      emit({
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
      if (!exists && hit.nodeId) {
        emit({
          ...model,
          members: [...model.members, { id: maxId(model) + 1, i: pending, j: hit.nodeId, materialId: activeMaterialId }],
        });
      }
      setPending(null);
      return;
    }
    if (tool === "member" && hit.memberId) {
      emit({
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
      const fx = Number(loadInput.fx);
      const down = Number(loadInput.down);
      if (!Number.isFinite(fx) || !Number.isFinite(down) || (Math.abs(fx) < 0.05 && Math.abs(down) < 0.05)) return;
      const parts = [Math.abs(fx) >= 0.05 ? `${fx}→` : "", Math.abs(down) >= 0.05 ? `${down}↓` : ""].filter(Boolean);
      emit({
        ...model,
        loads: [
          ...model.loads.filter((load) => load.nodeId !== hit.nodeId),
          { nodeId: hit.nodeId, fx, fy: -down, label: parts.join(" ") },
        ],
      });
    }
  }

  function inGroup(hit: Hit) {
    if (group.length === 0) return false;
    if (hit.nodeId && group.includes(hit.nodeId)) return true;
    const member = model.members.find((item) => item.id === hit.memberId);
    return Boolean(member && (group.includes(member.i) || group.includes(member.j)));
  }

  function onRight(hit: Hit, x: number, y: number) {
    if (readOnly) return;
    const place = { x: Math.min(x, window.innerWidth - 280), y: Math.min(y, window.innerHeight - 240) };
    if (hit.nodeId) {
      const node = model.nodes.find((item) => item.id === hit.nodeId);
      if (!node) return;
      setNodeCoord({ x: String(node.x), y: String(node.y), z: String(node.z ?? 0) });
      setNodeNote("");
      setMenu({ ...place, memberId: null, nodeId: node.id, kind: inGroup(hit) ? "group" : "node" });
      return;
    }
    if (inGroup(hit)) {
      setMenu({ ...place, memberId: null, nodeId: null, kind: "group" });
      return;
    }
    setMenu({ ...place, memberId: hit.memberId, nodeId: null, kind: "material" });
  }

  function shiftNodes(anchorId: number, dx: number, dy: number, dz: number) {
    const moving = new Set(group.includes(anchorId) ? group : [anchorId]);
    return model.nodes.map((node) => {
      if (!moving.has(node.id) || lockedNodeIds.includes(node.id)) return node;
      return {
        ...node,
        x: quantize(node.x + dx, 0.001),
        y: quantize(node.y + dy, 0.001),
        ...(space ? { z: quantize((node.z ?? 0) + dz, 0.001) } : {}),
      };
    });
  }

  function moveNodeTo(event: FormEvent) {
    event.preventDefault();
    if (!menu?.nodeId) return;
    const anchor = model.nodes.find((node) => node.id === menu.nodeId);
    if (!anchor) return;
    const x = readCoord(nodeCoord.x);
    const y = readCoord(nodeCoord.y);
    const z = readCoord(nodeCoord.z);
    if (x === null || y === null || (space && z === null)) {
      setNodeNote(space ? "x, y, z를 숫자로 입력하세요." : "x, y를 숫자로 입력하세요.");
      return;
    }
    if (lockedNodeIds.includes(anchor.id)) {
      setNodeNote("고정된 절점은 옮길 수 없습니다.");
      return;
    }
    const target = space
      ? { x: clampNum(x, -16, 24), y: clampNum(y, 0, 16), z: clampNum(z ?? 0, -16, 16) }
      : { x: clampNum(x, LIMIT.minX, LIMIT.maxX), y: clampNum(y, LIMIT.minY, LIMIT.maxY), z: anchor.z ?? 0 };
    const nodes = shiftNodes(anchor.id, target.x - anchor.x, target.y - anchor.y, target.z - (anchor.z ?? 0));
    emit({ ...model, nodes });
    const moved = nodes.find((node) => node.id === anchor.id);
    if (moved && nodes.some((node) => node.id !== moved.id && sameSpot(node, moved))) {
      setNodeNote("같은 좌표의 절점이 있습니다. 통합할 수 있습니다.");
      return;
    }
    setMenu(null);
  }

  function mergeNode(nodeId: number) {
    const anchor = model.nodes.find((node) => node.id === nodeId);
    if (!anchor) return;
    const drop = new Set(model.nodes.filter((node) => node.id !== nodeId && sameSpot(node, anchor)).map((node) => node.id));
    if (drop.size === 0) return;
    const remap = (id: number) => (drop.has(id) ? nodeId : id);
    const seen = new Set<string>();
    const members = [];
    for (const member of model.members) {
      const i = remap(member.i);
      const j = remap(member.j);
      if (i === j) continue;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      members.push({ ...member, i, j });
    }
    let supports = model.supports.filter((support) => !drop.has(support.nodeId));
    if (!supports.some((support) => support.nodeId === nodeId)) {
      const extra = model.supports.find((support) => drop.has(support.nodeId));
      if (extra && !lockSupports) supports = [...supports, { ...extra, nodeId }];
    }
    let loads = model.loads.filter((load) => !drop.has(load.nodeId));
    if (!loads.some((load) => load.nodeId === nodeId)) {
      const extra = model.loads.find((load) => drop.has(load.nodeId));
      if (extra) loads = [...loads, { ...extra, nodeId }];
    }
    emit({
      nodes: model.nodes.filter((node) => !drop.has(node.id)),
      members,
      supports,
      loads,
    });
    setGroup((current) => current.filter((id) => !drop.has(id)));
    setSelected((current) => (current?.kind === "node" && drop.has(current.id) ? { kind: "node", id: nodeId } : current));
    setMenu(null);
  }

  function moveGroup(dx: number, dy: number) {
    if (!moveBase.current) {
      moveBase.current = model;
      if (!readOnly) {
        history.current.push(model);
        if (history.current.length > 60) history.current.shift();
      }
    }
    const base = moveBase.current;
    const ids = new Set(group);
    emit(
      {
        ...base,
        nodes: base.nodes.map((node) =>
          ids.has(node.id) && !lockedNodeIds.includes(node.id) ? { ...node, x: node.x + dx, y: node.y + dy } : node,
        ),
      },
      false,
    );
  }

  function finishGroupMove() {
    moveBase.current = null;
  }

  function duplicateGroup() {
    if (group.length === 0) return;
    const ids = new Set(group);
    const picked = model.nodes.filter((node) => ids.has(node.id));
    const minX = Math.min(...picked.map((node) => node.x));
    const maxX = Math.max(...picked.map((node) => node.x));
    const dx = Math.max(1, maxX - minX + 1);
    let id = maxId(model) + 1;
    const map = new Map<number, number>();
    const nodes = picked.map((node) => {
      const copy = { ...node, id, x: node.x + dx };
      map.set(node.id, id);
      id += 1;
      return copy;
    });
    const members = model.members
      .filter((member) => ids.has(member.i) && ids.has(member.j))
      .map((member) => ({ ...member, id: id++, i: map.get(member.i)!, j: map.get(member.j)! }));
    const supports = lockSupports
      ? []
      : model.supports.filter((support) => ids.has(support.nodeId)).map((support) => ({ ...support, nodeId: map.get(support.nodeId)! }));
    const loads = model.loads.filter((load) => ids.has(load.nodeId)).map((load) => ({ ...load, nodeId: map.get(load.nodeId)! }));
    emit({
      nodes: [...model.nodes, ...nodes],
      members: [...model.members, ...members],
      supports: [...model.supports, ...supports],
      loads: [...model.loads, ...loads],
    });
    setGroup(nodes.map((node) => node.id));
    setMenu(null);
  }

  function mirrorGroup(axisX: number) {
    if (group.length === 0) return;
    const ids = new Set(group);
    let id = maxId(model) + 1;
    const map = new Map<number, number>();
    const nodes = [...model.nodes];
    const at = new Map(nodes.map((node) => [`${Math.round(node.x * 100) / 100},${Math.round(node.y * 100) / 100}`, node.id]));
    const created: number[] = [];
    for (const node of model.nodes.filter((item) => ids.has(item.id))) {
      const x = Math.round((axisX * 2 - node.x) * 1000) / 1000;
      const key = `${Math.round(x * 100) / 100},${Math.round(node.y * 100) / 100}`;
      const found = at.get(key);
      if (found) {
        map.set(node.id, found);
        continue;
      }
      nodes.push({ ...node, id, x });
      at.set(key, id);
      map.set(node.id, id);
      created.push(id);
      id += 1;
    }
    const members = [...model.members];
    for (const member of model.members.filter((item) => ids.has(item.i) && ids.has(item.j))) {
      const i = map.get(member.i);
      const j = map.get(member.j);
      if (!i || !j || i === j) continue;
      if (members.some((item) => (item.i === i && item.j === j) || (item.i === j && item.j === i))) continue;
      members.push({ ...member, id, i, j });
      id += 1;
    }
    const supports = [...model.supports];
    if (!lockSupports) {
      for (const support of model.supports.filter((item) => ids.has(item.nodeId))) {
        const nodeId = map.get(support.nodeId);
        if (!nodeId || supports.some((item) => item.nodeId === nodeId)) continue;
        supports.push({ ...support, nodeId });
      }
    }
    const loads = [...model.loads];
    for (const load of model.loads.filter((item) => ids.has(item.nodeId))) {
      const nodeId = map.get(load.nodeId);
      if (!nodeId || loads.some((item) => item.nodeId === nodeId)) continue;
      loads.push({ ...load, nodeId });
    }
    emit({ nodes, members, supports, loads });
    if (created.length) setGroup(created);
    setAxisPick(false);
    setMenu(null);
  }

  function chooseMaterial(id: string) {
    setMaterialId(id);
    if (menu?.memberId) {
      emit({
        ...model,
        members: model.members.map((member) => (member.id === menu.memberId ? { ...member, materialId: id } : member)),
      });
    }
    setMenu(null);
  }

  const menuMember = model.members.find((member) => member.id === menu?.memberId);
  const menuNode = model.nodes.find((node) => node.id === menu?.nodeId);
  const canMerge = Boolean(menuNode && model.nodes.some((node) => node.id !== menuNode.id && sameSpot(node, menuNode)));
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
            onClick={(event) => setMenu({ x: event.clientX, y: event.clientY, memberId: null, nodeId: null, kind: "material" })}
            onContextMenu={(event) => {
              event.preventDefault();
              setMenu({ x: event.clientX, y: event.clientY, memberId: null, nodeId: null, kind: "material" });
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
                  emit({
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
          {tool === "select" && !space ? (
            <span className="note">선택에서 끌면 묶입니다. 묶인 것을 끌면 옮깁니다. Ctrl+Z 되돌리기, Ctrl+C 복사, Ctrl+V 붙여넣기. 화면 이동은 Shift를 누른 채 끌기입니다.</span>
          ) : null}
          {axisPick ? <span className="note">대칭축이 될 세로선을 판에서 누르세요.</span> : null}
          {tool === "load" ? (
            <span className="coord-field">
              <span>하중</span>
              <input aria-label="가로 하중" placeholder="가로" inputMode="decimal" value={loadInput.fx} onChange={(event) => setLoadInput({ ...loadInput, fx: event.target.value })} />
              <input aria-label="아래 하중" placeholder="아래" inputMode="decimal" value={loadInput.down} onChange={(event) => setLoadInput({ ...loadInput, down: event.target.value })} />
              <small>→ 아래가 +</small>
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
          focusKind={focusKind}
          onLeft={onLeft}
          onRight={onRight}
          onMove={(point: WorldPoint | null) => setCursor(point ? { x: point.x, y: point.y } : null)}
          onRotate={readOnly || lockSupports ? undefined : turnSupport}
          cue={cue}
          cueKey={cueKey}
          links={links}
          groupNodeIds={group}
          axisPick={axisPick}
          onMarquee={readOnly || space ? undefined : (ids) => { setGroup(ids); setSelected(null); }}
          onGroupMove={readOnly || space ? undefined : moveGroup}
          onGroupDrop={finishGroupMove}
          onAxis={readOnly || space ? undefined : mirrorGroup}
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
            {menu.kind === "group" ? (
              <>
                <h4>그룹 {group.length}절점</h4>
                <button type="button" className="plain" onClick={duplicateGroup}>복제</button>
                <button type="button" className="plain" onClick={() => { setAxisPick(true); setMenu(null); }}>좌우대칭</button>
              </>
            ) : null}
            {menu.nodeId ? (
              <>
                <h4>절점 좌표</h4>
                <form className="node-move" onSubmit={moveNodeTo}>
                  <input aria-label="절점 x" inputMode="decimal" value={nodeCoord.x} onChange={(event) => setNodeCoord({ ...nodeCoord, x: event.target.value })} />
                  <input aria-label="절점 y" inputMode="decimal" value={nodeCoord.y} onChange={(event) => setNodeCoord({ ...nodeCoord, y: event.target.value })} />
                  {space ? <input aria-label="절점 z" inputMode="decimal" value={nodeCoord.z} onChange={(event) => setNodeCoord({ ...nodeCoord, z: event.target.value })} /> : null}
                  <button type="submit">이동</button>
                </form>
                {nodeNote ? <p className="node-note">{nodeNote}</p> : null}
                {canMerge && menu.nodeId ? (
                  <button type="button" className="plain" onClick={() => mergeNode(menu.nodeId!)}>절점 통합</button>
                ) : null}
              </>
            ) : null}
            {menu.kind === "material" ? <h4>{menuMember ? memberName(model.nodes, menuMember) : "다음 부재"} · 우클릭 자재</h4> : null}
            {menu.kind === "material" ? materials.map((item) => (
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
            )) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function sameSpot(a: { x: number; y: number; z?: number }, b: { x: number; y: number; z?: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0)) < 0.02;
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
