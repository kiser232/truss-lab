import { analyze, nodeLabel } from "./analyze";
import { signed } from "./format";
import { TRIPOD } from "./space";
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

const roof: Model = {
  nodes: [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 8, y: 0 },
    { id: 3, x: 4, y: 3 },
  ],
  members: [
    { id: 1, i: 1, j: 2, materialId: wood },
    { id: 2, i: 1, j: 3, materialId: wood },
    { id: 3, i: 2, j: 3, materialId: wood },
  ],
  supports: [
    { nodeId: 1, type: "pin" },
    { nodeId: 2, type: "rollerY" },
  ],
  loads: [{ nodeId: 3, fx: 0, fy: -48, label: "48N" }],
};

const king: Model = {
  nodes: [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 8, y: 0 },
    { id: 3, x: 4, y: 0 },
    { id: 4, x: 4, y: 3 },
  ],
  members: [
    { id: 1, i: 1, j: 4, materialId: wood },
    { id: 2, i: 2, j: 4, materialId: wood },
    { id: 3, i: 3, j: 4, materialId: "cable" },
    { id: 4, i: 1, j: 3, materialId: wood },
    { id: 5, i: 3, j: 2, materialId: wood },
  ],
  supports: [
    { nodeId: 1, type: "pin" },
    { nodeId: 2, type: "rollerY" },
  ],
  loads: [{ nodeId: 3, fx: 0, fy: -60, label: "60N" }],
};

const zero: Model = {
  nodes: [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 4, y: 0 },
    { id: 3, x: 8, y: 0 },
    { id: 4, x: 2, y: 3 },
    { id: 5, x: 6, y: 3 },
    { id: 6, x: 4, y: 4.5 },
  ],
  members: [
    { id: 1, i: 1, j: 2, materialId: wood },
    { id: 2, i: 2, j: 3, materialId: wood },
    { id: 3, i: 1, j: 4, materialId: wood },
    { id: 4, i: 4, j: 5, materialId: wood },
    { id: 5, i: 5, j: 3, materialId: wood },
    { id: 6, i: 2, j: 4, materialId: wood },
    { id: 7, i: 2, j: 5, materialId: wood },
    { id: 8, i: 4, j: 6, materialId: wood },
    { id: 9, i: 5, j: 6, materialId: wood },
  ],
  supports: [
    { nodeId: 1, type: "pin" },
    { nodeId: 3, type: "rollerY" },
  ],
  loads: [{ nodeId: 2, fx: 0, fy: -48, label: "48N" }],
};

const arm: Model = {
  nodes: [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 0, y: 3 },
    { id: 3, x: 4, y: 0 },
  ],
  members: [
    { id: 1, i: 1, j: 3, materialId: "tube" },
    { id: 2, i: 2, j: 3, materialId: "cable" },
    { id: 3, i: 1, j: 2, materialId: "tube" },
  ],
  supports: [
    { nodeId: 1, type: "pin" },
    { nodeId: 2, type: "rollerX" },
  ],
  loads: [{ nodeId: 3, fx: 0, fy: -60, label: "60N" }],
};

const pratt: Model = {
  nodes: [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 4, y: 0 },
    { id: 3, x: 8, y: 0 },
    { id: 4, x: 0, y: 3 },
    { id: 5, x: 4, y: 3 },
    { id: 6, x: 8, y: 3 },
  ],
  members: [
    { id: 1, i: 1, j: 2, materialId: wood },
    { id: 2, i: 2, j: 3, materialId: wood },
    { id: 3, i: 4, j: 5, materialId: wood },
    { id: 4, i: 5, j: 6, materialId: wood },
    { id: 5, i: 1, j: 4, materialId: wood },
    { id: 6, i: 2, j: 5, materialId: wood },
    { id: 7, i: 3, j: 6, materialId: wood },
    { id: 8, i: 4, j: 2, materialId: wood },
    { id: 9, i: 6, j: 2, materialId: wood },
  ],
  supports: [
    { nodeId: 1, type: "pin" },
    { nodeId: 3, type: "rollerY" },
  ],
  loads: [{ nodeId: 5, fx: 0, fy: -48, label: "48N" }],
};

const skew: Model = {
  nodes: [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 9, y: 0 },
    { id: 3, x: 3, y: 4 },
  ],
  members: [
    { id: 1, i: 1, j: 2, materialId: wood },
    { id: 2, i: 1, j: 3, materialId: wood },
    { id: 3, i: 2, j: 3, materialId: wood },
  ],
  supports: [
    { nodeId: 1, type: "pin" },
    { nodeId: 2, type: "rollerY" },
  ],
  loads: [{ nodeId: 3, fx: 0, fy: -36, label: "36N" }],
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
    return mix(
      problem.ask.options.map((text, index) => ({ text, ok: index === answer })),
      problem.id,
    );
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
  2019: "지붕 삼각형. 꼭짓점 48N. 경간 8m, 높이 3m.",
  2020: "킹포스트. 아래 가운데 60N. 수직재는 케이블.",
  2021: "위쪽 꼭짓점 F는 하중도 지점도 없습니다.",
  2022: "왼쪽 벽에서 나온 캔틸레버. 끝 60N.",
  2023: "프랫. 사재가 가운데로 내려갑니다. 위 가운데 48N.",
  2024: "비대칭 지붕, 그리고 공간 삼각대 60N.",
};

