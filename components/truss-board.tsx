"use client";

import { useRef } from "react";
import { nodeLabel } from "@/lib/analyze";
import { materialById } from "@/lib/materials";
import { signed } from "@/lib/format";
import type { Analysis, Load, Model, SupportType } from "@/lib/types";

export const PAD = 54;
export const SCALE = 68;
export const WORLD_W = 12;
export const WORLD_H = 8;
export const VIEW_W = PAD * 2 + WORLD_W * SCALE;
export const VIEW_H = PAD * 2 + WORLD_H * SCALE;

export type WorldPoint = { x: number; y: number; sx: number; sy: number };

export function toScreen(x: number, y: number) {
  return { sx: PAD + x * SCALE, sy: VIEW_H - PAD - y * SCALE };
}

export function fromClient(svg: SVGSVGElement, clientX: number, clientY: number): WorldPoint | null {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const mapped = point.matrixTransform(ctm.inverse());
  return {
    x: (mapped.x - PAD) / SCALE,
    y: (VIEW_H - PAD - mapped.y) / SCALE,
    sx: mapped.x,
    sy: mapped.y,
  };
}

export function snap(value: number) {
  return Math.round(value * 2) / 2;
}

export function clampGrid(x: number, y: number) {
  return {
    x: Math.min(WORLD_W, Math.max(0, snap(x))),
    y: Math.min(WORLD_H, Math.max(0, snap(y))),
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
  world: { x: number; y: number } | null;
  grid: { x: number; y: number } | null;
};

export function hitTest(point: WorldPoint, model: Model): Hit {
  const grid = point.x >= -0.35 && point.x <= WORLD_W + 0.35 && point.y >= -0.35 && point.y <= WORLD_H + 0.35
    ? clampGrid(point.x, point.y)
    : null;
  let nodeId: number | null = null;
  let best = 18;
  for (const node of model.nodes) {
    const screen = toScreen(node.x, node.y);
    const d = Math.hypot(point.sx - screen.sx, point.sy - screen.sy);
    if (d < best) {
      best = d;
      nodeId = node.id;
    }
  }
  let memberId: number | null = null;
  if (!nodeId) {
    let memberBest = 12;
    for (const member of model.members) {
      const a = model.nodes.find((node) => node.id === member.i);
      const b = model.nodes.find((node) => node.id === member.j);
      if (!a || !b) continue;
      const as = toScreen(a.x, a.y);
      const bs = toScreen(b.x, b.y);
      const d = distToSegment(point.sx, point.sy, as.sx, as.sy, bs.sx, bs.sy);
      if (d < memberBest) {
        memberBest = d;
        memberId = member.id;
      }
    }
  }
  return { nodeId, memberId, world: { x: point.x, y: point.y }, grid };
}

function Scene({ scene }: { scene: "paper" | "valley" | "road" | "cliff" | "desk" }) {
  if (scene === "valley") {
    return (
      <g>
        <rect width={VIEW_W} height={VIEW_H} fill="#e7f3ea" />
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
        <rect width={VIEW_W} height={VIEW_H} fill="#e7f2fb" />
        <rect x="0" y={VIEW_H - 118} width={VIEW_W} height="46" fill="#d7c4a2" />
        <rect x="0" y={VIEW_H - 78} width={VIEW_W} height="78" fill="#4e5966" />
        <line x1="30" y1={VIEW_H - 40} x2={VIEW_W - 30} y2={VIEW_H - 40} stroke="rgba(255,255,255,0.75)" strokeWidth="4" strokeDasharray="22 16" />
      </g>
    );
  }
  if (scene === "cliff") {
    return (
      <g>
        <rect width={VIEW_W} height={VIEW_H} fill="#e7f1f6" />
        <path d={`M0 0 H150 L120 180 L160 300 L110 460 L150 ${VIEW_H} H0 Z`} fill="#8d8478" />
        <path d={`M150 ${VIEW_H * 0.62} C 360 ${VIEW_H * 0.5}, 640 ${VIEW_H * 0.7}, ${VIEW_W} ${VIEW_H * 0.56} L ${VIEW_W} ${VIEW_H} L 150 ${VIEW_H} Z`} fill="#d5e4ea" />
      </g>
    );
  }
  if (scene === "desk") {
    return (
      <g>
        <rect width={VIEW_W} height={VIEW_H} fill="#f6f1e7" />
        <rect x="36" y={VIEW_H - 150} width={VIEW_W - 72} height="92" rx="8" fill="#e7d3ae" />
        <rect x="70" y={VIEW_H - 58} width="16" height="58" fill="#c4a574" />
        <rect x={VIEW_W - 86} y={VIEW_H - 58} width="16" height="58" fill="#c4a574" />
      </g>
    );
  }
  return <rect width={VIEW_W} height={VIEW_H} fill="#f7f8fb" />;
}

function SupportGlyph({ x, y, type }: { x: number; y: number; type: SupportType }) {
  const p = toScreen(x, y);
  if (type === "rollerX") {
    return (
      <g>
        <polygon points={`${p.sx - 8},${p.sy} ${p.sx - 24},${p.sy - 11} ${p.sx - 24},${p.sy + 11}`} fill="#172033" />
        <circle cx={p.sx - 30} cy={p.sy - 6} r="3.2" fill="none" stroke="#172033" strokeWidth="1.6" />
        <circle cx={p.sx - 30} cy={p.sy + 6} r="3.2" fill="none" stroke="#172033" strokeWidth="1.6" />
      </g>
    );
  }
  return (
    <g>
      <polygon points={`${p.sx},${p.sy + 7} ${p.sx - 11},${p.sy + 24} ${p.sx + 11},${p.sy + 24}`} fill="#172033" />
      {type === "rollerY" ? (
        <g>
          <circle cx={p.sx - 6} cy={p.sy + 30} r="3.2" fill="none" stroke="#172033" strokeWidth="1.6" />
          <circle cx={p.sx + 6} cy={p.sy + 30} r="3.2" fill="none" stroke="#172033" strokeWidth="1.6" />
        </g>
      ) : (
        <line x1={p.sx - 14} y1={p.sy + 28} x2={p.sx + 14} y2={p.sy + 28} stroke="#172033" strokeWidth="1.6" />
      )}
    </g>
  );
}

function LoadArrow({ load, x, y }: { load: Load; x: number; y: number }) {
  const mag = Math.hypot(load.fx, load.fy);
  if (mag < 0.05) return null;
  const p = toScreen(x, y);
  const sdx = load.fx / mag;
  const sdy = -load.fy / mag;
  const endx = p.sx - sdx * 16;
  const endy = p.sy - sdy * 16;
  const startx = p.sx - sdx * 48;
  const starty = p.sy - sdy * 48;
  const label = load.label ?? `${Math.round(mag)}N`;
  return (
    <g>
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

function arrowHead(x: number, y: number, dx: number, dy: number) {
  const leftx = x - dx * 10 - dy * 5;
  const lefty = y - dy * 10 + dx * 5;
  const rightx = x - dx * 10 + dy * 5;
  const righty = y - dy * 10 - dx * 5;
  return `${x},${y} ${leftx},${lefty} ${rightx},${righty}`;
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
  onLeft,
  onRight,
  onMove,
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
  onLeft: (hit: Hit) => void;
  onRight: (hit: Hit, clientX: number, clientY: number) => void;
  onMove: (point: WorldPoint | null) => void;
}) {
  const drawnLoads = loads ?? model.loads;
  const focusing = Boolean(focusMemberIds && focusMemberIds.length > 0);
  const pending = model.nodes.find((node) => node.id === pendingId);
  const svgRef = useRef<SVGSVGElement>(null);

  function pointFrom(event: { clientX: number; clientY: number }) {
    const svg = svgRef.current;
    if (!svg) return null;
    return fromClient(svg, event.clientX, event.clientY);
  }

  return (
    <div className={`board-shell ${compact ? "compact" : ""} ${tool === "select" ? "grab" : ""}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="트러스 작업판"
        onClick={(event) => {
          const point = pointFrom(event);
          if (!point) return;
          onLeft(hitTest(point, model));
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          const point = pointFrom(event);
          if (!point) return;
          onRight(hitTest(point, model), event.clientX, event.clientY);
        }}
        onMouseMove={(event) => onMove(pointFrom(event))}
        onMouseLeave={() => onMove(null)}
      >
        <Scene scene={scene} />
        {Array.from({ length: WORLD_W + 1 }, (_, x) => (
          <line key={`vx${x}`} x1={PAD + x * SCALE} y1={PAD} x2={PAD + x * SCALE} y2={VIEW_H - PAD} stroke="rgba(23,32,51,0.08)" />
        ))}
        {Array.from({ length: WORLD_H + 1 }, (_, y) => (
          <line key={`hy${y}`} x1={PAD} y1={PAD + y * SCALE} x2={VIEW_W - PAD} y2={PAD + y * SCALE} stroke="rgba(23,32,51,0.08)" />
        ))}
        {Array.from({ length: WORLD_W + 1 }, (_, x) =>
          x % 2 === 0 ? (
            <text key={`lx${x}`} x={PAD + x * SCALE} y={VIEW_H - 28} textAnchor="middle" fontSize="11" fill="#8b97a8">
              {x}
            </text>
          ) : null,
        )}

        {model.members.map((member) => {
          const a = model.nodes.find((node) => node.id === member.i);
          const b = model.nodes.find((node) => node.id === member.j);
          if (!a || !b) return null;
          const as = toScreen(a.x, a.y);
          const bs = toScreen(b.x, b.y);
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
          const mid = { x: (as.sx + bs.sx) / 2, y: (as.sy + bs.sy) / 2 };
          const dx = bs.sx - as.sx;
          const dy = bs.sy - as.sy;
          const len = Math.hypot(dx, dy) || 1;
          const ox = (-dy / len) * 14;
          const oy = (dx / len) * 14;
          return (
            <g key={member.id} opacity={dim ? 0.28 : 1}>
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
            x1={toScreen(pending.x, pending.y).sx}
            y1={toScreen(pending.x, pending.y).sy}
            x2={toScreen(cursor.x, cursor.y).sx}
            y2={toScreen(cursor.x, cursor.y).sy}
            stroke="#2f6bff"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
        ) : null}

        {model.supports.map((support) => {
          const node = model.nodes.find((item) => item.id === support.nodeId);
          if (!node) return null;
          return <SupportGlyph key={`s${support.nodeId}`} x={node.x} y={node.y} type={support.type} />;
        })}

        {drawnLoads.map((load, index) => {
          const node = model.nodes.find((item) => item.id === load.nodeId);
          if (!node) return null;
          return <LoadArrow key={`l${load.nodeId}-${index}`} load={load} x={node.x} y={node.y} />;
        })}

        {tool === "node" && cursor ? (
          <circle
            cx={toScreen(clampGrid(cursor.x, cursor.y).x, clampGrid(cursor.x, cursor.y).y).sx}
            cy={toScreen(clampGrid(cursor.x, cursor.y).x, clampGrid(cursor.x, cursor.y).y).sy}
            r="7"
            fill="rgba(47,107,255,0.16)"
            stroke="#2f6bff"
          />
        ) : null}

        {model.nodes.map((node) => {
          const p = toScreen(node.x, node.y);
          const on = node.id === focusNodeId || node.id === pendingId;
          return (
            <g key={node.id}>
              <circle cx={p.sx} cy={p.sy} r={on ? 12 : 9} fill="white" stroke={on ? "#2f6bff" : "#172033"} strokeWidth="2.2" />
              <text x={p.sx} y={p.sy + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#172033">
                {nodeLabel(model.nodes, node.id)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
