"use client";

import { useEffect, useRef, useState } from "react";
import { nodeLabel } from "@/lib/analyze";
import { materialById } from "@/lib/materials";
import { signed } from "@/lib/format";
import { canTurn, supportAngle } from "@/lib/support";
import { clampZoom, quantize, snapStep } from "@/lib/view";
import type { Analysis, Load, Model, SupportType } from "@/lib/types";
import { ZoomBar } from "./zoom-bar";

export const PAD = 54;
export const SCALE = 68;
export const WORLD_W = 12;
export const WORLD_H = 8;
export const VIEW_W = PAD * 2 + WORLD_W * SCALE;
export const VIEW_H = PAD * 2 + WORLD_H * SCALE;
export const LIMIT = { minX: -30, maxX: 42, minY: -16, maxY: 28 };

export type Camera = { cx: number; cy: number; zoom: number };
export const HOME_CAMERA: Camera = { cx: WORLD_W / 2, cy: WORLD_H / 2, zoom: 1 };

export type WorldPoint = { x: number; y: number; sx: number; sy: number };

export function toScreen(x: number, y: number, cam: Camera = HOME_CAMERA) {
  const scale = SCALE * cam.zoom;
  return {
    sx: VIEW_W / 2 + (x - cam.cx) * scale,
    sy: VIEW_H / 2 - (y - cam.cy) * scale,
  };
}

export function fromClient(svg: SVGSVGElement, clientX: number, clientY: number, cam: Camera = HOME_CAMERA): WorldPoint | null {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const mapped = point.matrixTransform(ctm.inverse());
  const scale = SCALE * cam.zoom;
  return {
    x: cam.cx + (mapped.x - VIEW_W / 2) / scale,
    y: cam.cy - (mapped.y - VIEW_H / 2) / scale,
    sx: mapped.x,
    sy: mapped.y,
  };
}

export function clampGrid(x: number, y: number, zoom = 1) {
  const step = snapStep(zoom);
  return {
    x: Math.min(LIMIT.maxX, Math.max(LIMIT.minX, quantize(x, step))),
    y: Math.min(LIMIT.maxY, Math.max(LIMIT.minY, quantize(y, step))),
  };
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len < 1e-6 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return Math.hypot(px - x, py - y);
}

export type Hit = {
  nodeId: number | null;
  memberId: number | null;
  supportNodeId?: number | null;
  loadNodeId?: number | null;
  target?: { kind: "node" | "member" | "support" | "load"; id: number } | null;
  world: { x: number; y: number } | null;
  grid: { x: number; y: number } | null;
  ground?: { x: number; z: number } | null;
};

function supportHit(sx: number, sy: number, px: number, py: number, angle: number) {
  const turn = (-angle * Math.PI) / 180;
  const dx = px - sx;
  const dy = py - sy;
  const lx = dx * Math.cos(turn) - dy * Math.sin(turn);
  const ly = dx * Math.sin(turn) + dy * Math.cos(turn);
  if (Math.abs(lx) > 18 || ly < 4 || ly > 38) return null;
  return Math.hypot(lx, ly - 20);
}

function loadHit(load: Load, sx: number, sy: number, px: number, py: number) {
  const mag = Math.hypot(load.fx, load.fy, load.fz ?? 0);
  if (mag < 0.05) return null;
  const sdx = load.fx / mag;
  const sdy = -load.fy / mag;
  const distance = distToSegment(px, py, sx - sdx * 48, sy - sdy * 48, sx - sdx * 16, sy - sdy * 16);
  return distance < 14 ? distance : null;
}

export function hitTest(point: WorldPoint, model: Model, cam: Camera = HOME_CAMERA, loads: Load[] = model.loads): Hit {
  const grid = point.x >= LIMIT.minX - 0.4 && point.x <= LIMIT.maxX + 0.4 && point.y >= LIMIT.minY - 0.4 && point.y <= LIMIT.maxY + 0.4
    ? clampGrid(point.x, point.y, cam.zoom)
    : null;
  let nodeId: number | null = null;
  let best = 18;
  for (const node of model.nodes) {
    const screen = toScreen(node.x, node.y, cam);
    const d = Math.hypot(point.sx - screen.sx, point.sy - screen.sy);
    if (d < best) {
      best = d;
      nodeId = node.id;
    }
  }
  let supportNodeId: number | null = null;
  let supportBest = 40;
  for (const support of model.supports) {
    const node = model.nodes.find((item) => item.id === support.nodeId);
    if (!node) continue;
    const screen = toScreen(node.x, node.y, cam);
    const distance = supportHit(screen.sx, screen.sy, point.sx, point.sy, supportAngle(support));
    if (distance !== null && distance < supportBest) {
      supportBest = distance;
      supportNodeId = support.nodeId;
    }
  }
  let loadNodeId: number | null = null;
  let loadBest = 14;
  for (const load of loads) {
    const node = model.nodes.find((item) => item.id === load.nodeId);
    if (!node) continue;
    const screen = toScreen(node.x, node.y, cam);
    const distance = loadHit(load, screen.sx, screen.sy, point.sx, point.sy);
    if (distance !== null && distance < loadBest) {
      loadBest = distance;
      loadNodeId = load.nodeId;
    }
  }
  let memberId: number | null = null;
  let memberBest = 12;
  for (const member of model.members) {
    const a = model.nodes.find((node) => node.id === member.i);
    const b = model.nodes.find((node) => node.id === member.j);
    if (!a || !b) continue;
    const as = toScreen(a.x, a.y, cam);
    const bs = toScreen(b.x, b.y, cam);
    const d = distToSegment(point.sx, point.sy, as.sx, as.sy, bs.sx, bs.sy);
    if (d < memberBest) {
      memberBest = d;
      memberId = member.id;
    }
  }
  let target: Hit["target"] = null;
  let targetDistance = Infinity;
  const consider = (distance: number | null, next: NonNullable<Hit["target"]>) => {
    if (distance === null || distance >= targetDistance) return;
    targetDistance = distance;
    target = next;
  };
  if (nodeId !== null) {
    const node = model.nodes.find((item) => item.id === nodeId);
    if (node) {
      const screen = toScreen(node.x, node.y, cam);
      consider(Math.hypot(point.sx - screen.sx, point.sy - screen.sy), { kind: "node", id: nodeId });
    }
  }
  if (memberId !== null) consider(memberBest, { kind: "member", id: memberId });
  if (supportNodeId !== null) consider(supportBest, { kind: "support", id: supportNodeId });
  if (loadNodeId !== null) consider(loadBest, { kind: "load", id: loadNodeId });
  return { nodeId, memberId, supportNodeId, loadNodeId, target, world: { x: point.x, y: point.y }, grid };
}

