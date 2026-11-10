import { memberLength, memberName, nodeLabel } from "./analyze";
import { fmt, fmtCoef, signed } from "./format";
import { compressionAllow, materialById } from "./materials";
import type { Analysis, Load, Member, MemberForce, Model, Node, SolutionStep, SupportType } from "./types";

const EPS = 1e-8;

export function isSpaceModel(model: Model): boolean {
  if (model.supports.some((support) => support.type === "ball" || support.type === "slot")) return true;
  return model.nodes.some((node) => typeof node.z === "number");
}

function unit3(from: Node, to: Node) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = (to.z ?? 0) - (from.z ?? 0);
  const length = Math.hypot(dx, dy, dz);
  if (length < 1e-9) return null;
  return { cx: dx / length, cy: dy / length, cz: dz / length, length };
}

function axes(type: SupportType): Array<0 | 1 | 2> {
  if (type === "ball" || type === "pin") return [0, 1, 2];
  if (type === "slot") return [1, 2];
  if (type === "rollerY") return [1];
  if (type === "rollerX") return [0];
  return [];
}

function solveLinear(matrix: number[][], rhs: number[]): number[] | null {
  const n = rhs.length;
  if (n === 0) return [];
  const m = matrix.map((row, i) => [...row, rhs[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    }
    if (Math.abs(m[pivot][col]) < 1e-9) return null;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    const div = m[col][col];
    for (let c = col; c <= n; c++) m[col][c] /= div;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = m[row][col];
      if (Math.abs(factor) < EPS) continue;
      for (let c = col; c <= n; c++) m[row][c] -= factor * m[col][c];
    }
  }
  return m.map((row) => row[n]);
}

function empty(partial: Partial<Analysis> & Pick<Analysis, "status" | "message">): Analysis {
  return {
    m: 0,
    r: 0,
    j: 0,
    degree: 0,
    method: "none",
    reactions: [],
    forces: [],
    steps: [],
    maxRatio: 0,
    space: true,
    ...partial,
  };
}

type Solved = {
  axials: Map<number, number>;
  reactions: Map<number, { rx: number; ry: number; rz: number }>;
};

function solveJoints(model: Model, loads: Load[]): Solved | null {
  const index = new Map(model.nodes.map((node, i) => [node.id, i]));
  const equations = model.nodes.length * 3;
  const reactions: { nodeId: number; axis: 0 | 1 | 2 }[] = [];
  for (const support of model.supports) {
    for (const axis of axes(support.type)) reactions.push({ nodeId: support.nodeId, axis });
  }
  if (model.members.length + reactions.length !== equations) return null;
  const matrix = Array.from({ length: equations }, () => Array(model.members.length + reactions.length).fill(0));
  const rhs = Array(equations).fill(0);
  for (const load of loads) {
    const at = index.get(load.nodeId);
    if (at === undefined) continue;
    rhs[at * 3] -= load.fx;
    rhs[at * 3 + 1] -= load.fy;
    rhs[at * 3 + 2] -= load.fz ?? 0;
  }
  model.members.forEach((member, memberIndex) => {
    const i = index.get(member.i)!;
    const j = index.get(member.j)!;
    const dir = unit3(model.nodes[i], model.nodes[j]);
    if (!dir) return;
    matrix[i * 3][memberIndex] += dir.cx;
    matrix[i * 3 + 1][memberIndex] += dir.cy;
    matrix[i * 3 + 2][memberIndex] += dir.cz;
    matrix[j * 3][memberIndex] -= dir.cx;
    matrix[j * 3 + 1][memberIndex] -= dir.cy;
    matrix[j * 3 + 2][memberIndex] -= dir.cz;
  });
  reactions.forEach((reaction, reactionIndex) => {
    const at = index.get(reaction.nodeId)!;
    matrix[at * 3 + reaction.axis][model.members.length + reactionIndex] = 1;
  });
  const solution = solveLinear(matrix, rhs);
  if (!solution) return null;
  const axials = new Map<number, number>();
  model.members.forEach((member, memberIndex) => axials.set(member.id, solution[memberIndex]));
  const byNode = new Map<number, { rx: number; ry: number; rz: number }>();
  for (const node of model.nodes) byNode.set(node.id, { rx: 0, ry: 0, rz: 0 });
  reactions.forEach((reaction, reactionIndex) => {
    const target = byNode.get(reaction.nodeId)!;
    const value = solution[model.members.length + reactionIndex];
    if (reaction.axis === 0) target.rx = value;
    else if (reaction.axis === 1) target.ry = value;
    else target.rz = value;
  });
  return { axials, reactions: byNode };
}

