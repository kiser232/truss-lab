import type { Model } from "./types";

export type Mission = {
  id: number;
  title: string;
  kicker: string;
  budget: number;
  scene: "valley" | "road" | "cliff" | "desk";
  hint: string;
  story: string;
  nodes: Model["nodes"];
  fixedNodeIds: number[];
  supports: Model["supports"];
  staticLoads: Model["loads"];
  car: { road: number[]; weight: number; samples: number } | null;
  contest?: boolean;
  bookNodeId?: number;
  materials: "lab" | "contest";
  example: Model;
};

const pin = (nodeId: number): Model["supports"][number] => ({ nodeId, type: "pin" });
const rollerY = (nodeId: number): Model["supports"][number] => ({ nodeId, type: "rollerY" });
const rollerX = (nodeId: number): Model["supports"][number] => ({ nodeId, type: "rollerX" });

export const MISSIONS: Mission[] = [
  {
    id: 1,
    title: "삼각형",
    kicker: "1",
    budget: 88,
    scene: "valley",
    hint: "꼭짓점 ↑ · 빗재 압 · 수직·하현재 인",
    story: "8m 계곡. 왼쪽 핀, 오른쪽 롤러. 가운데 60N.",
    nodes: [
      { id: 1, x: 2, y: 0 },
      { id: 2, x: 10, y: 0 },
      { id: 3, x: 6, y: 0 },
    ],
    fixedNodeIds: [1, 2, 3],
    supports: [pin(1), rollerY(2)],
    staticLoads: [{ nodeId: 3, fx: 0, fy: -60, label: "60N" }],
    car: null,
    materials: "lab",
    example: {
      nodes: [
        { id: 1, x: 2, y: 0 },
        { id: 2, x: 10, y: 0 },
        { id: 3, x: 6, y: 0 },
        { id: 4, x: 6, y: 3 },
      ],
      members: [
        { id: 1, i: 1, j: 4, materialId: "wood" },
        { id: 2, i: 2, j: 4, materialId: "wood" },
        { id: 3, i: 3, j: 4, materialId: "bamboo" },
        { id: 4, i: 1, j: 3, materialId: "bamboo" },
        { id: 5, i: 3, j: 2, materialId: "bamboo" },
      ],
      supports: [pin(1), rollerY(2)],
      loads: [{ nodeId: 3, fx: 0, fy: -60, label: "60N" }],
    },
  },
  {
    id: 2,
    title: "두 절점",
    kicker: "2",
    budget: 150,
    scene: "valley",
    hint: "하중마다 삼각형 · 수직 인 · 바깥 빗재 압",
    story: "같은 계곡. 4m, 8m 지점에 55N씩.",
    nodes: [
      { id: 1, x: 2, y: 0 },
      { id: 2, x: 10, y: 0 },
      { id: 3, x: 4, y: 0 },
      { id: 4, x: 8, y: 0 },
    ],
    fixedNodeIds: [1, 2, 3, 4],
    supports: [pin(1), rollerY(2)],
    staticLoads: [
      { nodeId: 3, fx: 0, fy: -55, label: "55N" },
      { nodeId: 4, fx: 0, fy: -55, label: "55N" },
    ],
    car: null,
    materials: "lab",
    example: {
      nodes: [
        { id: 1, x: 2, y: 0 },
        { id: 2, x: 10, y: 0 },
        { id: 3, x: 4, y: 0 },
        { id: 4, x: 8, y: 0 },
        { id: 5, x: 4, y: 3 },
        { id: 6, x: 8, y: 3 },
      ],
      members: [
        { id: 1, i: 1, j: 3, materialId: "bamboo" },
        { id: 2, i: 3, j: 4, materialId: "bamboo" },
        { id: 3, i: 4, j: 2, materialId: "bamboo" },
        { id: 4, i: 5, j: 6, materialId: "wood" },
        { id: 5, i: 3, j: 5, materialId: "bamboo" },
        { id: 6, i: 4, j: 6, materialId: "bamboo" },
        { id: 7, i: 1, j: 5, materialId: "concrete" },
        { id: 8, i: 5, j: 4, materialId: "plastic" },
        { id: 9, i: 6, j: 2, materialId: "concrete" },
      ],
      supports: [pin(1), rollerY(2)],
      loads: [
        { nodeId: 3, fx: 0, fy: -55, label: "55N" },
        { nodeId: 4, fx: 0, fy: -55, label: "55N" },
      ],
    },
  },
  {
    id: 3,
    title: "비대칭",
    kicker: "3",
    budget: 150,
    scene: "valley",
    hint: "큰 하중 쪽만 비싼 압축재",
    story: "왼쪽 90N, 오른쪽 30N. 모양은 같아도 힘은 다름.",
    nodes: [
      { id: 1, x: 2, y: 0 },
      { id: 2, x: 10, y: 0 },
      { id: 3, x: 4, y: 0 },
      { id: 4, x: 8, y: 0 },
    ],
    fixedNodeIds: [1, 2, 3, 4],
    supports: [pin(1), rollerY(2)],
    staticLoads: [
      { nodeId: 3, fx: 0, fy: -90, label: "90N" },
      { nodeId: 4, fx: 0, fy: -30, label: "30N" },
    ],
    car: null,
    materials: "lab",
    example: {
      nodes: [
        { id: 1, x: 2, y: 0 },
        { id: 2, x: 10, y: 0 },
        { id: 3, x: 4, y: 0 },
        { id: 4, x: 8, y: 0 },
        { id: 5, x: 4, y: 3 },
        { id: 6, x: 8, y: 3 },
      ],
      members: [
        { id: 1, i: 1, j: 3, materialId: "bamboo" },
        { id: 2, i: 3, j: 4, materialId: "bamboo" },
        { id: 3, i: 4, j: 2, materialId: "plastic" },
        { id: 4, i: 5, j: 6, materialId: "bamboo" },
        { id: 5, i: 3, j: 5, materialId: "cable" },
        { id: 6, i: 4, j: 6, materialId: "bamboo" },
        { id: 7, i: 1, j: 5, materialId: "concrete" },
        { id: 8, i: 5, j: 4, materialId: "bamboo" },
        { id: 9, i: 6, j: 2, materialId: "wood" },
      ],
      supports: [pin(1), rollerY(2)],
      loads: [
        { nodeId: 3, fx: 0, fy: -90, label: "90N" },
        { nodeId: 4, fx: 0, fy: -30, label: "30N" },
      ],
    },
  },
  {
    id: 4,
    title: "이동 하중",
    kicker: "4",
    budget: 176,
    scene: "road",
    hint: "부호가 바뀌면 케이블 금지",
    story: "0–8m 도로. 80N 자동차가 지나감.",
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 2, y: 0 },
      { id: 3, x: 4, y: 0 },
      { id: 4, x: 6, y: 0 },
      { id: 5, x: 8, y: 0 },
    ],
    fixedNodeIds: [1, 2, 3, 4, 5],
    supports: [pin(1), rollerY(5)],
    staticLoads: [],
    car: { road: [1, 2, 3, 4, 5], weight: 80, samples: 9 },
    materials: "lab",
    example: {
      nodes: [
        { id: 1, x: 0, y: 0 },
        { id: 2, x: 2, y: 0 },
        { id: 3, x: 4, y: 0 },
        { id: 4, x: 6, y: 0 },
        { id: 5, x: 8, y: 0 },
        { id: 6, x: 2, y: 3 },
        { id: 7, x: 4, y: 3 },
        { id: 8, x: 6, y: 3 },
      ],
      members: [
        { id: 1, i: 1, j: 2, materialId: "bamboo" },
        { id: 2, i: 2, j: 3, materialId: "bamboo" },
        { id: 3, i: 3, j: 4, materialId: "bamboo" },
        { id: 4, i: 4, j: 5, materialId: "bamboo" },
        { id: 5, i: 6, j: 7, materialId: "wood" },
        { id: 6, i: 7, j: 8, materialId: "wood" },
        { id: 7, i: 2, j: 6, materialId: "cable" },
        { id: 8, i: 3, j: 7, materialId: "plastic" },
        { id: 9, i: 4, j: 8, materialId: "cable" },
        { id: 10, i: 1, j: 6, materialId: "concrete" },
        { id: 11, i: 6, j: 3, materialId: "bamboo" },
        { id: 12, i: 3, j: 8, materialId: "bamboo" },
        { id: 13, i: 8, j: 5, materialId: "concrete" },
      ],
      supports: [pin(1), rollerY(5)],
      loads: [],
    },
  },
  {
    id: 5,
    title: "캔틸레버",
    kicker: "5",
    budget: 76,
    scene: "cliff",
    hint: "빗재 인 · 바닥 압 · 케이블을 바닥에 두지 말 것",
    story: "벽 핀 + 수평 롤러. 끝 70N. 내민 길이 4m.",
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 0, y: 3 },
      { id: 3, x: 4, y: 0 },
    ],
    fixedNodeIds: [1, 2, 3],
    supports: [pin(1), rollerX(2)],
    staticLoads: [{ nodeId: 3, fx: 0, fy: -70, label: "70N" }],
    car: null,
    materials: "lab",
    example: {
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
      supports: [pin(1), rollerX(2)],
      loads: [{ nodeId: 3, fx: 0, fy: -70, label: "70N" }],
    },
  },
  {
    id: 6,
    title: "재료 배치",
    kicker: "6",
    budget: 120,
    scene: "valley",
    hint: "인장 케이블 · 압축 콘크리트",
    story: "가운데 100N. 강관만 쓰면 예산이 터짐.",
    nodes: [
      { id: 1, x: 2, y: 0 },
      { id: 2, x: 10, y: 0 },
      { id: 3, x: 6, y: 0 },
    ],
    fixedNodeIds: [1, 2, 3],
    supports: [pin(1), rollerY(2)],
    staticLoads: [{ nodeId: 3, fx: 0, fy: -100, label: "100N" }],
    car: null,
    materials: "lab",
    example: {
      nodes: [
        { id: 1, x: 2, y: 0 },
        { id: 2, x: 10, y: 0 },
        { id: 3, x: 6, y: 0 },
        { id: 4, x: 6, y: 3 },
      ],
      members: [
        { id: 1, i: 1, j: 4, materialId: "concrete" },
        { id: 2, i: 2, j: 4, materialId: "concrete" },
        { id: 3, i: 3, j: 4, materialId: "cable" },
        { id: 4, i: 1, j: 3, materialId: "bamboo" },
        { id: 5, i: 3, j: 2, materialId: "bamboo" },
      ],
      supports: [pin(1), rollerY(2)],
      loads: [{ nodeId: 3, fx: 0, fy: -100, label: "100N" }],
    },
  },
  {
    id: 7,
    title: "종합",
    kicker: "7",
    budget: 188,
    scene: "road",
    hint: "바뀌는 부재는 강관 · 항상 인장은 케이블",
    story: "트럭 120N이 지나고, 가운데 돌 50N이 계속 있음.",
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 2, y: 0 },
      { id: 3, x: 4, y: 0 },
      { id: 4, x: 6, y: 0 },
      { id: 5, x: 8, y: 0 },
    ],
    fixedNodeIds: [1, 2, 3, 4, 5],
    supports: [pin(1), rollerY(5)],
    staticLoads: [{ nodeId: 3, fx: 0, fy: -50, label: "50N" }],
    car: { road: [1, 2, 3, 4, 5], weight: 120, samples: 9 },
    materials: "lab",
    example: {
      nodes: [
        { id: 1, x: 0, y: 0 },
        { id: 2, x: 2, y: 0 },
        { id: 3, x: 4, y: 0 },
        { id: 4, x: 6, y: 0 },
        { id: 5, x: 8, y: 0 },
        { id: 6, x: 2, y: 3 },
        { id: 7, x: 4, y: 3 },
        { id: 8, x: 6, y: 3 },
      ],
      members: [
        { id: 1, i: 1, j: 2, materialId: "cable" },
        { id: 2, i: 2, j: 3, materialId: "cable" },
        { id: 3, i: 3, j: 4, materialId: "cable" },
        { id: 4, i: 4, j: 5, materialId: "cable" },
        { id: 5, i: 6, j: 7, materialId: "concrete" },
        { id: 6, i: 7, j: 8, materialId: "concrete" },
        { id: 7, i: 2, j: 6, materialId: "cable" },
        { id: 8, i: 3, j: 7, materialId: "plastic" },
        { id: 9, i: 4, j: 8, materialId: "cable" },
        { id: 10, i: 1, j: 6, materialId: "concrete" },
        { id: 11, i: 6, j: 3, materialId: "rebar" },
        { id: 12, i: 3, j: 8, materialId: "rebar" },
        { id: 13, i: 8, j: 5, materialId: "concrete" },
      ],
      supports: [pin(1), rollerY(5)],
      loads: [{ nodeId: 3, fx: 0, fy: -50, label: "50N" }],
    },
  },
  {
    id: 8,
    title: "책 하중",
    kicker: "경진",
    budget: 120,
    scene: "desk",
    hint: "압축재는 짧게 · 당기는 부재는 종이",
    story: "6m 책상. 종이·스파게티·수수깡만. 점수 = 책 무게 ÷ 재료비.",
    nodes: [
      { id: 1, x: 3, y: 0 },
      { id: 2, x: 9, y: 0 },
      { id: 3, x: 6, y: 0 },
    ],
    fixedNodeIds: [1, 2, 3],
    supports: [pin(1), rollerY(2)],
    staticLoads: [],
    car: null,
    contest: true,
    bookNodeId: 3,
    materials: "contest",
    example: {
      nodes: [
        { id: 1, x: 3, y: 0 },
        { id: 2, x: 9, y: 0 },
        { id: 3, x: 6, y: 0 },
        { id: 4, x: 4.5, y: 0 },
        { id: 5, x: 7.5, y: 0 },
        { id: 6, x: 4.5, y: 2 },
        { id: 7, x: 7.5, y: 2 },
      ],
      members: [
        { id: 1, i: 1, j: 4, materialId: "paper" },
        { id: 2, i: 4, j: 3, materialId: "paper" },
        { id: 3, i: 3, j: 5, materialId: "paper" },
        { id: 4, i: 5, j: 2, materialId: "paper" },
        { id: 5, i: 1, j: 6, materialId: "skewer" },
        { id: 6, i: 4, j: 6, materialId: "paper" },
        { id: 7, i: 6, j: 3, materialId: "skewer" },
        { id: 8, i: 6, j: 7, materialId: "skewer" },
        { id: 9, i: 3, j: 7, materialId: "skewer" },
        { id: 10, i: 5, j: 7, materialId: "paper" },
        { id: 11, i: 7, j: 2, materialId: "skewer" },
      ],
      supports: [pin(1), rollerY(2)],
      loads: [],
    },
  },
];

export function blankMissionModel(mission: Mission): Model {
  return {
    nodes: mission.nodes.map((node) => ({ ...node })),
    members: [],
    supports: mission.supports.map((support) => ({ ...support })),
    loads: mission.contest
      ? []
      : mission.staticLoads.map((load) => ({ ...load })),
  };
}

export function exampleModel(mission: Mission, books = 1): Model {
  return {
    ...mission.example,
    nodes: mission.example.nodes.map((node) => ({ ...node })),
    members: mission.example.members.map((member) => ({ ...member })),
    supports: mission.supports.map((support) => ({ ...support })),
    loads: mission.contest
      ? [{ nodeId: mission.bookNodeId ?? 3, fx: 0, fy: -20 * Math.max(1, books), label: `${Math.max(1, books)}권` }]
      : mission.example.loads.map((load) => ({ ...load })),
  };
}
