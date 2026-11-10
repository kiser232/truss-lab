import { compressionAllow, materialById } from "./materials";
import { fmt, fmtCoef, letter, signed } from "./format";
import type {
  Analysis,
  Load,
  Material,
  Member,
  MemberForce,
  Model,
  Node,
  SolutionLine,
  SolutionStep,
  Support,
} from "./types";

const EPS = 1e-8;

type Comp = { nodeId: number; axis: "x" | "y"; name: string };

type Unknown =
  | { kind: "member"; id: number; name: string; cx: number; cy: number }
  | { kind: "rx"; nodeId: number; name: string }
  | { kind: "ry"; nodeId: number; name: string };

export function nodeLabel(nodes: Node[], id: number): string {
  const sorted = [...nodes].sort((a, b) => a.id - b.id);
  const index = sorted.findIndex((n) => n.id === id);
  return index < 0 ? "?" : letter(index);
}

export function memberName(nodes: Node[], member: Member): string {
  const [a, b] = member.i < member.j ? [member.i, member.j] : [member.j, member.i];
  return `${nodeLabel(nodes, a)}${nodeLabel(nodes, b)}`;
}

export function memberLength(nodes: Node[], member: Member): number {
  const a = nodes.find((n) => n.id === member.i);
  const b = nodes.find((n) => n.id === member.j);
  if (!a || !b) return 0;
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function modelCost(model: Model): number {
  return model.members.reduce((sum, member) => {
    const material = materialById(member.materialId);
    if (!material) return sum;
    return sum + memberLength(model.nodes, member) * material.costPerM;
  }, 0);
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

function reactionComponents(model: Model): Comp[] {
  const comps: Comp[] = [];
  for (const support of model.supports) {
    const name = nodeLabel(model.nodes, support.nodeId);
    if (support.type === "pin" || support.type === "rollerX") {
      comps.push({ nodeId: support.nodeId, axis: "x", name: `${name}x` });
    }
    if (support.type === "pin" || support.type === "rollerY") {
      comps.push({ nodeId: support.nodeId, axis: "y", name: `${name}y` });
    }
  }
  return comps;
}

function supportCount(supports: Support[]): { x: boolean; y: boolean; r: number } {
  let x = false;
  let y = false;
  let r = 0;
  for (const support of supports) {
    if (support.type === "pin") {
      x = true;
      y = true;
      r += 2;
    } else if (support.type === "rollerY") {
      y = true;
      r += 1;
    } else {
      x = true;
      r += 1;
    }
  }
  return { x, y, r };
}

function mergeLoads(loads: Load[]): Load[] {
  const map = new Map<number, Load>();
  for (const load of loads) {
    const prev = map.get(load.nodeId);
    if (!prev) map.set(load.nodeId, { ...load });
    else map.set(load.nodeId, { ...prev, fx: prev.fx + load.fx, fy: prev.fy + load.fy });
  }
  return [...map.values()];
}

function term(coef: number, name: string, first: boolean): string {
  const mag = fmtCoef(coef);
  const body = `${mag}${name}`.trim();
  if (first) return coef < 0 ? `−${body}` : body;
  return coef < 0 ? ` − ${body}` : ` + ${body}`;
}

function equation(label: string, coefs: { coef: number; name: string }[], constant: number): string | null {
  const parts: string[] = [];
  let first = true;
  for (const item of coefs) {
    if (Math.abs(item.coef) < 0.0008) continue;
    parts.push(term(item.coef, item.name, first));
    first = false;
  }
  if (Math.abs(constant) >= 0.05) {
    parts.push(term(constant, "", first));
    first = false;
  }
  if (parts.length === 0) return null;
  return `${label}  ${parts.join("")} = 0`;
}

function emptyAnalysis(partial: Partial<Analysis> & Pick<Analysis, "status" | "message">): Analysis {
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
    ...partial,
  };
}

function validate(model: Model): string | null {
  if (model.nodes.length < 2) return "절점이 부족합니다";
  const ids = new Set<number>();
  for (const node of model.nodes) {
    if (ids.has(node.id) || !Number.isFinite(node.x) || !Number.isFinite(node.y)) return "절점 오류";
    ids.add(node.id);
  }
  if (model.members.length === 0) return "부재를 이으세요";
  const seen = new Set<string>();
  for (const member of model.members) {
    if (member.i === member.j) return "같은 절점은 이을 수 없습니다";
    if (!ids.has(member.i) || !ids.has(member.j)) return "없는 절점";
    const key = member.i < member.j ? `${member.i}-${member.j}` : `${member.j}-${member.i}`;
    if (seen.has(key)) return "부재가 겹칩니다";
    seen.add(key);
    if (memberLength(model.nodes, member) < 1e-6) return "길이 0";
    if (!materialById(member.materialId)) return "자재 없음";
  }
  const supportNodes = new Set<number>();
  for (const support of model.supports) {
    if (!ids.has(support.nodeId)) return "없는 지점";
    if (supportNodes.has(support.nodeId)) return "지점이 겹칩니다";
    supportNodes.add(support.nodeId);
  }
  if (model.supports.length === 0) return "지점이 없습니다";
  return null;
}

type Stiff = {
  reactions: Map<number, { rx: number; ry: number }>;
  axials: Map<number, number>;
};

function stiffness(model: Model, loads: Load[]): Stiff | null {
  const nodes = model.nodes;
  const index = new Map(nodes.map((node, i) => [node.id, i]));
  const n = nodes.length;
  const ndof = n * 2;
  const K = Array.from({ length: ndof }, () => Array(ndof).fill(0));
  const F = Array(ndof).fill(0);
  const locals: {
    member: Member;
    i: number;
    j: number;
    c: number;
    s: number;
    k: number;
  }[] = [];

  for (const member of model.members) {
    const i = index.get(member.i)!;
    const j = index.get(member.j)!;
    const a = nodes[i];
    const b = nodes[j];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const L = Math.hypot(dx, dy);
    const c = dx / L;
    const s = dy / L;
    const material = materialById(member.materialId)!;
    const ea = Math.max(material.E * material.A, 1e-6);
    const k = ea / L;
    const cc = c * c;
    const ss = s * s;
    const cs = c * s;
    const local = [
      [cc, cs, -cc, -cs],
      [cs, ss, -cs, -ss],
      [-cc, -cs, cc, cs],
      [-cs, -ss, cs, ss],
    ];
    const dof = [i * 2, i * 2 + 1, j * 2, j * 2 + 1];
    for (let r = 0; r < 4; r++) {
      for (let c2 = 0; c2 < 4; c2++) K[dof[r]][dof[c2]] += k * local[r][c2];
    }
    locals.push({ member, i, j, c, s, k });
  }

  for (const load of loads) {
    const i = index.get(load.nodeId);
    if (i === undefined) continue;
    F[i * 2] += load.fx;
    F[i * 2 + 1] += load.fy;
  }

  const fixed = Array(ndof).fill(false);
  for (const support of model.supports) {
    const i = index.get(support.nodeId);
    if (i === undefined) continue;
    if (support.type === "pin" || support.type === "rollerX") fixed[i * 2] = true;
    if (support.type === "pin" || support.type === "rollerY") fixed[i * 2 + 1] = true;
  }
  const free: number[] = [];
  for (let d = 0; d < ndof; d++) if (!fixed[d]) free.push(d);

  const u = Array(ndof).fill(0);
  if (free.length > 0) {
    const Kff = free.map((r) => free.map((c) => K[r][c]));
    const Ff = free.map((r) => F[r]);
    const uf = solveLinear(Kff, Ff);
    if (!uf) return null;
    free.forEach((dof, i) => {
      u[dof] = uf[i];
    });
  }

  const reactions = new Map<number, { rx: number; ry: number }>();
  for (const node of nodes) reactions.set(node.id, { rx: 0, ry: 0 });
  for (let d = 0; d < ndof; d++) {
    let ku = 0;
    for (let c = 0; c < ndof; c++) ku += K[d][c] * u[c];
    const reaction = ku - F[d];
    if (!fixed[d]) continue;
    const node = nodes[Math.floor(d / 2)];
    const slot = reactions.get(node.id)!;
    if (d % 2 === 0) slot.rx += reaction;
    else slot.ry += reaction;
  }

  const axials = new Map<number, number>();
  for (const local of locals) {
    const du =
      local.c * (u[local.j * 2] - u[local.i * 2]) +
      local.s * (u[local.j * 2 + 1] - u[local.i * 2 + 1]);
    axials.set(local.member.id, local.k * du);
  }
  return { reactions, axials };
}

function staticReactions(model: Model, loads: Load[]): Map<number, { rx: number; ry: number }> | null {
  const comps = reactionComponents(model);
  if (comps.length !== 3) return null;
  const pivot = model.nodes.find((n) => n.id === model.supports[0]?.nodeId) ?? model.nodes[0];
  const A = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  let lfx = 0;
  let lfy = 0;
  let lm = 0;
  for (const load of loads) {
    const node = model.nodes.find((n) => n.id === load.nodeId);
    if (!node) continue;
    lfx += load.fx;
    lfy += load.fy;
    lm += (node.x - pivot.x) * load.fy - (node.y - pivot.y) * load.fx;
  }
  comps.forEach((comp, i) => {
    const node = model.nodes.find((n) => n.id === comp.nodeId)!;
    if (comp.axis === "x") {
      A[0][i] = 1;
      A[2][i] = -(node.y - pivot.y);
    } else {
      A[1][i] = 1;
      A[2][i] = node.x - pivot.x;
    }
  });
  const solved = solveLinear(A, [-lfx, -lfy, -lm]);
  if (!solved) return null;
  const map = new Map<number, { rx: number; ry: number }>();
  for (const node of model.nodes) map.set(node.id, { rx: 0, ry: 0 });
  comps.forEach((comp, i) => {
    const slot = map.get(comp.nodeId)!;
    if (comp.axis === "x") slot.rx = solved[i];
    else slot.ry = solved[i];
  });
  return map;
}

function reactionStep(model: Model, loads: Load[], reactions: Map<number, { rx: number; ry: number }>): SolutionStep {
  const comps = reactionComponents(model);
  const pivot = model.nodes.find((n) => n.id === model.supports[0]?.nodeId) ?? model.nodes[0];
  const pivotLabel = nodeLabel(model.nodes, pivot.id);
  const rows: { label: string; coefs: { coef: number; name: string }[]; rhsKnown: number }[] = [
    { label: "ΣFx", coefs: [], rhsKnown: 0 },
    { label: "ΣFy", coefs: [], rhsKnown: 0 },
    { label: `ΣM${pivotLabel}`, coefs: [], rhsKnown: 0 },
  ];
  for (const load of loads) {
    const node = model.nodes.find((n) => n.id === load.nodeId);
    if (!node) continue;
    rows[0].rhsKnown += load.fx;
    rows[1].rhsKnown += load.fy;
    rows[2].rhsKnown += (node.x - pivot.x) * load.fy - (node.y - pivot.y) * load.fx;
  }
  for (const comp of comps) {
    const node = model.nodes.find((n) => n.id === comp.nodeId)!;
    if (comp.axis === "x") {
      rows[0].coefs.push({ coef: 1, name: comp.name });
      rows[2].coefs.push({ coef: -(node.y - pivot.y), name: comp.name });
    } else {
      rows[1].coefs.push({ coef: 1, name: comp.name });
      rows[2].coefs.push({ coef: node.x - pivot.x, name: comp.name });
    }
  }
  const lines: SolutionLine[] = [];
  for (const row of rows) {
    const text = equation(row.label, row.coefs, row.rhsKnown);
    if (text) lines.push({ text, tone: "eq" });
  }
  for (const comp of comps) {
    const value = reactions.get(comp.nodeId);
    const n = comp.axis === "x" ? value?.rx ?? 0 : value?.ry ?? 0;
    lines.push({ text: `${comp.name}  ${signed(n)}`, tone: "result" });
  }
  return { kind: "reaction", title: "반력", memberIds: [], lines };
}

function direction(from: Node, to: Node): { c: number; s: number } | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const L = Math.hypot(dx, dy);
  if (L < 1e-9) return null;
  return { c: dx / L, s: dy / L };
}

