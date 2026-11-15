export type Node = { id: number; x: number; y: number; z?: number };

export type Member = {
  id: number;
  i: number;
  j: number;
  materialId: string;
};

export type SupportType = "pin" | "rollerY" | "rollerX" | "ball" | "slot";

export type Support = { nodeId: number; type: SupportType; angle?: number };

export type Load = { nodeId: number; fx: number; fy: number; fz?: number; label?: string };

export type Model = {
  nodes: Node[];
  members: Member[];
  supports: Support[];
  loads: Load[];
};

export type Material = {
  id: string;
  name: string;
  tension: number;
  compression: number;
  costPerM: number;
  E: number;
  A: number;
  color: string;
  summary: string;
  buckling?: { referenceLength: number; exponent: number };
};

export type ForceMode = "tension" | "compression" | "zero";

export type MemberForce = {
  memberId: number;
  name: string;
  i: number;
  j: number;
  axial: number;
  allowTension: number;
  allowCompression: number;
  ratio: number;
  mode: ForceMode;
  over: boolean;
  length: number;
  cost: number;
  materialId: string;
};

export type SolutionLine = {
  text: string;
  tone?: "eq" | "tension" | "compression" | "zero" | "result";
};

export type SolutionStep = {
  kind: "reaction" | "joint" | "note";
  title: string;
  focusNodeId?: number;
  memberIds: number[];
  lines: SolutionLine[];
};

export type Analysis = {
  status: "empty" | "invalid" | "unstable" | "overstressed" | "ok";
  message: string;
  m: number;
  r: number;
  j: number;
  degree: number;
  method: "joints" | "stiffness" | "none";
  reactions: { nodeId: number; rx: number; ry: number; rz?: number }[];
  space?: boolean;
  forces: MemberForce[];
  steps: SolutionStep[];
  maxRatio: number;
};

export type EnvelopeBar = {
  memberId: number;
  name: string;
  materialId: string;
  min: number;
  max: number;
  worst: number;
  over: boolean;
};

export type LoadCase = { label: string; loads: Load[] };

export type Grade = {
  passed: boolean;
  title: string;
  reason: string;
  cost: number;
  budget: number;
  score: number;
  envelope: EnvelopeBar[];
  governing: Analysis | null;
  governingLabel: string;
  loads: Load[];
};