function solveStiffness(model: Model, loads: Load[]): Solved | null {
  const index = new Map(model.nodes.map((node, i) => [node.id, i]));
  const dof = model.nodes.length * 3;
  const stiffness = Array.from({ length: dof }, () => Array(dof).fill(0));
  const meta: { id: number; ea: number; length: number; cx: number; cy: number; cz: number; i: number; j: number }[] = [];
  for (const member of model.members) {
    const i = index.get(member.i)!;
    const j = index.get(member.j)!;
    const dir = unit3(model.nodes[i], model.nodes[j]);
    if (!dir) return null;
    const material = materialById(member.materialId);
    if (!material) return null;
    const k = (material.E * material.A) / dir.length;
    const c = [dir.cx, dir.cy, dir.cz, -dir.cx, -dir.cy, -dir.cz];
    const map = [i * 3, i * 3 + 1, i * 3 + 2, j * 3, j * 3 + 1, j * 3 + 2];
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) stiffness[map[row]][map[col]] += k * c[row] * c[col];
    }
    meta.push({ id: member.id, ea: material.E * material.A, length: dir.length, cx: dir.cx, cy: dir.cy, cz: dir.cz, i, j });
  }
  const fixed = Array(dof).fill(false);
  for (const support of model.supports) {
    const at = index.get(support.nodeId);
    if (at === undefined) continue;
    for (const axis of axes(support.type)) fixed[at * 3 + axis] = true;
  }
  const free: number[] = [];
  for (let degree = 0; degree < dof; degree++) if (!fixed[degree]) free.push(degree);
  const displacement = Array(dof).fill(0);
  const external = Array(dof).fill(0);
  for (const load of loads) {
    const at = index.get(load.nodeId);
    if (at === undefined) continue;
    external[at * 3] += load.fx;
    external[at * 3 + 1] += load.fy;
    external[at * 3 + 2] += load.fz ?? 0;
  }
  if (free.length > 0) {
    const reduced = free.map((row) => free.map((col) => stiffness[row][col]));
    const solved = solveLinear(reduced, free.map((row) => external[row]));
    if (!solved) return null;
    free.forEach((degree, at) => {
      displacement[degree] = solved[at];
    });
  }
  const internal = Array(dof).fill(0);
  for (let row = 0; row < dof; row++) {
    for (let col = 0; col < dof; col++) internal[row] += stiffness[row][col] * displacement[col];
  }
  const reactions = new Map<number, { rx: number; ry: number; rz: number }>();
  for (const node of model.nodes) {
    const at = index.get(node.id)!;
    reactions.set(node.id, {
      rx: internal[at * 3] - external[at * 3],
      ry: internal[at * 3 + 1] - external[at * 3 + 1],
      rz: internal[at * 3 + 2] - external[at * 3 + 2],
    });
  }
  const axials = new Map<number, number>();
  for (const member of meta) {
    const stretch =
      (displacement[member.j * 3] - displacement[member.i * 3]) * member.cx +
      (displacement[member.j * 3 + 1] - displacement[member.i * 3 + 1]) * member.cy +
      (displacement[member.j * 3 + 2] - displacement[member.i * 3 + 2]) * member.cz;
    axials.set(member.id, (member.ea / member.length) * stretch);
  }
  return { axials, reactions };
}

function term(coef: number, name: string, first: boolean) {
  const mag = fmtCoef(coef);
  const body = `${mag}${name}`.trim();
  if (!body) return "";
  if (first) return coef < 0 ? `−${body}` : body;
  return coef < 0 ? ` − ${body}` : ` + ${body}`;
}

function sumLine(label: string, parts: { coef: number; name: string }[]) {
  const bits: string[] = [];
  let first = true;
  for (const part of parts) {
    if (Math.abs(part.coef) < 0.0008) continue;
    const text = term(part.coef, part.name, first);
    if (!text) continue;
    bits.push(text);
    first = false;
  }
  if (bits.length === 0) return `${label}  0 = 0`;
  return `${label}  ${bits.join("")} = 0`;
}

