import { analyze, memberLength, memberName, modelCost } from "./analyze";
import { materialById } from "./materials";
import type { EnvelopeBar, Grade, Load, LoadCase, Model } from "./types";
import type { Mission } from "./missions";

export function carCases(
  nodes: Model["nodes"],
  road: number[],
  weight: number,
  samples: number,
  staticLoads: Load[],
): LoadCase[] | null {
  const points = road.map((id) => nodes.find((node) => node.id === id));
  if (points.some((node) => !node)) return null;
  const fixed = points as NonNullable<(typeof points)[number]>[];
  const segs: { a: (typeof fixed)[number]; b: (typeof fixed)[number]; start: number; length: number }[] = [];
  let total = 0;
  for (let i = 0; i < fixed.length - 1; i++) {
    const length = Math.hypot(fixed[i + 1].x - fixed[i].x, fixed[i + 1].y - fixed[i].y);
    segs.push({ a: fixed[i], b: fixed[i + 1], start: total, length });
    total += length;
  }
  if (total < 1e-6) return null;
  const count = Math.max(2, samples);
  const cases: LoadCase[] = [];
  for (let i = 0; i < count; i++) {
    const distance = (total * i) / (count - 1);
    const seg = segs.find((item) => distance <= item.start + item.length + 1e-9) ?? segs[segs.length - 1];
    const t = seg.length < 1e-9 ? 0 : Math.min(1, Math.max(0, (distance - seg.start) / seg.length));
    const loads: Load[] = staticLoads.map((load) => ({ ...load }));
    const add = (nodeId: number, fy: number) => {
      const found = loads.find((load) => load.nodeId === nodeId && !load.label);
      if (found) found.fy += fy;
      else loads.push({ nodeId, fx: 0, fy });
    };
    add(seg.a.id, -weight * (1 - t));
    add(seg.b.id, -weight * t);
    cases.push({ label: `${distance.toFixed(1)}m`, loads });
  }
  return cases;
}

export function missionCases(mission: Mission, model: Model, books = 0): LoadCase[] | null {
  if (mission.contest) {
    const nodeId = mission.bookNodeId;
    if (!nodeId) return [];
    if (books < 1) return [];
    const newton = 20 * books;
    return [{ label: `책 ${books}`, loads: [{ nodeId, fx: 0, fy: -newton, label: `${books}권` }] }];
  }
  if (!mission.car) {
    return [{ label: "하중", loads: mission.staticLoads.map((load) => ({ ...load })) }];
  }
  return carCases(model.nodes, mission.car.road, mission.car.weight, mission.car.samples, mission.staticLoads);
}

function envelopeOf(model: Model, cases: { label: string; analysis: ReturnType<typeof analyze> }[]): EnvelopeBar[] {
  return model.members.map((member) => {
    let min = 0;
    let max = 0;
    let worst = 0;
    let over = false;
    for (const item of cases) {
      const force = item.analysis.forces.find((f) => f.memberId === member.id);
      if (!force) continue;
      min = Math.min(min, force.axial);
      max = Math.max(max, force.axial);
      if (Math.abs(force.axial) >= Math.abs(worst)) worst = force.axial;
      if (force.over) over = true;
    }
    return {
      memberId: member.id,
      name: memberName(model.nodes, member),
      materialId: member.materialId,
      min,
      max,
      worst,
      over,
    };
  });
}

export function gradeMission(mission: Mission, model: Model, books = 0): Grade {
  const budget = mission.budget;
  const cost = modelCost(model);
  const base = {
    cost,
    budget,
    score: 0,
    envelope: [] as EnvelopeBar[],
    governing: null,
    governingLabel: "",
    loads: [] as Load[],
  };
  for (const id of mission.fixedNodeIds) {
    if (!model.nodes.some((node) => node.id === id)) {
      return { ...base, passed: false, title: "절점 없음", reason: "고정 절점이 빠졌습니다" };
    }
  }
  if (cost > budget + 0.05) {
    return { ...base, passed: false, title: "예산 초과", reason: `${cost.toFixed(1)} > ${budget}` };
  }
  if (mission.contest && books < 1) {
    return { ...base, passed: false, title: "책 0", reason: "책을 올리세요" };
  }
  const cases = missionCases(mission, model, books);
  if (!cases) return { ...base, passed: false, title: "도로 없음", reason: "자동차 절점이 없습니다" };
  if (cases.length === 0) return { ...base, passed: false, title: "하중 없음", reason: "하중이 없습니다" };

  const solved = cases.map((item) => ({
    label: item.label,
    analysis: analyze({ ...model, supports: mission.supports, loads: item.loads }, item.loads),
  }));
  const envelope = envelopeOf(model, solved);
  const governing = [...solved].sort((a, b) => b.analysis.maxRatio - a.analysis.maxRatio)[0];
  const failed = solved.find((item) => item.analysis.status === "unstable" || item.analysis.status === "invalid" || item.analysis.status === "empty");
  const broken = solved.find((item) => item.analysis.status === "overstressed");
  const weight = mission.contest ? 20 * books : mission.staticLoads.reduce((sum, load) => sum + Math.max(0, -load.fy), 0);
  const score = mission.contest && cost > 0.05 ? weight / cost : 0;

  if (failed) {
    return {
      ...base,
      envelope,
      governing: failed.analysis,
      governingLabel: failed.label,
      loads: cases.find((item) => item.label === failed.label)?.loads ?? [],
      passed: false,
      title: "불안정",
      reason: `${failed.label} · ${failed.analysis.message}`,
    };
  }
  if (broken) {
    return {
      ...base,
      envelope,
      governing: broken.analysis,
      governingLabel: broken.label,
      loads: cases.find((item) => item.label === broken.label)?.loads ?? [],
      passed: false,
      title: "파괴",
      reason: `${broken.label} · ${broken.analysis.message}`,
    };
  }
  return {
    ...base,
    envelope,
    governing: governing?.analysis ?? null,
    governingLabel: governing?.label ?? "",
    loads: cases.find((item) => item.label === governing?.label)?.loads ?? [],
    passed: true,
    title: "견딤",
    reason: mission.contest ? `점수 ${score.toFixed(2)}` : `${Math.round((governing?.analysis.maxRatio ?? 0) * 100)}%`,
    score,
  };
}

export function memberRows(model: Model) {
  return model.members.map((member) => {
    const material = materialById(member.materialId);
    const length = memberLength(model.nodes, member);
    const cost = material ? length * material.costPerM : 0;
    return {
      id: member.id,
      name: memberName(model.nodes, member),
      material: material?.name ?? "?",
      costPerM: material?.costPerM ?? 0,
      length,
      cost,
    };
  });
}
