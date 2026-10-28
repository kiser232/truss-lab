import { analyze } from "./solver";
import type { TrussModel } from "./types";
import { QUIZ_MATERIALS, type QuizMaterial } from "./materials";

export type TrussKind = "warren" | "howe" | "pratt" | "kingpost" | "queenpost";

export type SortQuiz = {
  kind: "sort";
  id: string;
  prompt: string;
  showStats: boolean;
  cards: QuizMaterial[];
};

export type SpeedQuiz = {
  kind: "speed";
  id: string;
  prompt: string;
  figure: TrussKind;
  options: TrussKind[];
  seconds: number;
};

export type MemberQuiz = {
  kind: "members";
  id: string;
  prompt: string;
  ask: "tension" | "compression";
  model: TrussModel;
  correctIds: number[];
  blurb: string;
};

export type Quiz = SortQuiz | SpeedQuiz | MemberQuiz;

export const TRUSS_GUIDE: Record<
  TrussKind,
  { name: string; tell: string; why: string }
> = {
  warren: {
    name: "와렌 트러스",
    tell: "수직재 없이 정삼각형이 반복됩니다. 경사재가 인장과 압축을 번갈아 받습니다.",
    why: "부재 길이가 비슷해 제작이 단순합니다. 긴 경간의 교량에 자주 씁니다.",
  },
  howe: {
    name: "하우 트러스",
    tell: "수직재가 있고, 경사재가 중앙을 향해 위로 올라갑니다.",
    why: "경사재는 압축, 수직재는 인장이 되기 쉽습니다. 그래서 목재 경사재와 강봉 수직재 조합에 맞습니다.",
  },
  pratt: {
    name: "프랫 트러스",
    tell: "수직재가 있고, 경사재가 중앙을 향해 아래로 내려갑니다. 하우와 경사 방향이 반대입니다.",
    why: "경사재는 인장, 수직재는 압축이 되기 쉽습니다. 강재 경사재를 넣기에 유리합니다.",
  },
  kingpost: {
    name: "킹포스트 트러스",
    tell: "삼각형 지붕 한가운데에 수직재가 하나 있습니다.",
    why: "작은 경간의 지붕에 씁니다. 중앙 수직재는 종종 마룻점을 매달아 인장재가 됩니다.",
  },
  queenpost: {
    name: "퀸포스트 트러스",
    tell: "수직재가 두 개이고, 그 사이 위쪽에 수평재가 있습니다.",
    why: "킹포스트보다 경간을 조금 더 늘릴 때 씁니다. 두 수직재 사이에는 마룻보가 놓입니다.",
  },
};

const KIND_ORDER: TrussKind[] = ["warren", "howe", "pratt", "kingpost", "queenpost"];

export const QUIZ_PRESETS: { name: string; blurb: string; model: TrussModel }[] = [
  {
    name: "삼각형 지붕",
    blurb: "마루에 수직하중이 있으면 빗부재는 압축, 밑변(타이)은 인장입니다. 보의 아래쪽이 늘어나는 것과 같습니다.",
    model: {
      nodes: [
        { id: 1, x: 0, y: 0 },
        { id: 2, x: 4, y: 0 },
        { id: 3, x: 2, y: 2 },
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
      loads: [{ nodeId: 3, fx: 0, fy: -100 }],
    },
  },
  {
    name: "킹포스트",
    blurb: "돌이 밑변 한가운데를 누르면 수직재는 인장, 빗재는 압축, 하현재도 인장입니다.",
    model: {
      nodes: [
        { id: 1, x: 0, y: 0 },
        { id: 2, x: 4, y: 0 },
        { id: 3, x: 2, y: 0 },
        { id: 4, x: 2, y: 2 },
      ],
      members: [
        { id: 1, i: 1, j: 3, materialId: "wood" },
        { id: 2, i: 3, j: 2, materialId: "wood" },
        { id: 3, i: 1, j: 4, materialId: "wood" },
        { id: 4, i: 4, j: 2, materialId: "wood" },
        { id: 5, i: 3, j: 4, materialId: "wood" },
      ],
      supports: [
        { nodeId: 1, type: "pin" },
        { nodeId: 2, type: "rollerY" },
      ],
      loads: [{ nodeId: 3, fx: 0, fy: -80 }],
    },
  },
  {
    name: "작은 와렌",
    blurb: "상현재는 압축, 하현재는 인장입니다. 이 하중에서는 안쪽 경사재 둘이 영부재라서 인장도 압축도 아닙니다. 영부재는 고르면 안 됩니다.",
    model: {
      nodes: [
        { id: 1, x: 0, y: 0 },
        { id: 2, x: 2, y: 0 },
        { id: 3, x: 4, y: 0 },
        { id: 4, x: 1, y: 2 },
        { id: 5, x: 3, y: 2 },
      ],
      members: [
        { id: 1, i: 1, j: 2, materialId: "tube" },
        { id: 2, i: 2, j: 3, materialId: "tube" },
        { id: 3, i: 4, j: 5, materialId: "tube" },
        { id: 4, i: 1, j: 4, materialId: "tube" },
        { id: 5, i: 4, j: 2, materialId: "tube" },
        { id: 6, i: 2, j: 5, materialId: "tube" },
        { id: 7, i: 5, j: 3, materialId: "tube" },
      ],
      supports: [
        { nodeId: 1, type: "pin" },
        { nodeId: 3, type: "rollerY" },
      ],
      loads: [
        { nodeId: 4, fx: 0, fy: -40 },
        { nodeId: 5, fx: 0, fy: -40 },
      ],
    },
  },
];

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const item = copy[index];
    copy[index] = copy[swap];
    copy[swap] = item;
  }
  return copy;
}

