import { analyze } from "./analyze";
import { signed } from "./format";
import type { Model } from "./types";

export type Choice = { text: string; ok: boolean };

export type JointProblem = {
  id: string;
  prompt: string;
  model: Model;
  choices: Choice[];
};

function forceText(value: number) {
  if (Math.abs(value) < 0.05) return "0";
  return `${signed(value)} ${value > 0 ? "인" : "압"}`;
}

function choicesFor(correct: number, extras: number[]): Choice[] {
  const pool = [correct, ...extras];
  const seen = new Set<string>();
  const out: Choice[] = [];
  for (const value of pool) {
    const text = forceText(value);
    if (seen.has(text)) continue;
    seen.add(text);
    out.push({ text, ok: Math.abs(value - correct) < 0.2 });
  }
  let extra = 15;
  while (out.length < 4) {
    const value = correct + extra;
    extra += 11;
    const text = forceText(value);
    if (seen.has(text)) continue;
    seen.add(text);
    out.push({ text, ok: false });
  }
  return out.slice(0, 4);
}

function modelProblem(id: string, prompt: string, model: Model, memberId: number, load: number): JointProblem | null {
  const result = analyze(model);
  if (result.method !== "joints") return null;
  if (result.status === "unstable" || result.status === "invalid" || result.status === "empty") return null;
  const force = result.forces.find((item) => item.memberId === memberId);
  if (!force || Math.abs(force.axial) < 1) return null;
  const correct = force.axial;
  const extras = [-correct, correct / 2, -correct / 2, load, -load, correct + load, correct - load, correct * 1.5].filter(
    (value) => Math.abs(value - correct) > 0.2 && Math.abs(value) > 0.05,
  );
  return {
    id,
    prompt: `${prompt}. 구하는 것은 부재 ${force.name}의 축력입니다. 양수는 인장, 음수는 압축입니다.`,
    model,
    choices: choicesFor(correct, extras),
  };
}

function wood(id: number, i: number, j: number) {
  return { id, i, j, materialId: "tube" };
}

function pinRoller(left: number, right: number): Model["supports"] {
  return [
    { nodeId: left, type: "pin" },
    { nodeId: right, type: "rollerY" },
  ];
}

function roof(span: number, rise: number, load: number, fx = 0): Model {
  return {
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: span, y: 0 },
      { id: 3, x: span / 2, y: rise },
    ],
    members: [wood(1, 1, 2), wood(2, 1, 3), wood(3, 2, 3)],
    supports: pinRoller(1, 2),
    loads: [{ nodeId: 3, fx, fy: -load, label: fx ? `${fx}N` : `${load}N` }],
  };
}

function offsetRoof(span: number, peakX: number, rise: number, load: number): Model {
  return {
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: span, y: 0 },
      { id: 3, x: peakX, y: rise },
    ],
    members: [wood(1, 1, 2), wood(2, 1, 3), wood(3, 2, 3)],
    supports: pinRoller(1, 2),
    loads: [{ nodeId: 3, fx: 0, fy: -load, label: `${load}N` }],
  };
}

function king(span: number, rise: number, load: number, atPeak: boolean): Model {
  return {
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: span, y: 0 },
      { id: 3, x: span / 2, y: 0 },
      { id: 4, x: span / 2, y: rise },
    ],
    members: [wood(1, 1, 4), wood(2, 2, 4), wood(3, 3, 4), wood(4, 1, 3), wood(5, 3, 2)],
    supports: pinRoller(1, 2),
    loads: [{ nodeId: atPeak ? 4 : 3, fx: 0, fy: -load, label: `${load}N` }],
  };
}

function bracket(reach: number, height: number, load: number): Model {
  return {
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 0, y: height },
      { id: 3, x: reach, y: 0 },
    ],
    members: [wood(1, 1, 3), wood(2, 2, 3), wood(3, 1, 2)],
    supports: [
      { nodeId: 1, type: "pin" },
      { nodeId: 2, type: "rollerX" },
    ],
    loads: [{ nodeId: 3, fx: 0, fy: -load, label: `${load}N` }],
  };
}

