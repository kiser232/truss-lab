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

function modelProblem(id: string, prompt: string, model: Model, memberNameWanted: string, extras: number[]): JointProblem {
  const result = analyze(model);
  const force = result.forces.find((item) => item.name === memberNameWanted);
  if (!force) throw new Error(`missing ${memberNameWanted}`);
  return { id, prompt: `${prompt} · ${memberNameWanted}`, model, choices: choicesFor(force.axial, extras) };
}

const house = (load: number): Model => ({
  nodes: [
    { id: 1, x: 2, y: 0 },
    { id: 2, x: 10, y: 0 },
    { id: 3, x: 6, y: 4 },
  ],
  members: [
    { id: 1, i: 1, j: 2, materialId: "wood" },
    { id: 2, i: 1, j: 3, materialId: "wood" },
    { id: 3, i: 2, j: 3, materialId: "wood" },
  ],
  supports: [
    { nodeId: 1, type: "pin" },
    { nodeId: 2, type: "rollerY" },
  ],
  loads: [{ nodeId: 3, fx: 0, fy: -load, label: `${load}N` }],
});

const king = (load: number): Model => ({
  nodes: [
    { id: 1, x: 2, y: 0 },
    { id: 2, x: 10, y: 0 },
    { id: 3, x: 6, y: 0 },
    { id: 4, x: 6, y: 3 },
  ],
  members: [
    { id: 1, i: 1, j: 4, materialId: "wood" },
    { id: 2, i: 2, j: 4, materialId: "wood" },
    { id: 3, i: 3, j: 4, materialId: "cable" },
    { id: 4, i: 1, j: 3, materialId: "cable" },
    { id: 5, i: 3, j: 2, materialId: "cable" },
  ],
  supports: [
    { nodeId: 1, type: "pin" },
    { nodeId: 2, type: "rollerY" },
  ],
  loads: [{ nodeId: 3, fx: 0, fy: -load, label: `${load}N` }],
});

const cantilever = (load: number): Model => ({
  nodes: [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 0, y: 3 },
    { id: 3, x: 4, y: 0 },
  ],
  members: [
    { id: 1, i: 1, j: 3, materialId: "concrete" },
    { id: 2, i: 2, j: 3, materialId: "cable" },
    { id: 3, i: 1, j: 2, materialId: "concrete" },
  ],
  supports: [
    { nodeId: 1, type: "pin" },
    { nodeId: 2, type: "rollerX" },
  ],
  loads: [{ nodeId: 3, fx: 0, fy: -load, label: `${load}N` }],
});

export function jointProblems(): JointProblem[] {
  const roof = house(60);
  const post = king(60);
  const arm = cantilever(70);
  return [
    modelProblem("roof-ab", "밑변", roof, "AB", [-30, 42.4, -42.4]),
    modelProblem("roof-ac", "빗부재", roof, "AC", [42.4, 30, -30]),
    modelProblem("post-cd", "수직재", post, "CD", [-60, 40, -50]),
    modelProblem("arm-bc", "빗재", arm, "BC", [-116.7, 70, -70]),
  ];
}

export const CONCEPTS: { q: string; options: string[]; answer: number; note: string }[] = [
  { q: "부재가 당겨질 때", options: ["인장", "압축", "전단"], answer: 0, note: "+ 파랑" },
  { q: "부재가 눌릴 때", options: ["인장", "압축", "모멘트"], answer: 1, note: "− 적색" },
  { q: "케이블의 압축 허용", options: ["인장과 같음", "0", "인장의 절반"], answer: 1, note: "압 0" },
  { q: "평면 트러스 정정", options: ["m = j", "m + r = 2j", "r = m"], answer: 1, note: "식 = 미지" },
  { q: "절점법 순서", options: ["긴 부재부터", "반력 → 미지 ≤ 2", "가운데부터"], answer: 1, note: "ΣFx, ΣFy" },
  { q: "부호가 바뀌는 부재", options: ["케이블", "강관·나무", "종이"], answer: 1, note: "양쪽 허용" },
];