function solveUpTo3(rows: { cx: number; cy: number; cz: number }[], rhs: number[]): number[] | null {
  const component = (row: { cx: number; cy: number; cz: number }, axis: number) => [row.cx, row.cy, row.cz][axis];
  if (rows.length === 3) return solveLinear(rows.map((row) => [row.cx, row.cy, row.cz]), rhs);
  if (rows.length === 1) {
    const coeffs = [rows[0].cx, rows[0].cy, rows[0].cz];
    let best = 0;
    for (let axis = 1; axis < 3; axis++) if (Math.abs(coeffs[axis]) > Math.abs(coeffs[best])) best = axis;
    if (Math.abs(coeffs[best]) < 1e-8) return null;
    const value = rhs[best] / coeffs[best];
    for (let axis = 0; axis < 3; axis++) {
      if (Math.abs(coeffs[axis] * value - rhs[axis]) > 0.8) return null;
    }
    return [value];
  }
  let best: { det: number; values: number[] } | null = null;
  for (let a = 0; a < 3; a++) {
    for (let b = a + 1; b < 3; b++) {
      const matrix = [
        [component(rows[0], a), component(rows[1], a)],
        [component(rows[0], b), component(rows[1], b)],
      ];
      const det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
      if (Math.abs(det) < 1e-8) continue;
      const solved = solveLinear(matrix, [rhs[a], rhs[b]]);
      if (!solved) continue;
      if (!best || Math.abs(det) > best.det) best = { det: Math.abs(det), values: solved };
    }
  }
  if (!best) return null;
  for (let axis = 0; axis < 3; axis++) {
    const residual = component(rows[0], axis) * best.values[0] + component(rows[1], axis) * best.values[1] - rhs[axis];
    if (Math.abs(residual) > 0.8) return null;
  }
  return best.values;
}

function word(axial: number) {
  if (Math.abs(axial) < 0.05) return "0";
  return axial > 0 ? "인" : "압";
}

function reactionStep(model: Model, loads: Load[], reactions: Solved["reactions"]): SolutionStep {
  let fx = 0;
  let fy = 0;
  let fz = 0;
  for (const load of loads) {
    fx += load.fx;
    fy += load.fy;
    fz += load.fz ?? 0;
  }
  for (const support of model.supports) {
    const reaction = reactions.get(support.nodeId);
    if (!reaction) continue;
    fx += reaction.rx;
    fy += reaction.ry;
    fz += reaction.rz;
  }
  const lines: SolutionStep["lines"] = [
    { text: `ΣFx  ${fmt(fx)}`, tone: "eq" },
    { text: `ΣFy  ${fmt(fy)}`, tone: "eq" },
    { text: `ΣFz  ${fmt(fz)}`, tone: "eq" },
  ];
  for (const support of model.supports) {
    const reaction = reactions.get(support.nodeId);
    if (!reaction) continue;
    const tag = nodeLabel(model.nodes, support.nodeId);
    lines.push({
      text: `${tag}  ${signed(reaction.rx)}  ${signed(reaction.ry)}  ${signed(reaction.rz)}`,
      tone: "result",
    });
  }
  return { kind: "reaction", title: "반력", memberIds: [], lines };
}

