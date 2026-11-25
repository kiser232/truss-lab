"use client";

import { useEffect, useRef, useState } from "react";
import { nodeLabel } from "@/lib/analyze";
import { signed } from "@/lib/format";
import { materialById } from "@/lib/materials";
import { clampZoom, quantize, snapStep } from "@/lib/view";
import type { Analysis, Model, SupportType } from "@/lib/types";
import { canTurn, supportAngle } from "@/lib/support";
import type { Hit } from "./truss-board";
import { RotateChip, VIEW_H, VIEW_W } from "./truss-board";
import { ZoomBar } from "./zoom-bar";

const SCALE = 42;
const ORIGIN_X = VIEW_W / 2;
const ORIGIN_Y = VIEW_H * 0.62;
const X0 = -16;
const X1 = 24;
const Z0 = -16;
const Z1 = 16;

type Camera = { yaw: number; pitch: number; zoom: number; panX: number; panY: number };
const HOME: Camera = { yaw: -0.7, pitch: 0.62, zoom: 1, panX: 0, panY: 0 };

type ScreenPoint = { sx: number; sy: number; depth: number };

function project(x: number, y: number, z: number, camera: Camera): ScreenPoint {
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const x1 = x * cosYaw - z * sinYaw;
  const z1 = x * sinYaw + z * cosYaw;
  const y2 = y * Math.cos(camera.pitch) - z1 * Math.sin(camera.pitch);
  const depth = y * Math.sin(camera.pitch) + z1 * Math.cos(camera.pitch);
  const scale = SCALE * camera.zoom;
  return { sx: ORIGIN_X + camera.panX + x1 * scale, sy: ORIGIN_Y + camera.panY - y2 * scale, depth };
}

function groundAt(sx: number, sy: number, camera: Camera) {
  const scale = SCALE * camera.zoom;
  const x1 = (sx - ORIGIN_X - camera.panX) / scale;
  const y2 = (ORIGIN_Y + camera.panY - sy) / scale;
  const sinPitch = Math.sin(camera.pitch);
  if (Math.abs(sinPitch) < 0.08) return null;
  const z1 = -y2 / sinPitch;
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  return { x: x1 * cosYaw + z1 * sinYaw, z: -x1 * sinYaw + z1 * cosYaw };
}

