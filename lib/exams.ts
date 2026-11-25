import { analyze, nodeLabel } from "./analyze";
import { signed } from "./format";
import type { Model } from "./types";

export type Choice = { text: string; ok: boolean };

export type Ask =
  | { kind: "axial"; member: string }
  | { kind: "reaction"; nodeId: number; axis: "rx" | "ry" | "rz" }
  | { kind: "choice"; options: string[]; answer: number };

export type Problem = {
  id: string;
  title: string;
  prompt: string;
  blurb: string;
  model: Model;
  ask: Ask;
  year?: number;
};

const wood = "wood";

const empty: Model = { nodes: [], members: [], supports: [], loads: [] };

/** 2019 2회 54. 밑변 T는 BC. 패널 2m, 높이 4m. */
const exam2019: Model = {
  nodes: [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 2, y: 0 },
    { id: 3, x: 4, y: 0 },
    { id: 4, x: 6, y: 0 },
    { id: 5, x: 8, y: 0 },
    { id: 6, x: 2, y: 2 },
    { id: 7, x: 6, y: 2 },
    { id: 8, x: 4, y: 4 },
  ],
  members: [
    [1, 2], [2, 3], [3, 4], [4, 5],
    [1, 6], [6, 8], [8, 7], [7, 5],
    [2, 6], [4, 7], [3, 8],
    [6, 3], [7, 3],
  ].map(([i, j], index) => ({ id: index + 1, i, j, materialId: wood })),
  supports: [
    { nodeId: 1, type: "pin" },
    { nodeId: 5, type: "rollerY" },
  ],
  loads: [
    { nodeId: 1, fx: 0, fy: -2, label: "2kN" },
    { nodeId: 5, fx: 0, fy: -2, label: "2kN" },
    { nodeId: 6, fx: 0, fy: -4, label: "4kN" },
    { nodeId: 7, fx: 0, fy: -4, label: "4kN" },
    { nodeId: 8, fx: 0, fy: -4, label: "4kN" },
  ],
};

/** 2021 1회 53. a부재는 FG. 패널 3m, 높이 4m. */
const exam2021: Model = {
  nodes: [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 3, y: 0 },
    { id: 3, x: 6, y: 0 },
    { id: 4, x: 9, y: 0 },
    { id: 5, x: 12, y: 0 },
    { id: 6, x: 3, y: 4 },
    { id: 7, x: 6, y: 4 },
    { id: 8, x: 9, y: 4 },
  ],
  members: [
    [1, 2], [2, 3], [3, 4], [4, 5],
    [6, 7], [7, 8],
    [2, 6], [3, 7], [4, 8],
    [1, 6], [2, 7], [7, 4], [8, 5],
  ].map(([i, j], index) => ({ id: index + 1, i, j, materialId: wood })),
  supports: [
    { nodeId: 1, type: "pin" },
    { nodeId: 5, type: "rollerY" },
  ],
  loads: [
    { nodeId: 6, fx: 0, fy: -20, label: "20kN" },
    { nodeId: 7, fx: 0, fy: -40, label: "40kN" },
    { nodeId: 8, fx: 0, fy: -20, label: "20kN" },
  ],
};

/** 2024 2회 41. N1은 AC(30°), N2는 AB. 벽은 핀 둘. */
const exam2024: Model = {
  nodes: [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 1.732, y: 0 },
    { id: 3, x: 1.732, y: 1 },
  ],
  members: [
    { id: 1, i: 1, j: 3, materialId: wood },
    { id: 2, i: 1, j: 2, materialId: wood },
  ],
  supports: [
    { nodeId: 2, type: "pin" },
    { nodeId: 3, type: "pin" },
  ],
  loads: [{ nodeId: 1, fx: 0, fy: -1, label: "1kN" }],
};

function axialText(value: number) {
  if (Math.abs(value) < 0.05) return "0";
  return `${signed(value)} ${value > 0 ? "인" : "압"}`;
}

function numericChoices(correct: number, textOf: (value: number) => string): Choice[] {
  const texts = new Map<string, boolean>();
  const add = (value: number, ok: boolean) => {
    const text = textOf(value);
    if (!texts.has(text)) texts.set(text, ok);
  };
  add(correct, true);
  const guesses = [0, -correct, Math.abs(correct) < 0.05 ? 16 : correct / 2, correct + (correct >= 0 ? 12 : -12)];
  for (const value of guesses) add(value, Math.abs(value - correct) < 0.2);
  let extra = 8;
  while (texts.size < 4) {
    add(correct + extra, false);
    extra += 6;
  }
  return [...texts.entries()].slice(0, 4).map(([text, ok]) => ({ text, ok }));
}