function jointMethod(
  model: Model,
  loads: Load[],
  seeded: Map<number, { rx: number; ry: number }> | null,
  expected: Map<number, number>,
): SolutionStep[] | null {
  const known = new Map<number, number>();
  const knownRe = new Set<string>();
  if (seeded) {
    for (const support of model.supports) {
      knownRe.add(`${support.nodeId}:x`);
      knownRe.add(`${support.nodeId}:y`);
    }
  }
  const steps: SolutionStep[] = [];
  if (seeded) steps.push(reactionStep(model, loads, seeded));

  const loadAt = new Map<number, { fx: number; fy: number }>();
  for (const node of model.nodes) loadAt.set(node.id, { fx: 0, fy: 0 });
  for (const load of loads) {
    const slot = loadAt.get(load.nodeId);
    if (!slot) continue;
    slot.fx += load.fx;
    slot.fy += load.fy;
  }

  const guard = model.members.length + model.nodes.length + 4;
  for (let iter = 0; iter < guard; iter++) {
    if (known.size >= model.members.length) break;
    const order = [...model.nodes].sort((a, b) => a.id - b.id);
    let progressed = false;
    for (const node of order) {
      const connected = model.members.filter((m) => m.i === node.id || m.j === node.id);
      const unknowns: Unknown[] = [];
      let Kx = loadAt.get(node.id)?.fx ?? 0;
      let Ky = loadAt.get(node.id)?.fy ?? 0;
      const support = model.supports.find((s) => s.nodeId === node.id);
      const reaction = seeded?.get(node.id);
      if (support && seeded && reaction) {
        Kx += reaction.rx;
        Ky += reaction.ry;
      } else if (support && !seeded) {
        const lx = nodeLabel(model.nodes, node.id);
        if ((support.type === "pin" || support.type === "rollerX") && !knownRe.has(`${node.id}:x`)) {
          unknowns.push({ kind: "rx", nodeId: node.id, name: `${lx}x` });
        } else if (knownRe.has(`${node.id}:x`) && reaction) Kx += reaction.rx;
        if ((support.type === "pin" || support.type === "rollerY") && !knownRe.has(`${node.id}:y`)) {
          unknowns.push({ kind: "ry", nodeId: node.id, name: `${lx}y` });
        } else if (knownRe.has(`${node.id}:y`) && reaction) Ky += reaction.ry;
      }
      for (const member of connected) {
        const otherId = member.i === node.id ? member.j : member.i;
        const other = model.nodes.find((n) => n.id === otherId);
        if (!other) return null;
        const dir = direction(node, other);
        if (!dir) return null;
        const name = memberName(model.nodes, member);
        if (known.has(member.id)) {
          const n = known.get(member.id)!;
          Kx += n * dir.c;
          Ky += n * dir.s;
        } else {
          unknowns.push({ kind: "member", id: member.id, name, cx: dir.c, cy: dir.s });
        }
      }
      if (unknowns.length === 0 || unknowns.length > 2) continue;

      const coef = (unknown: Unknown, axis: "x" | "y") => {
        if (unknown.kind === "rx") return axis === "x" ? 1 : 0;
        if (unknown.kind === "ry") return axis === "y" ? 1 : 0;
        return axis === "x" ? unknown.cx : unknown.cy;
      };

      let values: number[] | null = null;
      if (unknowns.length === 1) {
        const u = unknowns[0];
        const cx = coef(u, "x");
        const cy = coef(u, "y");
        const useX = Math.abs(cx) >= Math.abs(cy);
        const c = useX ? cx : cy;
        const k = useX ? Kx : Ky;
        if (Math.abs(c) < 1e-8) continue;
        const n = -k / c;
        const other = useX ? cy * n + Ky : cx * n + Kx;
        if (Math.abs(other) > 0.08) continue;
        values = [n];
      } else {
        const A = [
          [coef(unknowns[0], "x"), coef(unknowns[1], "x")],
          [coef(unknowns[0], "y"), coef(unknowns[1], "y")],
        ];
        values = solveLinear(A, [-Kx, -Ky]);
        if (!values) continue;
      }

      const lines: SolutionLine[] = [];
      const fx = equation(
        "ΣFx",
        unknowns.map((u) => ({ coef: coef(u, "x"), name: u.name })),
        Kx,
      );
      const fy = equation(
        "ΣFy",
        unknowns.map((u) => ({ coef: coef(u, "y"), name: u.name })),
        Ky,
      );
      if (fx) lines.push({ text: fx, tone: "eq" });
      if (fy) lines.push({ text: fy, tone: "eq" });

      const drafts: { id: number; truth: number; name: string }[] = [];
      const reactionDrafts: { key: string; text: string }[] = [];
      let rejected = false;
      unknowns.forEach((unknown, i) => {
        const value = values![i];
        if (unknown.kind === "member") {
          const truth = expected.get(unknown.id) ?? 0;
          if (Math.abs(value - truth) > 0.35) rejected = true;
          drafts.push({ id: unknown.id, truth, name: unknown.name });
        } else {
          reactionDrafts.push({
            key: `${unknown.nodeId}:${unknown.kind === "rx" ? "x" : "y"}`,
            text: `${unknown.name}  ${signed(value)}`,
          });
        }
      });
      if (rejected) continue;
      for (const draft of drafts) known.set(draft.id, draft.truth);
      for (const draft of reactionDrafts) {
        knownRe.add(draft.key);
        lines.push({ text: draft.text, tone: "result" });
      }
      const memberIds = drafts.map((draft) => draft.id);
      for (const draft of drafts) {
        const tone = Math.abs(draft.truth) < 0.05 ? "zero" : draft.truth > 0 ? "tension" : "compression";
        const word = tone === "tension" ? "인" : tone === "compression" ? "압" : "0";
        lines.push({
          text: tone === "zero" ? `${draft.name}  0` : `${draft.name}  ${signed(draft.truth)}  ${word}`,
          tone,
        });
      }
      steps.push({
        kind: "joint",
        title: `절점 ${nodeLabel(model.nodes, node.id)}`,
        focusNodeId: node.id,
        memberIds,
        lines,
      });
      progressed = true;
      break;
    }
    if (!progressed) break;
  }

  if (known.size !== model.members.length) return null;
  for (const [id, value] of known) {
    if (Math.abs(value - (expected.get(id) ?? 0)) > 0.35) return null;
  }
  return steps;
}