function boom(reach: number, height: number, load: number): Model {
  return {
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 0, y: height },
      { id: 3, x: reach, y: height },
    ],
    members: [wood(1, 1, 2), wood(2, 2, 3), wood(3, 1, 3)],
    supports: [
      { nodeId: 1, type: "pin" },
      { nodeId: 2, type: "rollerX" },
    ],
    loads: [{ nodeId: 3, fx: 0, fy: -load, label: `${load}N` }],
  };
}

function slopedArm(reach: number, wall: number, tip: number, load: number): Model {
  return {
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 0, y: wall },
      { id: 3, x: reach, y: tip },
    ],
    members: [wood(1, 1, 3), wood(2, 2, 3), wood(3, 1, 2)],
    supports: [
      { nodeId: 1, type: "pin" },
      { nodeId: 2, type: "rollerX" },
    ],
    loads: [{ nodeId: 3, fx: 0, fy: -load, label: `${load}N` }],
  };
}

function warren(panel: number, rise: number, load: number, nodeId: number): Model {
  return {
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: panel, y: 0 },
      { id: 3, x: panel * 2, y: 0 },
      { id: 4, x: panel / 2, y: rise },
      { id: 5, x: panel * 1.5, y: rise },
    ],
    members: [wood(1, 1, 2), wood(2, 2, 3), wood(3, 1, 4), wood(4, 2, 4), wood(5, 4, 5), wood(6, 2, 5), wood(7, 3, 5)],
    supports: pinRoller(1, 3),
    loads: [{ nodeId, fx: 0, fy: -load, label: `${load}N` }],
  };
}

function trapezoid(span: number, rise: number, inset: number, load: number): Model {
  return {
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: span, y: 0 },
      { id: 3, x: inset, y: rise },
      { id: 4, x: span - inset, y: rise },
    ],
    members: [wood(1, 1, 2), wood(2, 1, 3), wood(3, 3, 4), wood(4, 4, 2), wood(5, 1, 4)],
    supports: pinRoller(1, 2),
    loads: [{ nodeId: 3, fx: 0, fy: -load, label: `${load}N` }],
  };
}

function hanging(span: number, drop: number, load: number): Model {
  return {
    nodes: [
      { id: 1, x: 0, y: drop },
      { id: 2, x: span, y: drop },
      { id: 3, x: span / 2, y: drop },
      { id: 4, x: span / 2, y: 0 },
    ],
    members: [wood(1, 1, 4), wood(2, 2, 4), wood(3, 3, 4), wood(4, 1, 3), wood(5, 3, 2)],
    supports: pinRoller(1, 2),
    loads: [{ nodeId: 4, fx: 0, fy: -load, label: `${load}N` }],
  };
}

function doubleBay(panel: number, height: number, load: number): Model {
  return {
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 0, y: height },
      { id: 3, x: panel, y: 0 },
      { id: 4, x: panel, y: height },
      { id: 5, x: panel * 2, y: 0 },
    ],
    members: [wood(1, 1, 2), wood(2, 1, 3), wood(3, 2, 3), wood(4, 3, 4), wood(5, 2, 4), wood(6, 4, 5), wood(7, 3, 5)],
    supports: [
      { nodeId: 1, type: "pin" },
      { nodeId: 2, type: "rollerX" },
    ],
    loads: [{ nodeId: 5, fx: 0, fy: -load, label: `${load}N` }],
  };
}

function keep(problem: JointProblem | null): problem is JointProblem {
  return problem !== null;
}

