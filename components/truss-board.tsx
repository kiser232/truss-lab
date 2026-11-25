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
  world: { x: number; y: number } | null;
  grid: { x: number; y: number } | null;
  ground?: { x: number; z: number } | null;
};

export function hitTest(point: WorldPoint, model: Model, cam: Camera = HOME_CAMERA): Hit {
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
  let memberId: number | null = null;
  if (!nodeId) {
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
  }
  return { nodeId, memberId, world: { x: point.x, y: point.y }, grid };
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

function SupportGlyph({ sx, sy, type, angle, hot }: { sx: number; sy: number; type: SupportType; angle?: number; hot?: boolean }) {
  const turn = supportAngle({ type, angle });
  const roller = type === "rollerY" || type === "rollerX";
  return (
    <g transform={`rotate(${turn} ${sx} ${sy})`}>
      {hot ? <circle cx={sx} cy={sy + 18} r="24" fill="transparent" /> : null}
      <polygon points={`${sx},${sy + 7} ${sx - 11},${sy + 24} ${sx + 11},${sy + 24}`} fill="#172033" />
      {roller ? (
        <g>
          <circle cx={sx - 6} cy={sy + 30} r="3.2" fill="none" stroke="#172033" strokeWidth="1.6" />
          <circle cx={sx + 6} cy={sy + 30} r="3.2" fill="none" stroke="#172033" strokeWidth="1.6" />
        </g>
      ) : (
        <line x1={sx - 14} y1={sy + 28} x2={sx + 14} y2={sy + 28} stroke="#172033" strokeWidth="1.6" />
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

function LoadArrow({ load, sx, sy }: { load: Load; sx: number; sy: number }) {
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

function StageCue({
  cue,
  model,
  loads,
  cam,
  path,
}: {
  cue: "rock" | "walk" | "car" | "book" | "kids";
  model: Model;
  loads: Load[];
  cam: Camera;
  path?: number[];
}) {
  if (cue === "kids" && path && path.length > 1) {
    const points = path
      .map((id) => model.nodes.find((node) => node.id === id))
      .filter((node): node is NonNullable<typeof node> => Boolean(node))
      .map((node) => toScreen(node.x, node.y, cam));
    if (points.length > 1) {
      const d = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.sx},${point.sy - 30}`).join(" ");
      const shirts = ["#2f6bff", "#e23b4a", "#16a34a"];
      return (
        <g>
          {shirts.map((shirt, index) => (
            <g key={shirt}>
              <animateMotion dur="3.4s" begin={`${index * 0.55}s`} fill="freeze" path={d} />
              <circle cy="-14" r="6" fill="#f6d7b8" />
              <rect x="-7" y="-8" width="14" height="12" rx="3" fill={shirt} />
              <line y1="4" x2="-7" y2="16" stroke="#172033" strokeWidth="2.5" />
              <line y1="4" x2="7" y2="16" stroke="#172033" strokeWidth="2.5" />
            </g>
          ))}
        </g>
      );
    }
  }
  if (cue === "car" || cue === "walk") {
    const xs = model.nodes.map((node) => node.x);
    const y = Math.min(...model.nodes.map((node) => node.y));
    const from = toScreen(Math.min(...xs), y, cam);
    const to = toScreen(Math.max(...xs), y, cam);
    return (
      <g>
        <g>
          <animateTransform attributeName="transform" type="translate" from={`${from.sx} ${from.sy - 28}`} to={`${to.sx} ${to.sy - 28}`} dur={cue === "car" ? "2.6s" : "2.2s"} fill="freeze" />
          {cue === "car" ? (
            <g>
              <rect x="-22" y="-12" width="44" height="16" rx="4" fill="#172033" />
              <circle cx="-12" cy="6" r="4" fill="#ef8a24" />
              <circle cx="12" cy="6" r="4" fill="#ef8a24" />
            </g>
          ) : (
            <g>
              <circle cy="-16" r="6" fill="#2f6bff" />
              <line y1="-10" y2="8" stroke="#172033" strokeWidth="3" />
              <line y1="8" x2="-8" y2="18" stroke="#172033" strokeWidth="3" />
              <line y1="8" x2="8" y2="18" stroke="#172033" strokeWidth="3" />
            </g>
          )}
        </g>
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
  onLeft,
  onRight,
  onMove,
  onRotate,
  cue = null,
  cueKey = 0,
  required = [],
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
  onRotate?: (nodeId: number) => void;
  cue?: "rock" | "walk" | "car" | "book" | "kids" | null;
  cueKey?: number;
  required?: [number, number][];
}) {
  const drawnLoads = loads ?? model.loads;
  const focusing = Boolean(focusMemberIds && focusMemberIds.length > 0);
  const pending = model.nodes.find((node) => node.id === pendingId);
  const svgRef = useRef<SVGSVGElement>(null);
  const [cam, setCam] = useState<Camera>(HOME_CAMERA);
  const camRef = useRef(cam);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
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
    <div className={`board-shell ${compact ? "compact" : ""} ${tool === "select" ? "grab" : ""}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="트러스 작업판. 휠로 확대하고, 빈 곳을 끌면 이동합니다."
        onPointerDown={(event) => {
          if (event.button !== 0 && event.button !== 1) return;
          const point = pointFrom(event);
          if (!point) return;
          const hit = hitTest(point, model, camRef.current);
          if (event.button === 0 && (hit.nodeId || hit.memberId) && !event.shiftKey) return;
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            /* synthetic pointers have no active id */
          }
          drag.current = { x: event.clientX, y: event.clientY, cx: camRef.current.cx, cy: camRef.current.cy, moved: false };
        }}
        onPointerMove={(event) => {
          const active = drag.current;
          if (active) {
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
          onMove(pointFrom(event));
        }}
        onPointerUp={(event) => {
          const active = drag.current;
          drag.current = null;
          try {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          } catch {
            /* already released */
          }
          if (active?.moved) return;
          if (event.button !== 0) return;
          const point = pointFrom(event);
          if (!point) return;
          onLeft(hitTest(point, model, camRef.current));
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          const point = pointFrom(event);
          if (!point) return;
          onRight(hitTest(point, model, camRef.current), event.clientX, event.clientY);
        }}
        onPointerLeave={() => {
          if (!drag.current) onMove(null);
        }}
      >
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
              <SupportGlyph sx={p.sx} sy={p.sy} type={support.type} angle={support.angle} hot={turnable} />
            </g>
          );
        })}

        {drawnLoads.map((load, index) => {
          const node = model.nodes.find((item) => item.id === load.nodeId);
          if (!node) return null;
          const p = toScreen(node.x, node.y, cam);
          return <LoadArrow key={`l${load.nodeId}-${index}`} load={load} sx={p.sx} sy={p.sy} />;
        })}
        {required.map(([fromId, toId]) => {
          const joined = model.members.some(
            (member) => (member.i === fromId && member.j === toId) || (member.i === toId && member.j === fromId),
          );
          if (joined) return null;
          const from = model.nodes.find((node) => node.id === fromId);
          const to = model.nodes.find((node) => node.id === toId);
          if (!from || !to) return null;
          const a = toScreen(from.x, from.y, cam);
          const b = toScreen(to.x, to.y, cam);
          return (
            <g key={`need-${fromId}-${toId}`}>
              <line x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="#d97706" strokeWidth="3" strokeDasharray="7 6" />
              <text x={(a.sx + b.sx) / 2} y={(a.sy + b.sy) / 2 - 8} textAnchor="middle" fontSize="11" fontWeight="800" fill="#d97706">
                이어야 함
              </text>
            </g>
          );
        })}
        {cue ? (
          <StageCue
            key={cueKey}
            cue={cue}
            model={model}
            loads={drawnLoads}
            cam={cam}
            path={required.length ? [required[0][0], ...required.map((pair) => pair[1])] : undefined}
          />
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