function walkJoints(model: Model, loads: Load[], solved: Solved): SolutionStep[] | null {
  const known = new Map<number, number>();
  const steps: SolutionStep[] = [reactionStep(model, loads, solved.reactions)];
  const loadAt = new Map<number, { fx: number; fy: number; fz: number }>();
  for (const node of model.nodes) loadAt.set(node.id, { fx: 0, fy: 0, fz: 0 });
  for (const load of loads) {
    const slot = loadAt.get(load.nodeId);
    if (!slot) continue;
    slot.fx += load.fx;
    slot.fy += load.fy;
    slot.fz += load.fz ?? 0;
  }
  const guard = model.members.length + model.nodes.length + 4;
  for (let pass = 0; pass < guard && known.size < model.members.length; pass++) {
    let progressed = false;
    for (const node of model.nodes) {
      const connected = model.members.filter((member) => member.i === node.id || member.j === node.id);
      const unknown = connected.filter((member) => !known.has(member.id));
      if (unknown.length === 0 || unknown.length > 3) continue;
      const knownMembers = connected.filter((member) => known.has(member.id));
      const reaction = solved.reactions.get(node.id) ?? { rx: 0, ry: 0, rz: 0 };
      const applied = loadAt.get(node.id) ?? { fx: 0, fy: 0, fz: 0 };
      const rhs = [-(reaction.rx + applied.fx), -(reaction.ry + applied.fy), -(reaction.rz + applied.fz)];
      const rows: { member: Member; cx: number; cy: number; cz: number }[] = [];
      let ok = true;
      for (const member of unknown) {
        const other = model.nodes.find((item) => item.id === (member.i === node.id ? member.j : member.i));
        const dir = other ? unit3(node, other) : null;
        if (!dir) {
          ok = false;
          break;
        }
        rows.push({ member, ...dir });
      }
      for (const member of knownMembers) {
        const other = model.nodes.find((item) => item.id === (member.i === node.id ? member.j : member.i));
        const dir = other ? unit3(node, other) : null;
        if (!dir) {
          ok = false;
          break;
        }
        const axial = known.get(member.id) ?? 0;
        rhs[0] -= axial * dir.cx;
        rhs[1] -= axial * dir.cy;
        rhs[2] -= axial * dir.cz;
      }
      if (!ok) continue;
      const values = solveUpTo3(rows, rhs);
      if (!values) continue;
      let match = true;
      values.forEach((value, index) => {
        const official = solved.axials.get(rows[index].member.id) ?? 0;
        if (Math.abs(value - official) > 0.8) match = false;
      });
      if (!match) continue;
      const lines: SolutionStep["lines"] = (["Fx", "Fy", "Fz"] as const).map((axis, axisIndex) => {
        const parts = rows.map((row) => ({
          coef: [row.cx, row.cy, row.cz][axisIndex],
          name: memberName(model.nodes, row.member),
        }));
        if (Math.abs([applied.fx, applied.fy, applied.fz][axisIndex]) > 0.05) {
          parts.push({ coef: [applied.fx, applied.fy, applied.fz][axisIndex], name: "하중" });
        }
        if (Math.abs([reaction.rx, reaction.ry, reaction.rz][axisIndex]) > 0.05) {
          parts.push({ coef: [reaction.rx, reaction.ry, reaction.rz][axisIndex], name: "반력" });
        }
        return { text: sumLine(`Σ${axis}`, parts), tone: "eq" as const };
      });
      for (const row of rows) {
        const axial = solved.axials.get(row.member.id) ?? 0;
        known.set(row.member.id, axial);
        lines.push({
          text: `${memberName(model.nodes, row.member)}  ${signed(axial)}  ${word(axial)}`,
          tone: axial > 0.05 ? "tension" : axial < -0.05 ? "compression" : "zero",
        });
      }
      steps.push({
        kind: "joint",
        title: `절점 ${nodeLabel(model.nodes, node.id)}`,
        focusNodeId: node.id,
        memberIds: rows.map((row) => row.member.id),
        lines,
      });
      progressed = true;
    }
    if (!progressed) break;
  }
  return known.size === model.members.length ? steps : null;
}

function checkSteps(model: Model, loads: Load[], solved: Solved): SolutionStep[] {
  const steps: SolutionStep[] = [reactionStep(model, loads, solved.reactions)];
  for (const node of model.nodes) {
    let fx = 0;
    let fy = 0;
    let fz = 0;
    for (const load of loads) {
      if (load.nodeId !== node.id) continue;
      fx += load.fx;
      fy += load.fy;
      fz += load.fz ?? 0;
    }
    const reaction = solved.reactions.get(node.id);
    fx += reaction?.rx ?? 0;
    fy += reaction?.ry ?? 0;
    fz += reaction?.rz ?? 0;
    const ids: number[] = [];
    const lines: SolutionStep["lines"] = [];
    for (const member of model.members) {
      if (member.i !== node.id && member.j !== node.id) continue;
      const other = model.nodes.find((item) => item.id === (member.i === node.id ? member.j : member.i));
      const dir = other ? unit3(node, other) : null;
      if (!dir) continue;
      const axial = solved.axials.get(member.id) ?? 0;
      fx += axial * dir.cx;
      fy += axial * dir.cy;
      fz += axial * dir.cz;
      ids.push(member.id);
      lines.push({
        text: `${memberName(model.nodes, member)}  ${signed(axial)}  ${word(axial)}`,
        tone: axial > 0.05 ? "tension" : axial < -0.05 ? "compression" : "zero",
      });
    }
    steps.push({
      kind: "joint",
      title: `절점 ${nodeLabel(model.nodes, node.id)}`,
      focusNodeId: node.id,
      memberIds: ids,
      lines: [
        { text: `ΣFx  ${fmt(fx)}`, tone: "eq" },
        { text: `ΣFy  ${fmt(fy)}`, tone: "eq" },
        { text: `ΣFz  ${fmt(fz)}`, tone: "eq" },
        ...lines,
      ],
    });
  }
  return steps;
}