function catalog(): JointProblem[] {
  const drafted = [
    modelProblem("roof-steep-tie", "가파른 지붕, 꼭짓점 80N", roof(8, 6, 80), 1, 80),
    modelProblem("roof-flat-rafter", "낮은 지붕, 꼭짓점 60N", roof(12, 3, 60), 2, 60),
    modelProblem("roof-tall-right", "좁고 높은 지붕, 꼭짓점 40N", roof(6, 6, 40), 3, 40),
    modelProblem("roof-sideways", "지붕에 가로 50N", roof(8, 4, 0, 50), 2, 50),
    modelProblem("roof-offset-left", "꼭짓점이 왼쪽으로 치우친 지붕, 70N", offsetRoof(10, 3, 4, 70), 2, 70),
    modelProblem("roof-offset-right", "꼭짓점이 오른쪽으로 치우친 지붕, 90N", offsetRoof(10, 7, 5, 90), 3, 90),
    modelProblem("roof-wide-tie", "넓은 지붕, 꼭짓점 100N", roof(14, 4, 100), 1, 100),
    modelProblem("king-post", "킹포스트, 아랫변 중앙 80N", king(10, 4, 80, false), 3, 80),
    modelProblem("king-rafter", "킹포스트, 마루 60N", king(8, 3, 60, true), 1, 60),
    modelProblem("king-chord", "넓은 킹포스트, 아랫변 중앙 50N", king(12, 5, 50, false), 4, 50),
    modelProblem("king-peak-right", "높은 킹포스트, 마루 100N", king(8, 6, 100, true), 2, 100),
    modelProblem("bracket-diagonal", "짧은 벽 브라켓, 끝 60N", bracket(4, 3, 60), 2, 60),
    modelProblem("bracket-chord", "긴 벽 브라켓, 끝 40N", bracket(6, 4, 40), 1, 40),
    modelProblem("bracket-tall", "높은 벽 브라켓, 끝 80N", bracket(5, 6, 80), 2, 80),
    modelProblem("boom-chord", "내민 보, 끝 70N", boom(5, 4, 70), 2, 70),
    modelProblem("boom-diagonal", "높은 내민 보, 끝 50N", boom(4, 6, 50), 3, 50),
    modelProblem("slope-lower", "경사진 팔, 끝 60N", slopedArm(6, 5, 2, 60), 1, 60),
    modelProblem("slope-upper", "가파른 팔, 끝 80N", slopedArm(5, 6, 3, 80), 2, 80),
    modelProblem("warren-top", "와렌 트러스, 왼쪽 마루 80N", warren(4, 3, 80, 4), 4, 80),
    modelProblem("warren-bottom", "와렌 트러스, 아랫변 중앙 100N", warren(5, 4, 100, 2), 1, 100),
    modelProblem("warren-far", "낮은 와렌 트러스, 오른쪽 마루 60N", warren(6, 3, 60, 5), 6, 60),
    modelProblem("trap-tie", "사다리 지붕, 왼쪽 마루 90N", trapezoid(12, 4, 3, 90), 1, 90),
    modelProblem("trap-rafter", "좁은 사다리 지붕, 왼쪽 마루 50N", trapezoid(10, 5, 2, 50), 2, 50),
    modelProblem("hang-drop", "매달린 트러스, 아래 꼭짓점 70N", hanging(8, 4, 70), 1, 70),
    modelProblem("hang-slope", "깊게 매달린 트러스, 80N", hanging(10, 5, 80), 1, 80),
    modelProblem("bay-tip", "두 칸 내민 트러스, 끝 40N", doubleBay(4, 3, 40), 6, 40),
    modelProblem("bay-diagonal", "높은 두 칸 내민 트러스, 끝 60N", doubleBay(3, 4, 60), 7, 60),
  ];
  const problems = drafted.filter(keep);
  if (problems.length < 8) throw new Error("joint quiz catalog is too small");
  return problems;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = copy[i];
    copy[i] = copy[j];
    copy[j] = swap;
  }
  return copy;
}

let cached: JointProblem[] | null = null;

export function jointProblems(): JointProblem[] {
  cached ??= catalog();
  return shuffle(cached).map((problem) => ({ ...problem, choices: shuffle(problem.choices) }));
}

export const CONCEPTS: { q: string; options: string[]; answer: number; note: string }[] = [
  { q: "부재가 당겨질 때", options: ["인장", "압축", "전단"], answer: 0, note: "+ 파랑" },
  { q: "부재가 눌릴 때", options: ["인장", "압축", "모멘트"], answer: 1, note: "− 적색" },
  { q: "케이블의 압축 허용", options: ["인장과 같음", "0", "인장의 절반"], answer: 1, note: "압 0" },
  { q: "평면 트러스 정정", options: ["m = j", "m + r = 2j", "r = m"], answer: 1, note: "식 = 미지" },
  { q: "절점법 순서", options: ["긴 부재부터", "반력 → 미지 ≤ 2", "가운데부터"], answer: 1, note: "ΣFx, ΣFy" },
  { q: "부호가 바뀌는 부재", options: ["케이블", "강관·나무", "종이"], answer: 1, note: "양쪽 허용" },
];
