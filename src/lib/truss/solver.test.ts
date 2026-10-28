import assert from "node:assert/strict";
import test from "node:test";
import { designCost, evaluateDesign } from "./evaluate";
import { explain } from "./explain";
import { sampleRoad } from "./geometry";
import { solveLinear } from "./linalg";
import { createQuiz, QUIZ_PRESETS } from "./quiz";
import { REFERENCES } from "./references";
import { STAGES } from "./stages";
import { analyze, axialByBothMethods } from "./solver";
import type { Member, TrussModel } from "./types";

const triangle: TrussModel = {
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
};

test("가우스 소거가 2원 1차 방정식을 푼다", () => {
  const solution = solveLinear(
    [
      [2, 1],
      [1, -1],
    ],
    [4, -1],
  );
  assert.ok(solution);
  assert.ok(Math.abs(solution[0] - 1) < 1e-9);
  assert.ok(Math.abs(solution[1] - 2) < 1e-9);
});

test("이등변 삼각형 지붕은 절점법으로 밑변 인장, 빗변 압축이다", () => {
  const analysis = analyze(triangle);
  assert.equal(analysis.status, "overstressed");
  assert.equal(analysis.method, "joints");
  assert.equal(analysis.classification, "determinate");
  const byId = new Map(analysis.forces.map((force) => [force.memberId, force.axial]));
  assert.ok(Math.abs((byId.get(1) ?? 0) - 50) < 0.02);
  assert.ok(Math.abs((byId.get(2) ?? 0) + 70.7107) < 0.02);
  assert.ok(Math.abs((byId.get(3) ?? 0) + 70.7107) < 0.02);
  const left = analysis.reactions.find((reaction) => reaction.nodeId === 1);
  const right = analysis.reactions.find((reaction) => reaction.nodeId === 2);
  assert.ok(left && Math.abs(left.ry - 50) < 0.02 && Math.abs(left.rx) < 0.02);
  assert.ok(right && Math.abs(right.ry - 50) < 0.02);
});

test("정정 트러스에서 강성법과 절점법의 축력이 같다", () => {
  const both = axialByBothMethods({
    ...triangle,
    members: triangle.members.map((member) => ({ ...member, materialId: "tube" })),
  });
  assert.ok(both);
  both.joints.forEach((axial, index) => {
    assert.ok(Math.abs(axial - both.stiffness[index]) < 0.05);
  });

  const redundant: TrussModel = {
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 2, y: 0 },
      { id: 3, x: 2, y: 2 },
      { id: 4, x: 0, y: 2 },
    ],
    members: [
      { id: 1, i: 1, j: 2, materialId: "tube" },
      { id: 2, i: 2, j: 3, materialId: "tube" },
      { id: 3, i: 3, j: 4, materialId: "tube" },
      { id: 4, i: 4, j: 1, materialId: "tube" },
      { id: 5, i: 1, j: 3, materialId: "tube" },
      { id: 6, i: 2, j: 4, materialId: "rebar" },
    ],
    supports: [
      { nodeId: 1, type: "pin" },
      { nodeId: 2, type: "rollerY" },
    ],
    loads: [{ nodeId: 3, fx: 0, fy: -40 }],
  };
  const extra = analyze(redundant);
  assert.equal(extra.classification, "indeterminate");
  assert.equal(extra.method, "stiffness");
  assert.notEqual(extra.status, "unstable");
  assert.ok(extra.forces.every((force) => Number.isFinite(force.axial)));
});

test("한 직선 위의 절점은 기하학적으로 불안정하다", () => {
  const flat = analyze({
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 1, y: 0 },
      { id: 3, x: 2, y: 0 },
      { id: 4, x: 3, y: 0 },
    ],
    members: [
      { id: 1, i: 1, j: 2, materialId: "wood" },
      { id: 2, i: 2, j: 3, materialId: "wood" },
      { id: 3, i: 3, j: 4, materialId: "wood" },
      { id: 4, i: 1, j: 3, materialId: "wood" },
      { id: 5, i: 2, j: 4, materialId: "wood" },
    ],
    supports: [
      { nodeId: 1, type: "pin" },
      { nodeId: 4, type: "rollerY" },
    ],
    loads: [{ nodeId: 2, fx: 0, fy: -20 }],
  });
  assert.equal(flat.status, "unstable");
});

test("케이블은 압축이 생기면 파괴로 판정한다", () => {
  const model: TrussModel = {
    ...triangle,
    members: triangle.members.map((member) => ({ ...member, materialId: member.id === 1 ? "tube" : "cable" })),
  };
  const analysis = analyze(model);
  assert.equal(analysis.status, "overstressed");
  assert.equal(analysis.failures.length > 0, true);
  assert.ok(analysis.failures.some((failure) => failure.mode === "compression"));
});

test("절점법 해설이 삼각형 지붕의 인장 하현재를 보여 준다", () => {
  const analysis = analyze(triangle);
  const story = explain(triangle, analysis);
  assert.match(story.determinacy, /정정/);
  assert.ok(story.steps.length >= 1);
  const text = JSON.stringify(story);
  assert.match(text, /인장/);
  assert.match(text, /압축/);
  assert.equal(story.leftover.length, 0);
});

test("자동차 하중은 인접 절점에만 나뉘고 합이 무게와 같다", () => {
  const nodes = [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 2, y: 0 },
    { id: 3, x: 4, y: 0 },
  ];
  const mid = sampleRoad(nodes, [1, 2, 3], 80, 0.25);
  assert.ok(mid);
  const sum = mid.loads.reduce((total, load) => total + -load.fy, 0);
  assert.ok(Math.abs(sum - 80) < 1e-6);
  assert.ok(mid.loads.every((load) => load.nodeId === 1 || load.nodeId === 2));
  const end = sampleRoad(nodes, [1, 2, 3], 80, 1);
  assert.ok(end && end.loads.length === 1 && end.loads[0].nodeId === 3);
});

test("각 실습 단계의 예시 답은 통과하고 케이블만으로는 실패한다", () => {
  for (const reference of REFERENCES) {
    const stage = STAGES.find((item) => item.id === reference.stageId);
    assert.ok(stage);
    const trial = evaluateDesign(stage, reference.nodes, reference.members);
    assert.equal(trial.passed, true, `${stage.id}: ${trial.detail}`);
    assert.ok(trial.cost <= stage.budget);
    const tube: Member[] = reference.members.map((member) => ({ ...member, materialId: "tube" }));
    assert.ok(designCost(reference.nodes, tube) > stage.budget, `stage ${stage.id} tube should exceed budget`);
    const cable: Member[] = reference.members.map((member) => ({ ...member, materialId: "cable" }));
    const cableTrial = evaluateDesign(stage, reference.nodes, cable);
    assert.equal(cableTrial.passed, false, `stage ${stage.id} all cable should fail`);
  }
});

test("퀴즈 프리셋은 인장 부재와 압축 부재를 모두 가진다", () => {
  for (const preset of QUIZ_PRESETS) {
    const analysis = analyze(preset.model);
    assert.notEqual(analysis.status, "unstable");
    assert.ok(analysis.forces.some((force) => force.mode === "tension"));
    assert.ok(analysis.forces.some((force) => force.mode === "compression"));
  }
  const quiz = createQuiz(() => 0);
  assert.equal(quiz.kind, "sort");
  assert.equal(quiz.kind === "sort" && quiz.cards.length, 4);
});