export const EXAMS: Problem[] = [
  {
    id: "2019-ac",
    year: 2019,
    title: "빗부재",
    blurb: YEAR_NOTES[2019],
    prompt: "AC의 축력",
    model: roof,
    ask: { kind: "axial", member: "AC" },
  },
  {
    id: "2019-ab",
    year: 2019,
    title: "밑변",
    blurb: YEAR_NOTES[2019],
    prompt: "AB의 축력",
    model: roof,
    ask: { kind: "axial", member: "AB" },
  },
  {
    id: "2019-ay",
    year: 2019,
    title: "수직반력",
    blurb: YEAR_NOTES[2019],
    prompt: "핀 A의 수직반력. 위가 +",
    model: roof,
    ask: { kind: "reaction", nodeId: 1, axis: "ry" },
  },
  {
    id: "2020-cd",
    year: 2020,
    title: "수직재",
    blurb: YEAR_NOTES[2020],
    prompt: "CD의 축력",
    model: king,
    ask: { kind: "axial", member: "CD" },
  },
  {
    id: "2020-ad",
    year: 2020,
    title: "빗재",
    blurb: YEAR_NOTES[2020],
    prompt: "AD의 축력",
    model: king,
    ask: { kind: "axial", member: "AD" },
  },
  {
    id: "2020-ac",
    year: 2020,
    title: "하현재",
    blurb: YEAR_NOTES[2020],
    prompt: "AC의 축력",
    model: king,
    ask: { kind: "axial", member: "AC" },
  },
  {
    id: "2021-df",
    year: 2021,
    title: "제로 부재",
    blurb: YEAR_NOTES[2021],
    prompt: "DF의 축력",
    model: zero,
    ask: { kind: "axial", member: "DF" },
  },
  {
    id: "2021-de",
    year: 2021,
    title: "상현재",
    blurb: YEAR_NOTES[2021],
    prompt: "DE의 축력",
    model: zero,
    ask: { kind: "axial", member: "DE" },
  },
  {
    id: "2021-ay",
    year: 2021,
    title: "수직반력",
    blurb: YEAR_NOTES[2021],
    prompt: "핀 A의 수직반력. 위가 +",
    model: zero,
    ask: { kind: "reaction", nodeId: 1, axis: "ry" },
  },
  {
    id: "2022-bc",
    year: 2022,
    title: "케이블",
    blurb: YEAR_NOTES[2022],
    prompt: "BC의 축력",
    model: arm,
    ask: { kind: "axial", member: "BC" },
  },
  {
    id: "2022-ac",
    year: 2022,
    title: "하현재",
    blurb: YEAR_NOTES[2022],
    prompt: "AC의 축력",
    model: arm,
    ask: { kind: "axial", member: "AC" },
  },
  {
    id: "2022-ax",
    year: 2022,
    title: "수평반력",
    blurb: YEAR_NOTES[2022],
    prompt: "핀 A의 수평반력. 오른쪽이 +",
    model: arm,
    ask: { kind: "reaction", nodeId: 1, axis: "rx" },
  },
  {
    id: "2023-be",
    year: 2023,
    title: "수직재",
    blurb: YEAR_NOTES[2023],
    prompt: "BE의 축력",
    model: pratt,
    ask: { kind: "axial", member: "BE" },
  },
  {
    id: "2023-bd",
    year: 2023,
    title: "사재",
    blurb: YEAR_NOTES[2023],
    prompt: "BD의 축력",
    model: pratt,
    ask: { kind: "axial", member: "BD" },
  },
  {
    id: "2023-ab",
    year: 2023,
    title: "하현재",
    blurb: YEAR_NOTES[2023],
    prompt: "AB의 축력",
    model: pratt,
    ask: { kind: "axial", member: "AB" },
  },
  {
    id: "2024-ac",
    year: 2024,
    title: "짧은 빗부재",
    blurb: YEAR_NOTES[2024],
    prompt: "AC의 축력. 하중은 왼쪽 위에 있습니다.",
    model: skew,
    ask: { kind: "axial", member: "AC" },
  },
  {
    id: "2024-by",
    year: 2024,
    title: "롤러 반력",
    blurb: YEAR_NOTES[2024],
    prompt: "롤러 B의 수직반력. 위가 +",
    model: skew,
    ask: { kind: "reaction", nodeId: 2, axis: "ry" },
  },
  {
    id: "2024-ad",
    year: 2024,
    title: "삼각대",
    blurb: YEAR_NOTES[2024],
    prompt: "꼭짓점 60N. AD의 축력",
    model: TRIPOD,
    ask: { kind: "axial", member: "AD" },
  },
  {
    id: "2024-degree",
    year: 2024,
    title: "정정",
    blurb: YEAR_NOTES[2024],
    prompt: "공간 트러스가 정정이려면",
    model: TRIPOD,
    ask: { kind: "choice", options: ["m + r = 2j", "m + r = 3j", "m = j", "r = 3"], answer: 1 },
  },
];

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
