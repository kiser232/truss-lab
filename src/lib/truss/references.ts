import type { Member, Node } from "./types";

/** 교사용 예시 답안. 화면에는 나오지 않는다. */
export type ReferenceDesign = {
  stageId: number;
  nodes: Node[];
  members: Member[];
};

export const REFERENCES: ReferenceDesign[] = [
  {
    stageId: 1,
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 6, y: 0 },
      { id: 3, x: 3, y: 0 },
      { id: 4, x: 3, y: 3 },
    ],
    members: [
      { id: 1, i: 1, j: 3, materialId: "plastic" },
      { id: 2, i: 3, j: 2, materialId: "plastic" },
      { id: 3, i: 1, j: 4, materialId: "wood" },
      { id: 4, i: 4, j: 2, materialId: "wood" },
      { id: 5, i: 3, j: 4, materialId: "cable" },
    ],
  },
  {
    stageId: 2,
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 8, y: 0 },
      { id: 3, x: 2, y: 0 },
      { id: 4, x: 6, y: 0 },
      { id: 5, x: 2, y: 3 },
      { id: 6, x: 6, y: 3 },
    ],
    members: [
      { id: 1, i: 1, j: 3, materialId: "cable" },
      { id: 2, i: 3, j: 4, materialId: "cable" },
      { id: 3, i: 4, j: 2, materialId: "cable" },
      { id: 4, i: 1, j: 5, materialId: "concrete" },
      { id: 5, i: 5, j: 6, materialId: "wood" },
      { id: 6, i: 6, j: 2, materialId: "concrete" },
      { id: 7, i: 3, j: 5, materialId: "cable" },
      { id: 8, i: 4, j: 6, materialId: "cable" },
      { id: 9, i: 5, j: 4, materialId: "plastic" },
    ],
  },
  {
    stageId: 3,
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 8, y: 0 },
      { id: 3, x: 2, y: 0 },
      { id: 4, x: 6, y: 0 },
      { id: 5, x: 2, y: 3 },
      { id: 6, x: 6, y: 3 },
    ],
    members: [
      { id: 1, i: 1, j: 3, materialId: "cable" },
      { id: 2, i: 3, j: 4, materialId: "cable" },
      { id: 3, i: 4, j: 2, materialId: "plastic" },
      { id: 4, i: 1, j: 5, materialId: "concrete" },
      { id: 5, i: 5, j: 6, materialId: "bamboo" },
      { id: 6, i: 6, j: 2, materialId: "wood" },
      { id: 7, i: 3, j: 5, materialId: "cable" },
      { id: 8, i: 4, j: 6, materialId: "cable" },
      { id: 9, i: 5, j: 4, materialId: "bamboo" },
    ],
  },
  {
    stageId: 4,
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
      { id: 5, i: 6, j: 7, materialId: "wood" },
      { id: 6, i: 7, j: 8, materialId: "wood" },
      { id: 7, i: 1, j: 6, materialId: "concrete" },
      { id: 8, i: 8, j: 5, materialId: "concrete" },
      { id: 9, i: 2, j: 6, materialId: "cable" },
      { id: 10, i: 3, j: 7, materialId: "bamboo" },
      { id: 11, i: 4, j: 8, materialId: "cable" },
      { id: 12, i: 6, j: 3, materialId: "bamboo" },
      { id: 13, i: 7, j: 4, materialId: "wood" },
    ],
  },
  {
    stageId: 5,
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 0, y: 3 },
      { id: 3, x: 4, y: 0 },
    ],
    members: [
      { id: 1, i: 1, j: 2, materialId: "concrete" },
      { id: 2, i: 2, j: 3, materialId: "cable" },
      { id: 3, i: 1, j: 3, materialId: "concrete" },
    ],
  },
  {
    stageId: 6,
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 8, y: 0 },
      { id: 3, x: 4, y: 0 },
      { id: 4, x: 4, y: 3 },
    ],
    members: [
      { id: 1, i: 1, j: 3, materialId: "cable" },
      { id: 2, i: 3, j: 2, materialId: "cable" },
      { id: 3, i: 1, j: 4, materialId: "concrete" },
      { id: 4, i: 4, j: 2, materialId: "concrete" },
      { id: 5, i: 3, j: 4, materialId: "cable" },
    ],
  },
  {
    stageId: 7,
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
      { id: 7, i: 1, j: 6, materialId: "concrete" },
      { id: 8, i: 8, j: 5, materialId: "concrete" },
      { id: 9, i: 2, j: 6, materialId: "cable" },
      { id: 10, i: 3, j: 7, materialId: "plastic" },
      { id: 11, i: 4, j: 8, materialId: "cable" },
      { id: 12, i: 6, j: 3, materialId: "rebar" },
      { id: 13, i: 8, j: 3, materialId: "rebar" },
    ],
  },
];