function forceOf(model: Model, member: Member, axial: number): MemberForce | null {
  const material = materialById(member.materialId);
  if (!material) return null;
  const length = memberLength(model.nodes, member);
  const allowC = compressionAllow(material, length);
  const mode = Math.abs(axial) < 0.05 ? "zero" : axial > 0 ? "tension" : "compression";
  let ratio = 0;
  if (mode === "tension") ratio = material.tension <= 0 ? 999 : axial / material.tension;
  if (mode === "compression") ratio = allowC <= 0 ? 999 : -axial / allowC;
  return {
    memberId: member.id,
    name: memberName(model.nodes, member),
    i: member.i,
    j: member.j,
    axial,
    allowTension: material.tension,
    allowCompression: allowC,
    ratio,
    mode,
    over: ratio > 1.001,
    length,
    cost: length * material.costPerM,
    materialId: member.materialId,
  };
}

export function analyzeSpace(model: Model, loadOverride?: Load[]): Analysis {
  const loads = loadOverride ?? model.loads;
  const reactionTotal = model.supports.reduce((sum, support) => sum + axes(support.type).length, 0);
  const counts = { j: model.nodes.length, m: model.members.length, r: reactionTotal };
  const degree = counts.m + counts.r - counts.j * 3;
  if (model.nodes.length < 2 && model.members.length === 0) {
    return empty({ status: "empty", message: "절점을 놓으세요", ...counts, degree });
  }
  if (model.members.length === 0) return empty({ status: "empty", message: "부재를 이으세요", ...counts, degree });
  if (model.supports.length === 0) return empty({ status: "unstable", message: "볼 지점으로 고정하세요", ...counts, degree });
  const held = new Set(model.supports.flatMap((support) => axes(support.type)));
  if (!held.has(0) || !held.has(1) || !held.has(2)) {
    return empty({ status: "unstable", message: "x·y·z를 모두 막는 지점이 필요합니다", ...counts, degree });
  }
  if (degree < 0) return empty({ status: "unstable", message: "부재나 지점이 부족합니다", ...counts, degree });

  const solved = degree === 0 ? solveJoints(model, loads) ?? solveStiffness(model, loads) : solveStiffness(model, loads);
  if (!solved) return empty({ status: "unstable", message: "한 평면으로 눌리거나 기하학적으로 불안정", ...counts, degree });

  const forces = model.members
    .map((member) => forceOf(model, member, solved.axials.get(member.id) ?? 0))
    .filter((force): force is MemberForce => Boolean(force));
  const over = forces.filter((force) => force.over);
  const jointSteps = degree === 0 ? walkJoints(model, loads, solved) : null;
  const method: Analysis["method"] = jointSteps ? "joints" : "stiffness";
  let status: Analysis["status"] = "ok";
  let message = method === "joints" ? "절점법" : "부정정 · EA";
  if (over.length) {
    status = "overstressed";
    const first = over[0];
    const allow = first.axial >= 0 ? first.allowTension : first.allowCompression;
    message = `${first.name}  ${fmt(Math.abs(first.axial))} > ${fmt(allow)}`;
  }
  return {
    status,
    message,
    m: counts.m,
    r: counts.r,
    j: counts.j,
    degree,
    method,
    space: true,
    reactions: model.nodes.map((node) => ({ nodeId: node.id, ...(solved.reactions.get(node.id) ?? { rx: 0, ry: 0, rz: 0 }) })),
    forces,
    steps: jointSteps ?? checkSteps(model, loads, solved),
    maxRatio: forces.reduce((max, force) => Math.max(max, force.ratio), 0),
  };
}

export const TRIPOD: Model = {
  nodes: [
    { id: 1, x: 2, y: 0, z: 0 },
    { id: 2, x: -1, y: 0, z: Math.sqrt(3) },
    { id: 3, x: -1, y: 0, z: -Math.sqrt(3) },
    { id: 4, x: 0, y: 2, z: 0 },
  ],
  members: [
    { id: 5, i: 1, j: 4, materialId: "tube" },
    { id: 6, i: 2, j: 4, materialId: "tube" },
    { id: 7, i: 3, j: 4, materialId: "tube" },
  ],
  supports: [
    { nodeId: 1, type: "ball" },
    { nodeId: 2, type: "ball" },
    { nodeId: 3, type: "ball" },
  ],
  loads: [{ nodeId: 4, fx: 0, fy: -60, label: "60N" }],
};
