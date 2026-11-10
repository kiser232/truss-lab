import type { Material } from "./types";

export const LAB_MATERIALS: Material[] = [
  {
    id: "plastic",
    name: "플라스틱",
    tension: 32,
    compression: 18,
    costPerM: 1,
    E: 3,
    A: 1,
    color: "#3d8eb5",
    summary: "가장 쌈. 인장·압축 모두 약함",
  },
  {
    id: "cable",
    name: "케이블",
    tension: 240,
    compression: 0,
    costPerM: 3,
    E: 120,
    A: 0.25,
    color: "#241c16",
    summary: "인장만. 압축 즉시 파괴",
  },
  {
    id: "bamboo",
    name: "대나무",
    tension: 72,
    compression: 34,
    costPerM: 3,
    E: 14,
    A: 0.8,
    color: "#6d8f3e",
    summary: "인장 쪽 여유. 압축에 잘 꺾임",
  },
  {
    id: "wood",
    name: "나무",
    tension: 100,
    compression: 55,
    costPerM: 4,
    E: 11,
    A: 1,
    color: "#c4843c",
    summary: "인 100 · 압 55",
  },
  {
    id: "rebar",
    name: "철근",
    tension: 210,
    compression: 28,
    costPerM: 5,
    E: 200,
    A: 0.16,
    color: "#5c6770",
    summary: "인장에 강하고 압축에 좌굴",
  },
  {
    id: "concrete",
    name: "콘크리트",
    tension: 16,
    compression: 230,
    costPerM: 6,
    E: 28,
    A: 2.2,
    color: "#8e948f",
    summary: "압축 전용에 가깝다",
  },
  {
    id: "tube",
    name: "강관",
    tension: 160,
    compression: 200,
    costPerM: 9,
    E: 200,
    A: 1,
    color: "#2c3844",
    summary: "양쪽 모두 강함. 가장 비쌈",
  },
];

export const CONTEST_MATERIALS: Material[] = [
  {
    id: "paper",
    name: "종이",
    tension: 80,
    compression: 0,
    costPerM: 1,
    E: 2,
    A: 0.15,
    color: "#d9c7a2",
    summary: "인장만. 누르면 접힘",
  },
  {
    id: "spaghetti",
    name: "스파게티",
    tension: 28,
    compression: 36,
    costPerM: 2,
    E: 4,
    A: 0.3,
    color: "#e4d2a4",
    summary: "짧으면 압축. 길면 좌굴",
    buckling: { referenceLength: 2, exponent: 2 },
  },
  {
    id: "skewer",
    name: "수수깡",
    tension: 48,
    compression: 70,
    costPerM: 3,
    E: 12,
    A: 0.7,
    color: "#c4a15a",
    summary: "면보다 압축에 셈. 길면 좌굴",
    buckling: { referenceLength: 2.5, exponent: 2 },
  },
];

export const QUIZ_MATERIALS: {
  id: string;
  name: string;
  tension: number;
  compression: number;
  group: "tension" | "compression";
  fact: string;
}[] = [
  { id: "cable", name: "케이블", tension: 240, compression: 0, group: "tension", fact: "압축 허용 0" },
  { id: "rope", name: "로프", tension: 150, compression: 0, group: "tension", fact: "당길 때만" },
  { id: "rebar", name: "철근", tension: 210, compression: 28, group: "tension", fact: "인 210 · 압 28" },
  { id: "wood", name: "나무", tension: 100, compression: 50, group: "tension", fact: "인 100 · 압 50" },
  { id: "bamboo", name: "대나무", tension: 72, compression: 34, group: "tension", fact: "인 72 · 압 34" },
  { id: "concrete", name: "콘크리트", tension: 16, compression: 230, group: "compression", fact: "인 16 · 압 230" },
  { id: "castiron", name: "주철", tension: 30, compression: 180, group: "compression", fact: "인 30 · 압 180" },
  { id: "stone", name: "석재", tension: 12, compression: 200, group: "compression", fact: "인 12 · 압 200" },
  { id: "brick", name: "벽돌", tension: 10, compression: 140, group: "compression", fact: "인 10 · 압 140" },
  { id: "glass", name: "유리", tension: 20, compression: 120, group: "compression", fact: "인 20 · 압 120" },
];

const ALL = [...LAB_MATERIALS, ...CONTEST_MATERIALS];

export function materialById(id: string): Material | undefined {
  return ALL.find((m) => m.id === id);
}

export function compressionAllow(material: Material, length: number): number {
  const rule = material.buckling;
  if (!rule || length <= rule.referenceLength) return material.compression;
  return material.compression * (rule.referenceLength / length) ** rule.exponent;
}