function checkSteps(model: Model, loads: Load[], stiff: Stiff): SolutionStep[] {
  const steps: SolutionStep[] = [
    {
      kind: "note",
      title: "부정정",
      memberIds: [],
      lines: [{ text: "EA 분담", tone: "eq" }],
    },
  ];
  const loadAt = new Map<number, { fx: number; fy: number }>();
  for (const node of model.nodes) loadAt.set(node.id, { fx: 0, fy: 0 });
  for (const load of loads) {
    const slot = loadAt.get(load.nodeId);
    if (!slot) continue;
    slot.fx += load.fx;
    slot.fy += load.fy;
  }
  for (const node of [...model.nodes].sort((a, b) => a.id - b.id)) {
    let fx = loadAt.get(node.id)?.fx ?? 0;
    let fy = loadAt.get(node.id)?.fy ?? 0;
    const reaction = stiff.reactions.get(node.id);
    fx += reaction?.rx ?? 0;
    fy += reaction?.ry ?? 0;
    const ids: number[] = [];
    for (const member of model.members) {
      if (member.i !== node.id && member.j !== node.id) continue;
      const otherId = member.i === node.id ? member.j : member.i;
      const other = model.nodes.find((n) => n.id === otherId)!;
      const dir = direction(node, other);
      if (!dir) continue;
      const n = stiff.axials.get(member.id) ?? 0;
      fx += n * dir.c;
      fy += n * dir.s;
      ids.push(member.id);
    }
    steps.push({
      kind: "joint",
      title: `절점 ${nodeLabel(model.nodes, node.id)}`,
      focusNodeId: node.id,
      memberIds: ids,
      lines: [
        { text: `ΣFx  ${fmt(fx)}`, tone: "eq" },
        { text: `ΣFy  ${fmt(fy)}`, tone: "eq" },
      ],
    });
  }
  return steps;
}