const SCENE_SKY = {
  paper: "#f7f8fb",
  valley: "#e7f3ea",
  road: "#e7f2fb",
  cliff: "#e7f1f6",
  desk: "#f6f1e7",
} as const;

function sceneShift(cam: Camera) {
  const zoom = cam.zoom;
  const tx = (VIEW_W / 2) * (1 - zoom) + (HOME_CAMERA.cx - cam.cx) * SCALE * zoom;
  const ty = (VIEW_H / 2) * (1 - zoom) - (HOME_CAMERA.cy - cam.cy) * SCALE * zoom;
  return `translate(${tx} ${ty}) scale(${zoom})`;
}

function SceneArt({ scene }: { scene: keyof typeof SCENE_SKY }) {
  if (scene === "valley") {
    return (
      <g>
        <path d={`M0 ${VIEW_H * 0.42} C 180 ${VIEW_H * 0.3}, 280 ${VIEW_H * 0.5}, ${VIEW_W} ${VIEW_H * 0.34} L ${VIEW_W} ${VIEW_H} L 0 ${VIEW_H} Z`} fill="#d5e7cf" />
        <path d="M70 430 L250 390 L250 620 L40 620 Z" fill="#7ea36a" />
        <path d={`M${VIEW_W - 70} 430 L${VIEW_W - 250} 390 L${VIEW_W - 250} 620 L${VIEW_W - 40} 620 Z`} fill="#6f9860" />
        <path d="M250 470 C 420 430, 540 490, 700 450 L 700 620 L 250 620 Z" fill="#7eb4c6" opacity="0.85" />
      </g>
    );
  }
  if (scene === "road") {
    return (
      <g>
        <rect x="0" y={VIEW_H - 118} width={VIEW_W} height="46" fill="#d7c4a2" />
        <rect x="0" y={VIEW_H - 78} width={VIEW_W} height="78" fill="#4e5966" />
        <line x1="30" y1={VIEW_H - 40} x2={VIEW_W - 30} y2={VIEW_H - 40} stroke="rgba(255,255,255,0.75)" strokeWidth="4" strokeDasharray="22 16" />
      </g>
    );
  }
  if (scene === "cliff") {
    return (
      <g>
        <path d={`M0 0 H150 L120 180 L160 300 L110 460 L150 ${VIEW_H} H0 Z`} fill="#8d8478" />
        <path d={`M150 ${VIEW_H * 0.62} C 360 ${VIEW_H * 0.5}, 640 ${VIEW_H * 0.7}, ${VIEW_W} ${VIEW_H * 0.56} L ${VIEW_W} ${VIEW_H} L 150 ${VIEW_H} Z`} fill="#d5e4ea" />
      </g>
    );
  }
  if (scene === "desk") {
    return (
      <g>
        <rect x="36" y={VIEW_H - 150} width={VIEW_W - 72} height="92" rx="8" fill="#e7d3ae" />
        <rect x="70" y={VIEW_H - 58} width="16" height="58" fill="#c4a574" />
        <rect x={VIEW_W - 86} y={VIEW_H - 58} width="16" height="58" fill="#c4a574" />
      </g>
    );
  }
  return null;
}

function Scene({ scene, cam }: { scene: keyof typeof SCENE_SKY; cam: Camera }) {
  return (
    <g>
      <rect width={VIEW_W} height={VIEW_H} fill={SCENE_SKY[scene]} />
      <g data-scene="world" transform={sceneShift(cam)}>
        <SceneArt scene={scene} />
      </g>
    </g>
  );
}

