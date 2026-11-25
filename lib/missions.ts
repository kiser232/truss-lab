import type { Model } from "./types";

export type Mission = {
  id: number;
  title: string;
  kicker: string;
  budget: number;
  scene: "valley" | "road" | "cliff" | "desk";
  hint: string;
  story: string;
  space?: boolean;
  passers?: "kids";
  required?: [number, number][];
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
    story: "아침 안개가 낀 계곡이다. 마을 아이들은 8m 틈을 건너야 학교에 간다. 왼쪽 바위는 핀처럼 고정되고, 오른쪽은 롤러처럼 미끄러진다. 가운데 발판에 60N의 짐이 내려앉는다. 점선으로 표시된 발판을 이어 삼각형을 세워라.",
    nodes: [
      { id: 1, x: 2, y: 0 },
      { id: 2, x: 10, y: 0 },
      { id: 3, x: 6, y: 0 },
    ],
    fixedNodeIds: [1, 2, 3],
    supports: [pin(1), rollerY(2)],
    staticLoads: [{ nodeId: 3, fx: 0, fy: -60, label: "60N" }],
    car: null,
    passers: "kids",
    required: [[1, 3], [3, 2]],
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
    story: "다리가 길어지자 상인 둘이 동시에 건너온다. 4m와 8m 지점에 각각 55N. 한 칸짜리 삼각형으로는 둘을 동시에 받을 수 없다. 하중마다 작은 삼각형을 만들어 계곡을 건너게 하라. 점선으로 표시된 발판은 반드시 이어야 한다.",
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
    required: [[1, 3], [3, 4], [4, 2]],
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
    story: "왼쪽에는 돌수레 90N, 오른쪽에는 가벼운 짐 30N이 선다. 모양은 대칭처럼 보여도 힘은 한쪽으로 기운다. 무거운 쪽의 압축 부재만 단단한 재료로 바꿔 예산을 지켜라.",
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
    required: [[1, 3], [3, 4], [4, 2]],
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
    story: "포장된 도로 0m에서 8m까지, 80N짜리 자동차가 천천히 지나간다. 차가 있는 자리마다 부재의 힘이 바뀐다. 인장과 압축이 뒤집히는 자리에는 케이블을 두면 안 된다.",
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
    required: [[1, 2], [2, 3], [3, 4], [4, 5]],
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
    story: "절벽 위 전망대. 한 사람이 난간 끝으로 걸어가 70N으로 선다. 벽은 핀과 가로 롤러가 붙잡고, 발판은 4m를 내민다. 사람을 떨어뜨리지 않을 팔과 바닥을 만들어라.",
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 0, y: 3 },
      { id: 3, x: 4, y: 0 },
    ],
    fixedNodeIds: [1, 2, 3],
    supports: [pin(1), rollerX(2)],
    staticLoads: [{ nodeId: 3, fx: 0, fy: -70, label: "70N" }],
    car: null,
    required: [[1, 3]],
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
    story: "창고 지붕 한가운데 100N의 곡식 자루가 매달린다. 모든 부재를 강관으로 바꾸면 예산이 하루 만에 바닥난다. 당기는 곳에는 케이블, 누르는 곳에는 콘크리트를 배치하라.",
    nodes: [
      { id: 1, x: 2, y: 0 },
      { id: 2, x: 10, y: 0 },
      { id: 3, x: 6, y: 0 },
    ],
    fixedNodeIds: [1, 2, 3],
    supports: [pin(1), rollerY(2)],
    staticLoads: [{ nodeId: 3, fx: 0, fy: -100, label: "100N" }],
    car: null,
    required: [[1, 3], [3, 2]],
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
    story: "축제 날, 120N 트럭이 다리를 지나고 가운데에는 50N 돌무더기가 그대로 남아 있다. 차가 움직이는 동안 부호가 바뀌는 부재와, 항상 당겨지기만 하는 부재를 구분하라.",
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
    required: [[1, 2], [2, 3], [3, 4], [4, 5]],
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
    story: "경진대회 책상 위 6m. 쓸 수 있는 재료는 종이, 스파게티, 수수깡뿐이다. 책이 쌓일수록 점수는 책 무게를 재료비로 나눈 값이 된다. 짧게 눌러 버티고, 길게 당겨 올려라.",
    nodes: [
      { id: 1, x: 3, y: 0 },
      { id: 2, x: 9, y: 0 },
      { id: 3, x: 6, y: 0 },
    ],
    fixedNodeIds: [1, 2, 3],
    supports: [pin(1), rollerY(2)],
    staticLoads: [],
    car: null,
    required: [[1, 3], [3, 2]],
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
  {
    id: 9,
    title: "등불",
    kicker: "9",
    budget: 120,
    scene: "desk",
    space: true,
    hint: "세 발이 꼭짓점을 받친다 · 강관",
    story: "밤 축제. 광장 한가운데 등불 60N을 공중에 매달아야 한다. 바닥의 세 점은 볼 지점이고, 등불은 그 위 2m에 있다. 평면이 아니라 공간으로 세 부재를 올려 등불이 흔들리지 않게 하라.",
    nodes: [
      { id: 1, x: 2, y: 0, z: 0 },
      { id: 2, x: -1, y: 0, z: 1.7 },
      { id: 3, x: -1, y: 0, z: -1.7 },
      { id: 4, x: 0, y: 2, z: 0 },
    ],
    fixedNodeIds: [1, 2, 3, 4],
    supports: [
      { nodeId: 1, type: "ball" },
      { nodeId: 2, type: "ball" },
      { nodeId: 3, type: "ball" },
    ],
    staticLoads: [{ nodeId: 4, fx: 0, fy: -60, label: "60N" }],
    car: null,
    required: [[1, 4], [2, 4], [3, 4]],
    materials: "lab",
    example: {
      nodes: [
        { id: 1, x: 2, y: 0, z: 0 },
        { id: 2, x: -1, y: 0, z: 1.7 },
        { id: 3, x: -1, y: 0, z: -1.7 },
        { id: 4, x: 0, y: 2, z: 0 },
      ],
      members: [
        { id: 1, i: 1, j: 4, materialId: "tube" },
        { id: 2, i: 2, j: 4, materialId: "tube" },
        { id: 3, i: 3, j: 4, materialId: "tube" },
      ],
      supports: [
        { nodeId: 1, type: "ball" },
        { nodeId: 2, type: "ball" },
        { nodeId: 3, type: "ball" },
      ],
      loads: [{ nodeId: 4, fx: 0, fy: -60, label: "60N" }],
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