function forceOf(
  model: Model,
  member: Member,
  axial: number,
): MemberForce | null {
  const material: Material | undefined = materialById(member.materialId);
  if (!material) return null;
  const length = memberLength(model.nodes, member);
  const allowC = compressionAllow(material, length);
  const allowT = material.tension;
  const mode = Math.abs(axial) < 0.05 ? "zero" : axial > 0 ? "tension" : "compression";
  let ratio = 0;
  if (mode === "tension") ratio = allowT <= 0 ? 999 : axial / allowT;
  if (mode === "compression") ratio = allowC <= 0 ? 999 : -axial / allowC;
  return {
    memberId: member.id,
    name: memberName(model.nodes, member),
    i: member.i,
    j: member.j,
    axial,
    allowTension: allowT,
    allowCompression: allowC,
    ratio,
    mode,
    over: ratio > 1.001,
    length,
    cost: length * material.costPerM,
    materialId: member.materialId,
  };
}

export function analyze(model: Model, loadOverride?: Load[]): Analysis {
  const loads = mergeLoads(loadOverride ?? model.loads);
  if (model.nodes.length < 2 && model.members.length === 0) {
    return emptyAnalysis({ status: "empty", message: "절점을 놓으세요" });
  }
  const problem = validate(model);
  const hold = supportCount(model.supports);
  if (problem) {
    return emptyAnalysis({
      status: model.members.length === 0 && model.nodes.length >= 0 ? "empty" : "invalid",
      message: problem,
      j: model.nodes.length,
      m: model.members.length,
      r: hold.r,
    });
  }
  const degree = model.members.length + hold.r - 2 * model.nodes.length;
  if (!hold.x) {
    return emptyAnalysis({
      status: "unstable",
      message: "수평 지점 없음",
      m: model.members.length,
      r: hold.r,
      j: model.nodes.length,
      degree,
    });
  }
  if (!hold.y) {
    return emptyAnalysis({
      status: "unstable",
      message: "수직 지점 없음",
      m: model.members.length,
      r: hold.r,
      j: model.nodes.length,
      degree,
    });
  }

  const stiff = stiffness(model, loads);
  if (!stiff) {
    return emptyAnalysis({
      status: "unstable",
      message: degree < 0 ? "삼각형 부족" : "기하학적으로 불안정",
      m: model.members.length,
      r: hold.r,
      j: model.nodes.length,
      degree,
    });
  }

  const forces = model.members
    .map((member) => forceOf(model, member, stiff.axials.get(member.id) ?? 0))
    .filter((f): f is MemberForce => Boolean(f));
  const maxRatio = forces.reduce((m, f) => Math.max(m, f.ratio), 0);
  const over = forces.filter((f) => f.over);
  const loaded = loads.some((load) => Math.hypot(load.fx, load.fy) > 0.05);

  let steps: SolutionStep[] = [];
  let method: Analysis["method"] = "stiffness";
  if (!loaded) {
    steps = [{ kind: "note", title: "하중 0", memberIds: [], lines: [{ text: "축력 0", tone: "zero" }] }];
    method = "joints";
  } else if (degree <= 0) {
    const seeded = staticReactions(model, loads);
    const joint = jointMethod(model, loads, seeded, stiff.axials);
    if (joint) {
      steps = joint;
      method = "joints";
    } else {
      steps = checkSteps(model, loads, stiff);
    }
  } else {
    steps = checkSteps(model, loads, stiff);
  }

  let message = method === "joints" ? "절점법" : "부정정 · EA";
  let status: Analysis["status"] = "ok";
  if (over.length) {
    status = "overstressed";
    const first = over[0];
    const allow = first.axial >= 0 ? first.allowTension : first.allowCompression;
    message = `${first.name}  ${fmt(Math.abs(first.axial))} > ${fmt(allow)}`;
  }

  return {
    status,
    message,
    m: model.members.length,
    r: hold.r,
    j: model.nodes.length,
    degree,
    method,
    reactions: model.nodes.map((node) => ({
      nodeId: node.id,
      rx: stiff.reactions.get(node.id)?.rx ?? 0,
      ry: stiff.reactions.get(node.id)?.ry ?? 0,
    })),
    forces,
    steps,
    maxRatio,
  };
}
