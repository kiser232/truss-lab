import { analyze, memberName } from "../lib/analyze";
import { gradeMission, missionCases } from "../lib/grade";
import { compressionAllow, CONTEST_MATERIALS, LAB_MATERIALS, materialById } from "../lib/materials";
import { MISSIONS } from "../lib/missions";
import type { Material, Member, Model } from "../lib/types";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

function near(a: number, b: number, tol = 0.15) {
  assert(Math.abs(a - b) < tol, `expected ${b}, got ${a}`);
}

const house: Model = {
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
  loads: [{ nodeId: 3, fx: 0, fy: -60 }],
};

const houseResult = analyze(house);
console.log("house", houseResult.status, houseResult.method, houseResult.message);
for (const force of houseResult.forces) console.log(" ", force.name, force.axial.toFixed(3), force.mode);
console.log(houseResult.steps.map((s) => `${s.title}: ${s.lines.map((l) => l.text).join(" | ")}`).join("\n"));
const ab = houseResult.forces.find((f) => f.name === "AB")!;
const ac = houseResult.forces.find((f) => f.name === "AC")!;
const bc = houseResult.forces.find((f) => f.name === "BC")!;
near(ab.axial, 30);
near(ac.axial, -30 * Math.SQRT2, 0.05);
near(bc.axial, -30 * Math.SQRT2, 0.05);
assert(houseResult.method === "joints", "house should solve by joints");
const ay = houseResult.reactions.find((r) => r.nodeId === 1)!;
near(ay.ry, 30);
near(ay.rx, 0);

const bar: Model = {
  nodes: [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 4, y: 0 },
  ],
  members: [{ id: 1, i: 1, j: 2, materialId: "wood" }],
  supports: [
    { nodeId: 1, type: "pin" },
    { nodeId: 2, type: "rollerY" },
  ],
  loads: [{ nodeId: 2, fx: 10, fy: 0 }],
};
const barResult = analyze(bar);
console.log("\nbar", barResult.forces[0]?.axial, barResult.reactions);
near(barResult.forces[0].axial, 10);
near(barResult.reactions.find((r) => r.nodeId === 1)!.rx, -10);

const square: Model = {
  nodes: [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 4, y: 0 },
    { id: 3, x: 4, y: 3 },
    { id: 4, x: 0, y: 3 },
  ],
  members: [
    { id: 1, i: 1, j: 2, materialId: "wood" },
    { id: 2, i: 2, j: 3, materialId: "wood" },
    { id: 3, i: 3, j: 4, materialId: "wood" },
    { id: 4, i: 4, j: 1, materialId: "wood" },
  ],
  supports: [
    { nodeId: 1, type: "pin" },
    { nodeId: 2, type: "rollerY" },
  ],
  loads: [{ nodeId: 3, fx: 0, fy: -40 }],
};
const squareResult = analyze(square);
console.log("\nsquare", squareResult.status, squareResult.message);
assert(squareResult.status === "unstable", "square should be unstable");

function pick(materials: Material[], tension: number, compression: number, length: number) {
  const ok = materials.filter(
    (material) =>
      material.tension >= tension - 0.4 && compressionAllow(material, length) >= compression - 0.4,
  );
  ok.sort((a, b) => a.costPerM - b.costPerM || a.id.localeCompare(b.id));
  return ok[0] ?? null;
}

function fit(model: Model, materials: Material[], cases: { loads: Model["loads"] }[]) {
  const probe: Model = {
    ...model,
    members: model.members.map((member) => ({ ...member, materialId: materials[0].id })),
  };
  const envelopes = model.members.map((member) => ({ id: member.id, min: 0, max: 0, length: 0 }));
  for (const item of cases) {
    const result = analyze(probe, item.loads);
    if (result.status === "unstable" || result.status === "invalid") {
      return { error: result.message, result };
    }
    for (const force of result.forces) {
      const slot = envelopes.find((entry) => entry.id === force.memberId)!;
      slot.min = Math.min(slot.min, force.axial);
      slot.max = Math.max(slot.max, force.axial);
      slot.length = force.length;
    }
  }
  const members: Member[] = [];
  for (const entry of envelopes) {
    const chosen = pick(materials, Math.max(0, entry.max), Math.max(0, -entry.min), entry.length);
    if (!chosen) return { error: `no material for ${entry.id} T${entry.max.toFixed(1)} C${(-entry.min).toFixed(1)} L${entry.length.toFixed(2)}`, envelopes };
    members.push({ ...model.members.find((member) => member.id === entry.id)!, materialId: chosen.id });
  }
  return { members, envelopes };
}

let failed = 0;
for (const mission of MISSIONS) {
  const books = mission.contest ? 3 : 0;
  const model = {
    ...mission.example,
    supports: mission.supports,
    loads: mission.contest
      ? [{ nodeId: mission.bookNodeId!, fx: 0, fy: -20 * books }]
      : mission.example.loads,
  };
  const materials = mission.materials === "contest" ? CONTEST_MATERIALS : LAB_MATERIALS;
  const cases = missionCases(mission, model, books) ?? [];
  const fitted = fit(model, materials, cases);
  console.log(`\n=== mission ${mission.id} ${mission.title} ===`);
  if ("error" in fitted && fitted.error) {
    console.log("FIT FAIL", fitted.error);
    failed++;
    continue;
  }
  if (!("members" in fitted)) continue;
  const next: Model = { ...model, members: fitted.members };
  const grade = gradeMission(mission, next, books);
  const cost = grade.cost;
  console.log(grade.passed ? "PASS" : "FAIL", grade.title, grade.reason, `cost ${cost.toFixed(1)}/${mission.budget}`);
  for (const member of fitted.members) {
    const env = fitted.envelopes.find((entry) => entry.id === member.id)!;
    console.log(
      `  ${memberName(model.nodes, member)} ${materialById(member.materialId)?.name} ${env.min.toFixed(1)}~${env.max.toFixed(1)} L${env.length.toFixed(2)}`,
    );
  }
  console.log(fitted.members.map((member) => `${member.id}:${member.materialId}`).join(" "));
  if (!grade.passed) failed++;
  if (mission.id === 1) {
    const result = analyze(next);
    assert(result.method === "joints", "stage1 joints");
    const cd = result.forces.find((f) => f.name === "CD");
    const ad = result.forces.find((f) => f.name === "AD");
    console.log("stage1 CD", cd?.axial, "AD", ad?.axial);
    near(cd!.axial, 60);
    near(ad!.axial, -50);
  }
  if (mission.id === 5) {
    const result = analyze(next);
    console.log("stage5", result.method, result.forces.map((f) => `${f.name} ${f.axial.toFixed(2)}`).join(", "));
    assert(result.method === "joints", "stage5 joints");
    near(result.forces.find((f) => f.name === "AC")!.axial, -280 / 3, 0.05);
    near(result.forces.find((f) => f.name === "BC")!.axial, 70 / 0.6, 0.05);
    near(result.forces.find((f) => f.name === "AB")!.axial, -70, 0.05);
  }
}

if (failed) {
  console.error(`\n${failed} missions failed`);
  process.exit(1);
}
console.log("\nall checks passed");