function SupportGlyph({ sx, sy, type, angle, hot, outline }: { sx: number; sy: number; type: SupportType; angle?: number; hot?: boolean; outline?: boolean }) {
  const turn = supportAngle({ type, angle });
  const roller = type === "rollerY" || type === "rollerX";
  const body = `${sx},${sy + 7} ${sx - 11},${sy + 24} ${sx + 11},${sy + 24}`;
  return (
    <g transform={`rotate(${turn} ${sx} ${sy})`}>
      {hot ? <circle cx={sx} cy={sy + 18} r="24" fill="transparent" /> : null}
      {outline ? <polygon points={body} fill="none" stroke="#ffe14a" strokeWidth="6" strokeLinejoin="round" filter="url(#hover-neon)" /> : null}
      <polygon points={body} fill="#172033" />
      {roller ? (
        <g>
          {outline ? (
            <g fill="none" stroke="#ffe14a" strokeWidth="5" filter="url(#hover-neon)">
              <circle cx={sx - 6} cy={sy + 30} r="3.2" />
              <circle cx={sx + 6} cy={sy + 30} r="3.2" />
            </g>
          ) : null}
          <circle cx={sx - 6} cy={sy + 30} r="3.2" fill="none" stroke="#172033" strokeWidth="1.6" />
          <circle cx={sx + 6} cy={sy + 30} r="3.2" fill="none" stroke="#172033" strokeWidth="1.6" />
        </g>
      ) : (
        <g>
          {outline ? <line x1={sx - 14} y1={sy + 28} x2={sx + 14} y2={sy + 28} stroke="#ffe14a" strokeWidth="5" filter="url(#hover-neon)" /> : null}
          <line x1={sx - 14} y1={sy + 28} x2={sx + 14} y2={sy + 28} stroke="#172033" strokeWidth="1.6" />
        </g>
      )}
    </g>
  );
}

export function RotateChip({
  sx,
  sy,
  angle,
  onRotate,
  onHold,
  onRelease,
}: {
  sx: number;
  sy: number;
  angle: number;
  onRotate: () => void;
  onHold: () => void;
  onRelease: () => void;
}) {
  const rad = (angle * Math.PI) / 180;
  const x = sx + Math.sin(rad) * 52;
  const y = sy - Math.cos(rad) * 52;
  return (
    <g
      transform={`translate(${x} ${y})`}
      style={{ cursor: "pointer" }}
      onPointerEnter={onHold}
      onPointerLeave={onRelease}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onRotate();
      }}
    >
      <rect x="-28" y="-14" width="56" height="28" rx="14" fill="white" stroke="#c5d0de" />
      <text y="4" textAnchor="middle" fontSize="12" fontWeight="800" fill="#172033">
        회전
      </text>
    </g>
  );
}

function LoadArrow({ load, sx, sy, outline }: { load: Load; sx: number; sy: number; outline?: boolean }) {
  const mag = Math.hypot(load.fx, load.fy, load.fz ?? 0);
  if (mag < 0.05) return null;
  const p = { sx, sy };
  const sdx = load.fx / mag;
  const sdy = -load.fy / mag;
  const endx = p.sx - sdx * 16;
  const endy = p.sy - sdy * 16;
  const startx = p.sx - sdx * 48;
  const starty = p.sy - sdy * 48;
  const label = load.label ?? `${Math.round(mag)}N`;
  return (
    <g>
      {outline ? <line x1={startx} y1={starty} x2={endx} y2={endy} stroke="#ffe14a" strokeWidth="8" strokeLinecap="round" filter="url(#hover-neon)" /> : null}
      <line x1={startx} y1={starty} x2={endx} y2={endy} stroke="#ef8a24" strokeWidth="3" />
      <polygon
        points={arrowHead(endx, endy, sdx, sdy)}
        fill="#ef8a24"
      />
      <text x={startx} y={starty - 6} textAnchor="middle" fontSize="12" fontWeight="800" fill="#d97706">
        {label}
      </text>
    </g>
  );
}