function snapGround(point: { x: number; z: number } | null, zoom: number) {
  if (!point) return null;
  const step = snapStep(zoom);
  const x = quantize(point.x, step);
  const z = quantize(point.z, step);
  if (x < X0 || x > X1 || z < Z0 || z > Z1) return null;
  return { x, z };
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len < 1e-6 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function SpaceBoard({
  model,
  analysis,
  pendingId,
  tool,
  compact = false,
  placeY = null,
  focusNodeId,
  focusMemberIds,
  onLeft,
  onRight,
  onRotate,
  required = [],
}: {
  model: Model;
  analysis: Analysis | null;
  pendingId: number | null;
  tool: string;
  compact?: boolean;
  placeY?: number | null;
  focusNodeId?: number;
  focusMemberIds?: number[];
  onLeft: (hit: Hit) => void;
  onRight: (hit: Hit, clientX: number, clientY: number) => void;
  onRotate?: (nodeId: number) => void;
  required?: [number, number][];
}) {
  const [camera, setCamera] = useState<Camera>(HOME);
  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number; panX: number; panY: number; moved: boolean; pan: boolean } | null>(null);
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
  const [hover, setHover] = useState<{ x: number; z: number } | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = cameraRef.current;
      const zoom = clampZoom(current.zoom * (event.deltaY > 0 ? 0.9 : 1.12));
      const local = localOf(svg, event.clientX, event.clientY);
      const ground = local ? groundAt(local.x, local.y, current) : null;
      let next: Camera = { ...current, zoom };
      if (local && ground && ground.x >= X0 - 8 && ground.x <= X1 + 8 && ground.z >= Z0 - 8 && ground.z <= Z1 + 8) {
        const cosYaw = Math.cos(current.yaw);
        const sinYaw = Math.sin(current.yaw);
        const x1 = ground.x * cosYaw - ground.z * sinYaw;
        const z1 = ground.x * sinYaw + ground.z * cosYaw;
        const y2 = -z1 * Math.sin(current.pitch);
        const scale = SCALE * zoom;
        next = {
          ...current,
          zoom,
          panX: local.x - ORIGIN_X - x1 * scale,
          panY: local.y - ORIGIN_Y + y2 * scale,
        };
      }
      cameraRef.current = next;
      setCamera(next);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  function localOf(svg: SVGSVGElement, clientX: number, clientY: number) {
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const local = point.matrixTransform(matrix.inverse());
    return { x: local.x, y: local.y };
  }

  function identify(local: { x: number; y: number }): Hit {
    const cam = cameraRef.current;
    const empty: Hit = { nodeId: null, memberId: null, world: null, grid: null, ground: null };
    let nodeId: number | null = null;
    let best = 16;
    for (const node of model.nodes) {
      const screen = project(node.x, node.y, node.z ?? 0, cam);
      const distance = Math.hypot(local.x - screen.sx, local.y - screen.sy);
      if (distance < best) {
        best = distance;
        nodeId = node.id;
      }
    }
    if (nodeId !== null) return { ...empty, nodeId };
    let memberId: number | null = null;
    let memberDistance = 12;
    for (const member of model.members) {
      const a = model.nodes.find((node) => node.id === member.i);
      const b = model.nodes.find((node) => node.id === member.j);
      if (!a || !b) continue;
      const p = project(a.x, a.y, a.z ?? 0, cam);
      const q = project(b.x, b.y, b.z ?? 0, cam);
      const distance = distToSegment(local.x, local.y, p.sx, p.sy, q.sx, q.sy);
      if (distance < memberDistance) {
        memberDistance = distance;
        memberId = member.id;
      }
    }
    if (memberId !== null) return { ...empty, memberId };
    const ground = snapGround(groundAt(local.x, local.y, cam), cam.zoom);
    return { ...empty, ground };
  }

  const step = snapStep(camera.zoom);
  const seen: { x: number; z: number }[] = [];
  for (let sx = 0; sx <= VIEW_W; sx += VIEW_W / 8) {
    for (let sy = VIEW_H * 0.2; sy <= VIEW_H; sy += VIEW_H / 8) {
      const ground = groundAt(sx, sy, camera);
      if (!ground) continue;
      if (ground.x < X0 - 1 || ground.x > X1 + 1 || ground.z < Z0 - 1 || ground.z > Z1 + 1) continue;
      seen.push(ground);
    }
  }
  const pad = step * 2;
  const minX = seen.length ? Math.max(X0, Math.min(...seen.map((point) => point.x)) - pad) : X0;
  const maxX = seen.length ? Math.min(X1, Math.max(...seen.map((point) => point.x)) + pad) : X1;
  const minZ = seen.length ? Math.max(Z0, Math.min(...seen.map((point) => point.z)) - pad) : Z0;
  const maxZ = seen.length ? Math.min(Z1, Math.max(...seen.map((point) => point.z)) + pad) : Z1;
  const span = Math.max(maxX - minX, maxZ - minZ, step);
  let lineStep = step;
  while (span / lineStep > 42) lineStep *= 2;
  const xLines: number[] = [];
  const zLines: number[] = [];
  for (let x = quantize(Math.ceil(minX / lineStep) * lineStep, lineStep); x <= maxX + 1e-6; x = quantize(x + lineStep, lineStep)) xLines.push(x);
  for (let z = quantize(Math.ceil(minZ / lineStep) * lineStep, lineStep); z <= maxZ + 1e-6; z = quantize(z + lineStep, lineStep)) zLines.push(z);
  const pending = model.nodes.find((node) => node.id === pendingId);
  const showForces = analysis && analysis.status !== "unstable" && analysis.status !== "invalid" && analysis.status !== "empty";

  return (
    <div className={`board-shell ${compact ? "compact" : ""}`}>
      <svg
        ref={svgRef}
        className="space-board"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="공간 트러스 작업판. 빈 곳을 끌면 회전하고, 휠로 확대합니다."
        onPointerDown={(event) => {
          if (event.button !== 0 && event.button !== 1) return;
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            yaw: camera.yaw,
            pitch: camera.pitch,
            panX: camera.panX,
            panY: camera.panY,
            moved: false,
            pan: event.button === 1 || event.shiftKey,
          };
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            /* synthetic pointers have no active id */
          }
        }}
        onPointerMove={(event) => {
          const svg = svgRef.current;
          const local = svg ? localOf(svg, event.clientX, event.clientY) : null;
          if (local && tool === "node") setHover(snapGround(groundAt(local.x, local.y, cameraRef.current), cameraRef.current.zoom));
          const active = drag.current;
          if (!active) return;
          const dx = event.clientX - active.x;
          const dy = event.clientY - active.y;
          if (Math.hypot(dx, dy) > 4) active.moved = true;
          if (!active.moved) return;
          if (active.pan) {
            setCamera({ ...cameraRef.current, panX: active.panX + dx, panY: active.panY + dy });
          } else {
            setCamera({
              ...cameraRef.current,
              yaw: active.yaw + dx * 0.008,
              pitch: Math.max(0.28, Math.min(1.15, active.pitch + dy * 0.006)),
            });
          }
        }}
        onPointerUp={(event) => {
          const active = drag.current;
          drag.current = null;
          try {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          } catch {
            /* already released */
          }
          if (!active || active.moved || event.button !== 0) return;
          const svg = svgRef.current;
          const local = svg ? localOf(svg, event.clientX, event.clientY) : null;
          if (!local) return;
          onLeft(identify(local));
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          const svg = svgRef.current;
          const local = svg ? localOf(svg, event.clientX, event.clientY) : null;
          if (!local) return;
          onRight(identify(local), event.clientX, event.clientY);
        }}
        onPointerLeave={() => setHover(null)}
      >
        <rect width={VIEW_W} height={VIEW_H} fill="#f4f7fb" />
        {xLines.map((x) => {
          const a = project(x, 0, minZ, camera);
          const b = project(x, 0, maxZ, camera);
          return <line key={`x${x}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="rgba(23,32,51,0.16)" />;
        })}
        {zLines.map((z) => {
          const a = project(minX, 0, z, camera);
          const b = project(maxX, 0, z, camera);
          return <line key={`z${z}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="rgba(23,32,51,0.16)" />;
        })}
        <AxisLegend camera={camera} />
        {model.members
          .map((member) => {
            const a = model.nodes.find((node) => node.id === member.i);
            const b = model.nodes.find((node) => node.id === member.j);
            if (!a || !b) return null;
            const p = project(a.x, a.y, a.z ?? 0, camera);
            const q = project(b.x, b.y, b.z ?? 0, camera);
            return { member, p, q, depth: (p.depth + q.depth) / 2 };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .sort((a, b) => b.depth - a.depth)
          .map(({ member, p, q }) => {
          const force = analysis?.forces.find((item) => item.memberId === member.id);
          const material = materialById(member.materialId);
          const color = force
            ? force.mode === "tension"
              ? "#2a62ea"
              : force.mode === "compression"
                ? "#e23b4a"
                : "#94a3b8"
            : material?.color ?? "#334155";
          const dim = Boolean(focusMemberIds?.length) && !focusMemberIds?.includes(member.id);
          return (
            <g key={member.id} opacity={dim ? 0.28 : 1}>
              <line x1={p.sx} y1={p.sy} x2={q.sx} y2={q.sy} stroke={color} strokeWidth={force?.over ? 7 : 4.5} strokeLinecap="round" />
              {showForces && force && force.mode !== "zero" ? (
                <text x={(p.sx + q.sx) / 2} y={(p.sy + q.sy) / 2 - 8} textAnchor="middle" fontSize="12" fontWeight="800" fill={color} stroke="white" strokeWidth="4" paintOrder="stroke">
                  {signed(force.axial)}
                </text>
              ) : null}
            </g>
          );
        })}
        {pending && tool === "member" ? (
          <PendingLine pending={pending} camera={camera} />
        ) : null}
        {required.map(([fromId, toId]) => {
          const joined = model.members.some(
            (member) => (member.i === fromId && member.j === toId) || (member.i === toId && member.j === fromId),
          );
          if (joined) return null;
          const from = model.nodes.find((node) => node.id === fromId);
          const to = model.nodes.find((node) => node.id === toId);
          if (!from || !to) return null;
          const a = project(from.x, from.y, from.z ?? 0, camera);
          const b = project(to.x, to.y, to.z ?? 0, camera);
          return (
            <g key={`need-${fromId}-${toId}`}>
              <line x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="#d97706" strokeWidth="3" strokeDasharray="7 6" />
              <text x={(a.sx + b.sx) / 2} y={(a.sy + b.sy) / 2 - 8} textAnchor="middle" fontSize="11" fontWeight="800" fill="#d97706">
                이어야 함
              </text>
            </g>
          );
        })}
        {model.supports.map((support) => {
          const node = model.nodes.find((item) => item.id === support.nodeId);
          if (!node) return null;
          const screen = project(node.x, node.y, node.z ?? 0, camera);
          const turnable = Boolean(onRotate) && canTurn(support.type);
          return (
            <g
              key={support.nodeId}
              onPointerEnter={turnable ? () => holdSupport(support.nodeId) : undefined}
              onPointerLeave={turnable ? releaseSupport : undefined}
            >
              <SpaceSupport sx={screen.sx} sy={screen.sy} type={support.type} angle={support.angle} hot={turnable} />
            </g>
          );
        })}
        {model.loads.map((load) => {
          const node = model.nodes.find((item) => item.id === load.nodeId);
          if (!node) return null;
          const mag = Math.hypot(load.fx, load.fy, load.fz ?? 0);
          if (mag < 0.5) return null;
          const from = project(node.x, node.y + 1.15, node.z ?? 0, camera);
          const to = project(node.x, node.y + 0.2, node.z ?? 0, camera);
          return (
            <g key={`load-${load.nodeId}`}>
              <line x1={from.sx} y1={from.sy} x2={to.sx} y2={to.sy} stroke="#ef8a24" strokeWidth="3" />
              <text x={from.sx + 8} y={from.sy} fontSize="12" fontWeight="800" fill="#d97706">
                {load.label ?? `${Math.round(mag)}N`}
              </text>
            </g>
          );
        })}
        {hover && tool === "node" ? (
          <g>
            {placeY !== null && placeY > 0 ? (
              <line
                x1={project(hover.x, 0, hover.z, camera).sx}
                y1={project(hover.x, 0, hover.z, camera).sy}
                x2={project(hover.x, placeY, hover.z, camera).sx}
                y2={project(hover.x, placeY, hover.z, camera).sy}
                stroke="#2f6bff"
                strokeDasharray="4 4"
              />
            ) : null}
            <circle
              cx={project(hover.x, placeY ?? 0, hover.z, camera).sx}
              cy={project(hover.x, placeY ?? 0, hover.z, camera).sy}
              r="7"
              fill="rgba(47,107,255,0.16)"
              stroke="#2f6bff"
            />
          </g>
        ) : null}
        {model.nodes
          .map((node) => ({ node, screen: project(node.x, node.y, node.z ?? 0, camera) }))
          .sort((a, b) => b.screen.depth - a.screen.depth)
          .map(({ node, screen }) => {
            const on = node.id === focusNodeId || node.id === pendingId;
            return (
              <g key={node.id}>
                <circle cx={screen.sx} cy={screen.sy} r={on ? 11 : 8} fill="white" stroke={on ? "#2f6bff" : "#172033"} strokeWidth="2.2" />
                <text x={screen.sx + 12} y={screen.sy - 8} fontSize="11" fontWeight="800" fill="#172033">
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
                const screen = project(node.x, node.y, node.z ?? 0, camera);
                return (
                  <RotateChip
                    key={`turn-${support.nodeId}`}
                    sx={screen.sx}
                    sy={screen.sy}
                    angle={supportAngle(support)}
                    onHold={() => holdSupport(support.nodeId)}
                    onRelease={releaseSupport}
                    onRotate={() => onRotate(support.nodeId)}
                  />
                );
              })
          : null}
        <text x="24" y={VIEW_H - 18} fontSize="12" fill="#5d6b80">
          끌면 회전 · Shift 끌면 이동 · x 경간 · y 높이 · z 깊이
        </text>
      </svg>
      <ZoomBar zoom={camera.zoom} step={step} onZoom={(next) => setCamera((current) => ({ ...current, zoom: clampZoom(next) }))} onReset={() => setCamera(HOME)} />
    </div>
  );
}

function PendingLine({ pending, camera }: { pending: { x: number; y: number; z?: number }; camera: Camera }) {
  const from = project(pending.x, pending.y, pending.z ?? 0, camera);
  return <circle cx={from.sx} cy={from.sy} r="12" fill="none" stroke="#2f6bff" strokeWidth="2" />;
}

function SpaceSupport({ sx, sy, type, angle, hot }: { sx: number; sy: number; type: SupportType; angle?: number; hot?: boolean }) {
  const turn = supportAngle({ type, angle });
  const body =
    type === "slot" ? (
      <g stroke="#172033" strokeWidth="1.8">
        <line x1={sx - 10} y1={sy + 14} x2={sx + 10} y2={sy + 14} />
        <line x1={sx - 10} y1={sy + 20} x2={sx + 10} y2={sy + 20} />
      </g>
    ) : type === "rollerY" || type === "rollerX" ? (
      <g stroke="#172033" fill="none" strokeWidth="1.6">
        <polygon points={`${sx},${sy + 8} ${sx - 10},${sy + 22} ${sx + 10},${sy + 22}`} fill="#172033" stroke="none" />
        <circle cx={sx - 5} cy={sy + 28} r="3" />
        <circle cx={sx + 5} cy={sy + 28} r="3" />
      </g>
    ) : (
      <circle cx={sx} cy={sy + 16} r="6" fill={type === "ball" ? "#172033" : "none"} stroke="#172033" strokeWidth="1.6" />
    );
  return (
    <g transform={`rotate(${turn} ${sx} ${sy})`}>
      {hot ? <circle cx={sx} cy={sy + 16} r="22" fill="transparent" /> : null}
      {body}
    </g>
  );
}

function AxisLegend({ camera }: { camera: Camera }) {
  const origin = project(-1.6, 0, -3.4, camera);
  const x = project(-0.4, 0, -3.4, camera);
  const y = project(-1.6, 1.1, -3.4, camera);
  const z = project(-1.6, 0, -2.2, camera);
  return (
    <g stroke="#172033" fill="#172033" fontSize="12" fontWeight="700">
      <line x1={origin.sx} y1={origin.sy} x2={x.sx} y2={x.sy} />
      <line x1={origin.sx} y1={origin.sy} x2={y.sx} y2={y.sy} />
      <line x1={origin.sx} y1={origin.sy} x2={z.sx} y2={z.sy} />
      <text x={x.sx + 4} y={x.sy}>x</text>
      <text x={y.sx + 4} y={y.sy}>y</text>
      <text x={z.sx + 4} y={z.sy}>z</text>
    </g>
  );
}