function mix(choices: Choice[], seed: string) {
  const weight = (text: string) => [...`${seed}:${text}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return [...choices].sort((a, b) => weight(a.text) - weight(b.text) || a.text.localeCompare(b.text));
}

export function problemChoices(problem: Problem): Choice[] {
  if (problem.ask.kind === "choice") {
    const answer = problem.ask.answer;
    return problem.ask.options.map((text, index) => ({ text, ok: index === answer }));
  }
  const result = analyze(problem.model);
  const ask = problem.ask;
  if (ask.kind === "axial") {
    const found = result.forces.find((item) => item.name === ask.member);
    if (!found) return [{ text: "부재 없음", ok: false }];
    return mix(numericChoices(found.axial, axialText), problem.id);
  }
  const reaction = result.reactions.find((item) => item.nodeId === ask.nodeId);
  const value = reaction?.[ask.axis] ?? 0;
  return mix(numericChoices(value, signed), problem.id);
}

export function correctText(problem: Problem) {
  return problemChoices(problem).find((choice) => choice.ok)?.text ?? "";
}

export const EXAM_YEARS = [2019, 2020, 2021, 2022, 2023, 2024] as const;

export const YEAR_NOTES: Record<number, string> = {
  2019: "2회 54. 대칭 트러스, 패널 2m. 밑변 T는 계산기의 BC.",
  2020: "원본 PDF. 라멘과 보의 반력·모멘트. 트러스로 옮길 수 있는 그림은 계산기에 그리세요.",
  2021: "1회 53. a부재는 계산기의 FG. 패널 3m, 높이 4m.",
  2022: "원본 PDF. 단면 응력과 라멘 모멘트.",
  2023: "원본 PDF. 내민보 반력과 모멘트 분배.",
  2024: "2회 41. N1은 AC, N2는 AB. 왼쪽 절점의 수직 1kN.",
};

export const EXAMS: Problem[] = [
  {
    id: "2019-t",
    year: 2019,
    title: "밑변 T",
    blurb: YEAR_NOTES[2019],
    prompt: "T부재의 축력. 계산기에서는 BC.",
    model: exam2019,
    ask: { kind: "choice", options: ["4kN", "6kN", "8kN", "16kN"], answer: 1 },
  },
  {
    id: "2019-arch",
    year: 2019,
    title: "3힌지 아치",
    blurb: "1회 49. 등분포하중을 받는 3힌지 아치. 그림은 왼쪽 원본.",
    prompt: "중앙 힌지 C의 전단력은?",
    model: empty,
    ask: { kind: "choice", options: ["0", "wL / 2", "wL / 4", "wL / 8"], answer: 0 },
  },
  {
    id: "2019-fixed",
    year: 2019,
    title: "고정단 모멘트",
    blurb: "4회 54. 양단 고정, 가운데 롤러, w=6kN/m, 좌우 각 2m. 그림은 왼쪽 원본.",
    prompt: "A고정단 모멘트의 절댓값",
    model: empty,
    ask: { kind: "choice", options: ["2kN·m", "3kN·m", "4kN·m", "5kN·m"], answer: 0 },
  },
  {
    id: "2021-a",
    year: 2021,
    title: "a부재",
    blurb: YEAR_NOTES[2021],
    prompt: "a부재의 축력. 계산기에서는 FG.",
    model: exam2021,
    ask: { kind: "choice", options: ["20kN 인장", "30kN 압축", "40kN 인장", "60kN 압축"], answer: 1 },
  },
  {
    id: "2024-n",
    year: 2024,
    title: "N1 · N2",
    blurb: YEAR_NOTES[2024],
    prompt: "N1, N2의 절댓값. N1은 AC, N2는 AB.",
    model: exam2024,
    ask: {
      kind: "choice",
      options: ["N1=2, N2=1.732", "N1=1, N2=0.866", "N1=1.5, N2=1", "N1=1, N2=1.732"],
      answer: 0,
    },
  },
];

export function examModel(id: string): Model | null {
  const problem = EXAMS.find((item) => item.id === id);
  if (!problem || problem.model.nodes.length < 2) return null;
  return problem.model;
}

export function examsFor(year: number) {
  return EXAMS.filter((problem) => problem.year === year);
}

export function memberOptions(model: Model) {
  const result = analyze(model);
  return result.forces.map((force) => force.name);
}

export function reactionOptions(model: Model) {
  return model.supports.flatMap((support) => {
    const letter = nodeLabel(model.nodes, support.nodeId);
    const axes: Array<"rx" | "ry" | "rz"> = support.type === "ball" || support.type === "pin" ? ["rx", "ry", "rz"] : support.type === "slot" ? ["ry", "rz"] : support.type === "rollerX" ? ["rx"] : ["ry"];
    return axes.map((axis) => ({
      nodeId: support.nodeId,
      axis,
      label: `${letter}${axis === "rx" ? "x" : axis === "ry" ? "y" : "z"}`,
    }));
  });
}