function JointDiagram({
  model,
  analysis,
  cam,
  kind,
  nodeId,
  loads,
  focusMemberIds,
}: {
  model: Model;
  analysis: Analysis;
  cam: Camera;
  kind: "reaction" | "joint";
  nodeId?: number;
  loads: Load[];
  focusMemberIds?: number[];
}) {
  type Arrow = { sx: number; sy: number; fx: number; fy: number; label: string; color: string; strong: boolean };
  const arrows: Arrow[] = [];
  const zeros: { sx: number; sy: number; label: string }[] = [];
  const push = (id: number, fx: number, fy: number, label: string, color: string, strong: boolean) => {
    if (Math.hypot(fx, fy) < 0.05) return;
    const node = model.nodes.find((item) => item.id === id);
    if (!node) return;
    const point = toScreen(node.x, node.y, cam);
    arrows.push({ sx: point.sx, sy: point.sy, fx, fy, label, color, strong });
  };
  if (kind === "reaction") {
    for (const load of loads) {
      push(load.nodeId, load.fx, load.fy, load.label ?? `${Math.round(Math.hypot(load.fx, load.fy))}`, "#ff9f1a", true);
    }
    for (const reaction of analysis.reactions) {
      const mag = Math.hypot(reaction.rx, reaction.ry);
      if (mag < 0.05) continue;
      push(reaction.nodeId, reaction.rx, reaction.ry, `반력 ${signed(mag)}`, "#7dff6b", true);
    }
  } else if (nodeId) {
    for (const load of loads) {
      if (load.nodeId !== nodeId) continue;
      push(load.nodeId, load.fx, load.fy, load.label ?? "하중", "#ff9f1a", true);
    }
    const reaction = analysis.reactions.find((item) => item.nodeId === nodeId);
    if (reaction) push(nodeId, reaction.rx, reaction.ry, "반력", "#7dff6b", true);
    const node = model.nodes.find((item) => item.id === nodeId);
    for (const force of analysis.forces) {
      if (!node || (force.i !== nodeId && force.j !== nodeId)) continue;
      const other = model.nodes.find((item) => item.id === (force.i === nodeId ? force.j : force.i));
      if (!other) continue;
      const dx = other.x - node.x;
      const dy = other.y - node.y;
      const span = Math.hypot(dx, dy) || 1;
      const color = force.mode === "compression" ? "#ff5d73" : force.mode === "tension" ? "#4ea2ff" : "#94a3b8";
      if (Math.abs(force.axial) < 0.05) {
        const at = toScreen(node.x + (dx / span) * 0.55, node.y + (dy / span) * 0.55, cam);
        zeros.push({ sx: at.sx, sy: at.sy, label: `${force.name} 0` });
        continue;
      }
      push(nodeId, (force.axial * dx) / span, (force.axial * dy) / span, `${force.name} ${signed(force.axial)}`, color, focusMemberIds?.includes(force.memberId) ?? false);
    }
  }
  const max = Math.max(1, ...arrows.map((arrow) => Math.hypot(arrow.fx, arrow.fy)));
  return (
    <g>
      {arrows.map((arrow, index) => {
        const mag = Math.hypot(arrow.fx, arrow.fy);
        const length = 24 + 58 * (mag / max);
        const ux = arrow.fx / mag;
        const uy = -arrow.fy / mag;
        const x1 = arrow.sx + ux * 18;
        const y1 = arrow.sy + uy * 18;
        const x2 = arrow.sx + ux * (18 + length);
        const y2 = arrow.sy + uy * (18 + length);
        return (
          <g key={`${arrow.label}-${index}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={arrow.color} strokeWidth={arrow.strong ? 4 : 2.5} strokeLinecap="round" />
            <polygon points={arrowHead(x2, y2, ux, uy)} fill={arrow.color} />
            <text x={x2 + ux * 12} y={y2 + uy * 12} textAnchor="middle" fontSize="12" fontWeight="800" fill={arrow.color} stroke="#172033" strokeWidth="3" paintOrder="stroke">
              {arrow.label}
            </text>
          </g>
        );
      })}
      {zeros.map((item) => (
        <text key={item.label} x={item.sx} y={item.sy} textAnchor="middle" fontSize="11" fontWeight="800" fill="#94a3b8" stroke="#172033" strokeWidth="3" paintOrder="stroke">
          {item.label}
        </text>
      ))}
      <text x="24" y="28" fontSize="12" fontWeight="800" fill="#172033">
        {kind === "reaction" ? "주황 하중 · 초록 반력. 화살표는 구조에 작용하는 힘입니다." : "화살표는 이 절점에 작용하는 힘입니다. 파랑 인장, 빨강 압축, 초록 반력, 주황 하중."}
      </text>
    </g>
  );
}

function arrowHead(x: number, y: number, dx: number, dy: number) {
  const leftx = x - dx * 10 - dy * 5;
  const lefty = y - dy * 10 + dx * 5;
  const rightx = x - dx * 10 + dy * 5;
  const righty = y - dy * 10 - dx * 5;
  return `${x},${y} ${leftx},${lefty} ${rightx},${righty}`;
}

function StageCue({
  cue,
  model,
  loads,
  cam,
}: {
  cue: "rock" | "walk" | "car" | "book" | "kids";
  model: Model;
  loads: Load[];
  cam: Camera;
}) {
  if (cue === "car" || cue === "walk" || cue === "kids") {
    const xs = model.nodes.map((node) => node.x);
    const y = Math.min(...model.nodes.map((node) => node.y));
    const from = toScreen(Math.min(...xs), y, cam);
    const to = toScreen(Math.max(...xs), y, cam);
    const people = cue === "kids" ? [0, 0.7, 1.4] : [0];
    return (
      <g>
        {people.map((delay) => (
          <g key={delay}>
            <animateTransform attributeName="transform" type="translate" from={`${from.sx - delay * 36} ${from.sy - 28}`} to={`${to.sx} ${to.sy - 28}`} begin={`${delay}s`} dur={cue === "car" ? "2.6s" : "3.2s"} fill="freeze" />
            {cue === "car" ? (
              <g>
                <rect x="-22" y="-12" width="44" height="16" rx="4" fill="#172033" />
                <circle cx="-12" cy="6" r="4" fill="#ef8a24" />
                <circle cx="12" cy="6" r="4" fill="#ef8a24" />
              </g>
            ) : (
              <g>
                <circle cy="-18" r="6" fill={cue === "kids" ? "#f59e0b" : "#2f6bff"} />
                <line y1="-12" y2="6" stroke="#172033" strokeWidth="3" />
                <line y1="6" x2="-8" y2="16" stroke="#172033" strokeWidth="3" />
                <line y1="6" x2="8" y2="16" stroke="#172033" strokeWidth="3" />
              </g>
            )}
          </g>
        ))}
      </g>
    );
  }
  const targets = (loads.length ? loads : model.loads)
    .map((load) => model.nodes.find((node) => node.id === load.nodeId))
    .filter((node): node is NonNullable<typeof node> => Boolean(node));
  return (
    <g>
      {targets.map((node) => {
        const point = toScreen(node.x, node.y, cam);
        return (
          <g key={node.id}>
            <g>
              <animateTransform attributeName="transform" type="translate" from={`${point.sx} ${point.sy - 90}`} to={`${point.sx} ${point.sy - 18}`} dur="0.9s" fill="freeze" />
              {cue === "book" ? (
                <rect x="-10" y="-14" width="20" height="14" rx="2" fill="#b45309" />
              ) : (
                <circle r="9" fill="#57534e" />
              )}
            </g>
          </g>
        );
      })}
    </g>
  );
}

export function TrussBoard({
  model,
  loads,
  analysis,
  scene = "paper",
  compact = false,
  pendingId,
  cursor,
  tool,
  focusNodeId,
  focusMemberIds,
  focusKind,
  onLeft,
  onRight,
  onMove,
  onRotate,
  cue = null,
  cueKey = 0,
  links = [],
  groupNodeIds = [],
  axisPick = false,
  onMarquee,
  onGroupMove,
  onGroupDrop,
  onAxis,
}: {
  model: Model;
  loads?: Load[];
  analysis: Analysis | null;
  scene?: "paper" | "valley" | "road" | "cliff" | "desk";
  compact?: boolean;
  pendingId: number | null;
  cursor: { x: number; y: number } | null;
  tool: string;
  focusNodeId?: number;
  focusMemberIds?: number[];
  focusKind?: "reaction" | "joint" | "note";
  onLeft: (hit: Hit) => void;
  onRight: (hit: Hit, clientX: number, clientY: number) => void;
  onMove: (point: WorldPoint | null) => void;
  onRotate?: (nodeId: number) => void;
  cue?: "rock" | "walk" | "car" | "book" | "kids" | null;
  cueKey?: number;
  links?: { i: number; j: number }[];
  groupNodeIds?: number[];
  axisPick?: boolean;
  onMarquee?: (nodeIds: number[]) => void;
  onGroupMove?: (dx: number, dy: number) => void;
  onGroupDrop?: () => void;
  onAxis?: (x: number) => void;
}) {
  const drawnLoads = loads ?? model.loads;
  const focusing = Boolean(focusMemberIds && focusMemberIds.length > 0);
  const pending = model.nodes.find((node) => node.id === pendingId);
  const svgRef = useRef<SVGSVGElement>(null);
  const [cam, setCam] = useState<Camera>(HOME_CAMERA);
  const camRef = useRef(cam);
  const drag = useRef<
    | { kind: "pan"; x: number; y: number; cx: number; cy: number; moved: boolean }
    | { kind: "marquee"; x: number; y: number; sx: number; sy: number; moved: boolean }
    | { kind: "group"; x: number; y: number; wx: number; wy: number; moved: boolean }
    | { kind: "erase"; x: number; y: number; moved: boolean }
    | null
  >(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [hover, setHover] = useState<Hit["target"]>(null);
  const [hoverSupport, setHoverSupport] = useState<number | null>(null);
  const hideSupport = useRef<number | null>(null);
  function holdSupport(nodeId: number) {
    if (hideSupport.current) window.clearTimeout(hideSupport.current);
    setHoverSupport(nodeId);
  }
  function releaseSupport() {
    if (hideSupport.current) window.clearTimeout(hideSupport.current);
    hideSupport.current = window.setTimeout(() => setHoverSupport(null), 700);
  }
  useEffect(() => {
    camRef.current = cam;
  }, [cam]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = camRef.current;
      const point = fromClient(svg, event.clientX, event.clientY, current);
      if (!point) return;
      const zoom = clampZoom(current.zoom * (event.deltaY > 0 ? 0.9 : 1.12));
      const scale = SCALE * zoom;
      const next = {
        zoom,
        cx: point.x - (point.sx - VIEW_W / 2) / scale,
        cy: point.y + (point.sy - VIEW_H / 2) / scale,
      };
      camRef.current = next;
      setCam(next);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  function pointFrom(event: { clientX: number; clientY: number }) {
    const svg = svgRef.current;
    if (!svg) return null;
    return fromClient(svg, event.clientX, event.clientY, camRef.current);
  }

  const step = snapStep(cam.zoom);
  const span = VIEW_W / (SCALE * cam.zoom);
  let lineStep = step;
  while (span / lineStep > 48) lineStep *= 2;
  const corners = [0, VIEW_W].flatMap((sx) => [0, VIEW_H].map((sy) => {
    const scale = SCALE * cam.zoom;
    return {
      x: cam.cx + (sx - VIEW_W / 2) / scale,
      y: cam.cy - (sy - VIEW_H / 2) / scale,
    };
  }));
  const minX = Math.max(LIMIT.minX, Math.floor(Math.min(...corners.map((corner) => corner.x)) / lineStep) * lineStep);
  const maxX = Math.min(LIMIT.maxX, Math.ceil(Math.max(...corners.map((corner) => corner.x)) / lineStep) * lineStep);
  const minY = Math.max(LIMIT.minY, Math.floor(Math.min(...corners.map((corner) => corner.y)) / lineStep) * lineStep);
  const maxY = Math.min(LIMIT.maxY, Math.ceil(Math.max(...corners.map((corner) => corner.y)) / lineStep) * lineStep);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let x = minX; x <= maxX + 1e-6; x = quantize(x + lineStep, lineStep)) xs.push(x);
  for (let y = minY; y <= maxY + 1e-6; y = quantize(y + lineStep, lineStep)) ys.push(y);

  return (
    <div className={`board-shell ${compact ? "compact" : ""} ${tool === "select" ? "selecting" : ""}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="트러스 작업판. 선택 도구에서 끌면 묶고, 묶인 절점을 끌면 옮깁니다. 화면 이동은 빈 곳을 끌거나 Shift+끌기, 휠로 확대합니다."
        onPointerDown={(event) => {
          if (event.button !== 0 && event.button !== 1) return;
          const point = pointFrom(event);
          if (!point) return;
          const hit = hitTest(point, model, camRef.current, drawnLoads);
          if (axisPick && event.button === 0 && !event.shiftKey && onAxis) {
            onAxis(point.x);
            return;
          }
          const inGroup =
            (hit.nodeId !== null && groupNodeIds.includes(hit.nodeId)) ||
            (hit.memberId !== null &&
              model.members.some(
                (member) => member.id === hit.memberId && (groupNodeIds.includes(member.i) || groupNodeIds.includes(member.j)),
              ));
          if (tool === "erase" && event.button === 0) {
            try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
              /* synthetic pointers have no active id */
            }
            drag.current = { kind: "erase", x: event.clientX, y: event.clientY, moved: false };
            return;
          }
          if (tool === "select" && event.button === 0 && !event.shiftKey && onMarquee) {
            try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
              /* synthetic pointers have no active id */
            }
            if (inGroup && onGroupMove) {
              drag.current = { kind: "group", x: event.clientX, y: event.clientY, wx: point.x, wy: point.y, moved: false };
              return;
            }
            drag.current = { kind: "marquee", x: event.clientX, y: event.clientY, sx: point.sx, sy: point.sy, moved: false };
            setMarquee({ x: point.sx, y: point.sy, w: 0, h: 0 });
            return;
          }
          if (event.button === 0 && (hit.nodeId || hit.memberId) && !event.shiftKey) return;
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            /* synthetic pointers have no active id */
          }
          drag.current = { kind: "pan", x: event.clientX, y: event.clientY, cx: camRef.current.cx, cy: camRef.current.cy, moved: false };
        }}
        onPointerMove={(event) => {
          const active = drag.current;
          const point = pointFrom(event);
          if (active?.kind === "marquee" && point) {
            if (Math.hypot(event.clientX - active.x, event.clientY - active.y) > 4) active.moved = true;
            setMarquee({
              x: Math.min(active.sx, point.sx),
              y: Math.min(active.sy, point.sy),
              w: Math.abs(point.sx - active.sx),
              h: Math.abs(point.sy - active.sy),
            });
            return;
          }
          if (active?.kind === "group" && point) {
            if (Math.hypot(event.clientX - active.x, event.clientY - active.y) > 4) active.moved = true;
            if (active.moved) onGroupMove?.(point.x - active.wx, point.y - active.wy);
            return;
          }
          if (active?.kind === "erase") {
            if (Math.hypot(event.clientX - active.x, event.clientY - active.y) > 4) active.moved = true;
            return;
          }
          if (active?.kind === "pan") {
            const dx = event.clientX - active.x;
            const dy = event.clientY - active.y;
            if (Math.hypot(dx, dy) > 4) active.moved = true;
            if (active.moved) {
              const svg = svgRef.current;
              const rect = svg?.getBoundingClientRect();
              const pixel = rect && svg ? svg.viewBox.baseVal.width / rect.width : 1;
              const scale = SCALE * camRef.current.zoom;
              const next = {
                zoom: camRef.current.zoom,
                cx: active.cx - (dx * pixel) / scale,
                cy: active.cy + (dy * pixel) / scale,
              };
              camRef.current = next;
              setCam(next);
              return;
            }
          }
          if (point) {
            const next = hitTest(point, model, camRef.current, drawnLoads).target ?? null;
            setHover((current) => (current?.kind === next?.kind && current?.id === next?.id ? current : next));
          }
          onMove(point);
        }}
        onPointerUp={(event) => {
          const active = drag.current;
          drag.current = null;
          setMarquee(null);
          try {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          } catch {
            /* already released */
          }
          const point = pointFrom(event);
          if (active?.kind === "marquee") {
            if (!active.moved || !point) {
              if (event.button === 0 && point) onLeft(hitTest(point, model, camRef.current, drawnLoads));
              return;
            }
            const x1 = Math.min(active.sx, point.sx);
            const x2 = Math.max(active.sx, point.sx);
            const y1 = Math.min(active.sy, point.sy);
            const y2 = Math.max(active.sy, point.sy);
            const ids = model.nodes
              .filter((node) => {
                const screen = toScreen(node.x, node.y, camRef.current);
                return screen.sx >= x1 && screen.sx <= x2 && screen.sy >= y1 && screen.sy <= y2;
              })
              .map((node) => node.id);
            onMarquee?.(ids);
            return;
          }
          if (active?.kind === "erase") {
            if (!active.moved && event.button === 0 && point) onLeft(hitTest(point, model, camRef.current, drawnLoads));
            return;
          }
          if (active?.kind === "group") {
            onGroupDrop?.();
            if (!active.moved && event.button === 0 && point) onLeft(hitTest(point, model, camRef.current, drawnLoads));
            return;
          }
          if (active?.moved) return;
          if (event.button !== 0) return;
          if (!point) return;
          onLeft(hitTest(point, model, camRef.current, drawnLoads));
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          const point = pointFrom(event);
          if (!point) return;
          onRight(hitTest(point, model, camRef.current, drawnLoads), event.clientX, event.clientY);
        }}
        onPointerLeave={() => {
          setHover(null);
          if (!drag.current) onMove(null);
        }}
      >
        <defs>
          <filter id="hover-neon" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor="#ffe14a" floodOpacity="0.95" />
          </filter>
        </defs>
        <Scene scene={scene} cam={cam} />
        {xs.map((x) => {
          const a = toScreen(x, minY, cam);
          const b = toScreen(x, maxY, cam);
          return <line key={`vx${x}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="rgba(23,32,51,0.1)" />;
        })}
        {ys.map((y) => {
          const a = toScreen(minX, y, cam);
          const b = toScreen(maxX, y, cam);
          return <line key={`hy${y}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="rgba(23,32,51,0.1)" />;
        })}
        {xs.filter((x) => Math.abs(x - Math.round(x)) < 0.001).map((x) => (
          <text key={`lx${x}`} x={toScreen(x, 0, cam).sx} y={VIEW_H - 18} textAnchor="middle" fontSize="11" fill="#8b97a8">
            {x}
          </text>
        ))}

        {links.map((link) => {
          const a = model.nodes.find((node) => node.id === link.i);
          const b = model.nodes.find((node) => node.id === link.j);
          if (!a || !b) return null;
          const as = toScreen(a.x, a.y, cam);
          const bs = toScreen(b.x, b.y, cam);
          return (
            <g key={`need-${link.i}-${link.j}`}>
              <line x1={as.sx} y1={as.sy} x2={bs.sx} y2={bs.sy} stroke="#d97706" strokeWidth="3" strokeDasharray="7 6" />
              <text x={(as.sx + bs.sx) / 2} y={(as.sy + bs.sy) / 2 - 10} textAnchor="middle" fontSize="12" fontWeight="800" fill="#b45309">
                이어야 함
              </text>
            </g>
          );
        })}

        {model.members.map((member) => {
          const a = model.nodes.find((node) => node.id === member.i);
          const b = model.nodes.find((node) => node.id === member.j);
          if (!a || !b) return null;
          const as = toScreen(a.x, a.y, cam);
          const bs = toScreen(b.x, b.y, cam);
          const force = analysis?.forces.find((item) => item.memberId === member.id);
          const material = materialById(member.materialId);
          const color = force
            ? force.mode === "tension"
              ? "#2a62ea"
              : force.mode === "compression"
                ? "#e23b4a"
                : "#94a3b8"
            : material?.color ?? "#334155";
          const dim = focusing && !focusMemberIds?.includes(member.id);
          const grouped = groupNodeIds.includes(member.i) && groupNodeIds.includes(member.j);
          const aimed = hover?.kind === "member" && hover.id === member.id;
          const mid = { x: (as.sx + bs.sx) / 2, y: (as.sy + bs.sy) / 2 };
          const dx = bs.sx - as.sx;
          const dy = bs.sy - as.sy;
          const len = Math.hypot(dx, dy) || 1;
          const ox = (-dy / len) * 14;
          const oy = (dx / len) * 14;
          return (
            <g key={member.id} opacity={dim ? 0.28 : 1}>
              {grouped ? (
                <line x1={as.sx} y1={as.sy} x2={bs.sx} y2={bs.sy} stroke="#7aa2ff" strokeWidth="12" strokeLinecap="round" />
              ) : null}
              {aimed ? (
                <line x1={as.sx} y1={as.sy} x2={bs.sx} y2={bs.sy} stroke="#ffe14a" strokeWidth="10" strokeLinecap="round" filter="url(#hover-neon)" />
              ) : null}
              <line
                x1={as.sx}
                y1={as.sy}
                x2={bs.sx}
                y2={bs.sy}
                stroke={color}
                strokeWidth={force?.over ? 7 : 4.5}
                strokeLinecap="round"
                strokeDasharray={force?.over ? "7 6" : undefined}
              />
              {force && force.mode !== "zero" && analysis && analysis.status !== "unstable" ? (
                <text
                  x={mid.x + ox}
                  y={mid.y + oy}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="800"
                  fill={color}
                  stroke="white"
                  strokeWidth="4"
                  paintOrder="stroke"
                >
                  {signed(force.axial)}
                </text>
              ) : null}
            </g>
          );
        })}

        {pending && cursor && tool === "member" ? (
          <line
            x1={toScreen(pending.x, pending.y, cam).sx}
            y1={toScreen(pending.x, pending.y, cam).sy}
            x2={toScreen(cursor.x, cursor.y, cam).sx}
            y2={toScreen(cursor.x, cursor.y, cam).sy}
            stroke="#2f6bff"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
        ) : null}

        {model.supports.map((support) => {
          const node = model.nodes.find((item) => item.id === support.nodeId);
          if (!node) return null;
          const p = toScreen(node.x, node.y, cam);
          const turnable = Boolean(onRotate) && canTurn(support.type);
          return (
            <g
              key={`s${support.nodeId}`}
              onPointerEnter={turnable ? () => holdSupport(support.nodeId) : undefined}
              onPointerLeave={turnable ? releaseSupport : undefined}
            >
              <SupportGlyph sx={p.sx} sy={p.sy} type={support.type} angle={support.angle} hot={turnable} outline={hover?.kind === "support" && hover.id === support.nodeId} />
            </g>
          );
        })}

        {drawnLoads.map((load, index) => {
          const node = model.nodes.find((item) => item.id === load.nodeId);
          if (!node) return null;
          const p = toScreen(node.x, node.y, cam);
          return <LoadArrow key={`l${load.nodeId}-${index}`} load={load} sx={p.sx} sy={p.sy} outline={hover?.kind === "load" && hover.id === load.nodeId} />;
        })}
        {cue ? <StageCue key={cueKey} cue={cue} model={model} loads={drawnLoads} cam={cam} /> : null}

        {marquee ? <rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="rgba(47,107,255,0.12)" stroke="#2f6bff" strokeDasharray="4 3" /> : null}
        {axisPick && cursor ? (
          <line x1={toScreen(cursor.x, minY, cam).sx} y1={toScreen(cursor.x, minY, cam).sy} x2={toScreen(cursor.x, maxY, cam).sx} y2={toScreen(cursor.x, maxY, cam).sy} stroke="#2f6bff" strokeWidth="2" strokeDasharray="5 4" />
        ) : null}
        {tool === "node" && cursor ? (
          <circle
            cx={toScreen(clampGrid(cursor.x, cursor.y, cam.zoom).x, clampGrid(cursor.x, cursor.y, cam.zoom).y, cam).sx}
            cy={toScreen(clampGrid(cursor.x, cursor.y, cam.zoom).x, clampGrid(cursor.x, cursor.y, cam.zoom).y, cam).sy}
            r="7"
            fill="rgba(47,107,255,0.16)"
            stroke="#2f6bff"
          />
        ) : null}

        {model.nodes.map((node) => {
          const p = toScreen(node.x, node.y, cam);
          const on = node.id === focusNodeId || node.id === pendingId || groupNodeIds.includes(node.id);
          return (
            <g key={node.id}>
              {hover?.kind === "node" && hover.id === node.id ? (
                <circle cx={p.sx} cy={p.sy} r={on ? 17 : 14} fill="none" stroke="#ffe14a" strokeWidth="4" filter="url(#hover-neon)" />
              ) : null}
              <circle cx={p.sx} cy={p.sy} r={on ? 12 : 9} fill="white" stroke={on ? "#2f6bff" : "#172033"} strokeWidth="2.2" />
              <text x={p.sx} y={p.sy + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#172033">
                {nodeLabel(model.nodes, node.id)}
              </text>
            </g>
          );
        })}

        {analysis && (focusKind === "reaction" || focusKind === "joint") ? (
          <JointDiagram
            model={model}
            analysis={analysis}
            cam={cam}
            kind={focusKind}
            nodeId={focusNodeId}
            loads={drawnLoads}
            focusMemberIds={focusMemberIds}
          />
        ) : null}

        {onRotate && hoverSupport !== null
          ? model.supports
              .filter((support) => support.nodeId === hoverSupport && canTurn(support.type))
              .map((support) => {
                const node = model.nodes.find((item) => item.id === support.nodeId);
                if (!node) return null;
                const p = toScreen(node.x, node.y, cam);
                return (
                  <RotateChip
                    key={`turn-${support.nodeId}`}
                    sx={p.sx}
                    sy={p.sy}
                    angle={supportAngle(support)}
                    onHold={() => holdSupport(support.nodeId)}
                    onRelease={releaseSupport}
                    onRotate={() => onRotate(support.nodeId)}
                  />
                );
              })
          : null}
      </svg>
      <ZoomBar
        zoom={cam.zoom}
        step={step}
        onZoom={(next) => setCam((current) => ({ ...current, zoom: clampZoom(next) }))}
        onReset={() => setCam(HOME_CAMERA)}
      />
    </div>
  );
}