let quizSerial = 1;

export function createQuiz(random: () => number = Math.random, previous?: Quiz["kind"]): Quiz {
  const kinds: Quiz["kind"][] = ["sort", "speed", "members"];
  let kind = kinds[Math.floor(random() * kinds.length)];
  if (previous && kind === previous) kind = kinds[(kinds.indexOf(kind) + 1 + Math.floor(random() * 2)) % kinds.length];
  quizSerial += 1;
  if (kind === "sort") return createSortQuiz(random, quizSerial);
  if (kind === "speed") return createSpeedQuiz(random, quizSerial);
  return createMemberQuiz(random, quizSerial);
}

function createSortQuiz(random: () => number, serial: number): SortQuiz {
  const tension = shuffle(
    QUIZ_MATERIALS.filter((material) => material.group === "tension"),
    random,
  ).slice(0, 2);
  const compression = shuffle(
    QUIZ_MATERIALS.filter((material) => material.group === "compression"),
    random,
  ).slice(0, 2);
  const showStats = random() < 0.5;
  return {
    kind: "sort",
    id: `sort-${serial}`,
    showStats,
    prompt: showStats
      ? "카드의 허용축력을 비교해 인장에 강한 재료와 압축에 강한 재료로 나누세요."
      : "이름과 모양만 보고, 인장에 강한 재료와 압축에 강한 재료로 나누세요.",
    cards: shuffle([...tension, ...compression], random),
  };
}

function createSpeedQuiz(random: () => number, serial: number): SpeedQuiz {
  const figure = KIND_ORDER[Math.floor(random() * KIND_ORDER.length)];
  const distractors = shuffle(
    KIND_ORDER.filter((kind) => kind !== figure),
    random,
  ).slice(0, 3);
  return {
    kind: "speed",
    id: `speed-${serial}`,
    prompt: "트러스 형식을 고르세요.",
    figure,
    options: shuffle([figure, ...distractors], random),
    seconds: 9,
  };
}

function createMemberQuiz(random: () => number, serial: number): Quiz {
  const presets = shuffle(QUIZ_PRESETS, random);
  for (const preset of presets) {
    const analysis = analyze(preset.model);
    if (analysis.status !== "ok" && analysis.status !== "overstressed") continue;
    const tension = analysis.forces.filter((force) => force.mode === "tension").map((force) => force.memberId);
    const compression = analysis.forces.filter((force) => force.mode === "compression").map((force) => force.memberId);
    const choices: Array<"tension" | "compression"> = [];
    if (tension.length > 0) choices.push("tension");
    if (compression.length > 0) choices.push("compression");
    if (choices.length === 0) continue;
    const ask = choices[Math.floor(random() * choices.length)];
    const correctIds = ask === "tension" ? tension : compression;
    return {
      kind: "members",
      id: `members-${serial}`,
      ask,
      model: preset.model,
      correctIds,
      blurb: preset.blurb,
      prompt:
        ask === "tension"
          ? `${preset.name}에서 인장력을 받는 부재를 모두 고르세요. 힘이 없는 부재는 포함하지 않습니다.`
          : `${preset.name}에서 압축력을 받는 부재를 모두 고르세요. 힘이 없는 부재는 포함하지 않습니다.`,
    };
  }
  return createSortQuiz(random, serial);
}
