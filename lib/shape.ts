import type { Member, Model, Node } from "./types";

function maxId(model: Model) {
  return Math.max(0, ...model.nodes.map((node) => node.id), ...model.members.map((member) => member.id));
}

function posKey(node: Pick<Node, "x" | "y" | "z">) {
  const round = (value: number) => Math.round(value * 100) / 100;
  return `${round(node.x)},${round(node.y)},${round(node.z ?? 0)}`;
}

function sameMember(members: Member[], i: number, j: number) {
  return members.some((member) => (member.i === i && member.j === j) || (member.i === j && member.j === i));
}

/** 두 절점을 이을 때, 그 직선 위에 있는 절점마다 부재를 나눈다. */
export function splitColinearMembers(model: Model, i: number, j: number, materialId: string): Member[] {
  const a = model.nodes.find((node) => node.id === i);
  const b = model.nodes.find((node) => node.id === j);
  if (!a || !b || i === j) return [];
  const ab = { x: b.x - a.x, y: b.y - a.y, z: (b.z ?? 0) - (a.z ?? 0) };
  const length2 = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z;
  if (length2 < 1e-8) return [];
  const between = model.nodes
    .filter((node) => node.id !== i && node.id !== j)
    .map((node) => {
      const ap = { x: node.x - a.x, y: node.y - a.y, z: (node.z ?? 0) - (a.z ?? 0) };
      const t = (ap.x * ab.x + ap.y * ab.y + ap.z * ab.z) / length2;
      const px = a.x + ab.x * t;
      const py = a.y + ab.y * t;
      const pz = (a.z ?? 0) + ab.z * t;
      const distance = Math.hypot(node.x - px, node.y - py, (node.z ?? 0) - pz);
      return { node, t, distance };
    })
    .filter((item) => item.t > 0.03 && item.t < 0.97 && item.distance < 0.15)
    .sort((left, right) => left.t - right.t);
  const chain = [a, ...between.map((item) => item.node), b];
  const fresh: Member[] = [];
  let id = maxId(model) + 1;
  const members = [...model.members];
  for (let index = 0; index < chain.length - 1; index += 1) {
    const from = chain[index].id;
    const to = chain[index + 1].id;
    if (sameMember(members, from, to) || sameMember(fresh, from, to)) continue;
    const member = { id, i: from, j: to, materialId };
    id += 1;
    fresh.push(member);
    members.push(member);
  }
  return fresh;
}

function absorb(model: Model, extraNodes: Node[], map: Map<number, number>) {
  const nodes = model.nodes.map((node) => ({ ...node }));
  const at = new Map(nodes.map((node) => [posKey(node), node.id]));
  let id = maxId(model) + 1;
  for (const node of extraNodes) {
    const key = posKey(node);
    const found = at.get(key);
    if (found) {
      map.set(node.id, found);
      continue;
    }
    const copy = { ...node, id };
    nodes.push(copy);
    at.set(key, id);
    map.set(node.id, id);
    id += 1;
  }
  return { nodes, nextId: id };
}

export function mirrorModel(model: Model): Model {
  if (model.nodes.length === 0) return model;
  const xs = model.nodes.map((node) => node.x);
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
  const ghosts = model.nodes.map((node) => ({ ...node, x: mid * 2 - node.x }));
  const map = new Map<number, number>();
  const { nodes, nextId } = absorb(model, ghosts, map);
  let id = nextId;
  const members = model.members.map((member) => ({ ...member }));
  for (const member of model.members) {
    const i = map.get(member.i);
    const j = map.get(member.j);
    if (!i || !j || i === j || sameMember(members, i, j)) continue;
    members.push({ id, i, j, materialId: member.materialId });
    id += 1;
  }
  const supports = model.supports.map((support) => ({ ...support }));
  for (const support of model.supports) {
    const nodeId = map.get(support.nodeId);
    if (!nodeId || supports.some((item) => item.nodeId === nodeId)) continue;
    supports.push({ ...support, nodeId });
  }
  const loads = model.loads.map((load) => ({ ...load }));
  for (const load of model.loads) {
    const nodeId = map.get(load.nodeId);
    if (!nodeId || loads.some((item) => item.nodeId === nodeId)) continue;
    loads.push({ ...load, nodeId });
  }
  return { nodes, members, supports, loads };
}

export function copyModel(model: Model, dx: number): Model {
  if (!Number.isFinite(dx) || Math.abs(dx) < 0.05 || model.nodes.length === 0) return model;
  const ghosts = model.nodes.map((node) => ({ ...node, x: node.x + dx }));
  const map = new Map<number, number>();
  const { nodes, nextId } = absorb(model, ghosts, map);
  let id = nextId;
  const members = model.members.map((member) => ({ ...member }));
  for (const member of model.members) {
    const i = map.get(member.i);
    const j = map.get(member.j);
    if (!i || !j || i === j || sameMember(members, i, j)) continue;
    members.push({ id, i, j, materialId: member.materialId });
    id += 1;
  }
  const supports = model.supports.map((support) => ({ ...support }));
  for (const support of model.supports) {
    const nodeId = map.get(support.nodeId);
    if (!nodeId || supports.some((item) => item.nodeId === nodeId)) continue;
    supports.push({ ...support, nodeId });
  }
  const loads = model.loads.map((load) => ({ ...load }));
  for (const load of model.loads) {
    const nodeId = map.get(load.nodeId);
    if (!nodeId || loads.some((item) => item.nodeId === nodeId)) continue;
    loads.push({ ...load, nodeId });
  }
  return { nodes, members, supports, loads };
}

function wood(id: number, i: number, j: number): Member {
  return { id, i, j, materialId: "wood" };
}

export function bridgeTruss(kind: "pratt" | "howe" | "warren", panels: number, spacing: number, rise: number): Model {
  const bays = Math.max(2, Math.min(8, Math.round(panels)));
  const step = Math.max(0.5, Math.min(12, spacing));
  const height = Math.max(0.5, Math.min(8, rise));
  const nodes: Node[] = [];
  const members: Member[] = [];
  let id = 1;
  if (kind === "warren") {
    for (let index = 0; index <= bays; index += 1) nodes.push({ id: id++, x: index * step, y: 0 });
    for (let index = 0; index < bays; index += 1) nodes.push({ id: id++, x: (index + 0.5) * step, y: height });
    const bottom = nodes.filter((node) => node.y === 0);
    const top = nodes.filter((node) => node.y !== 0);
    for (let index = 0; index < bottom.length - 1; index += 1) members.push(wood(id++, bottom[index].id, bottom[index + 1].id));
    for (let index = 0; index < top.length - 1; index += 1) members.push(wood(id++, top[index].id, top[index + 1].id));
    for (let index = 0; index < top.length; index += 1) {
      members.push(wood(id++, bottom[index].id, top[index].id));
      members.push(wood(id++, top[index].id, bottom[index + 1].id));
    }
  } else {
    for (let index = 0; index <= bays; index += 1) nodes.push({ id: id++, x: index * step, y: 0 });
    const topStart = id;
    for (let index = 0; index <= bays; index += 1) nodes.push({ id: id++, x: index * step, y: height });
    const bottom = nodes.filter((node) => node.id < topStart);
    const top = nodes.filter((node) => node.id >= topStart);
    for (let index = 0; index < bays; index += 1) {
      members.push(wood(id++, bottom[index].id, bottom[index + 1].id));
      members.push(wood(id++, top[index].id, top[index + 1].id));
      members.push(wood(id++, bottom[index].id, top[index].id));
      members.push(
        kind === "pratt"
          ? wood(id++, bottom[index].id, top[index + 1].id)
          : wood(id++, top[index].id, bottom[index + 1].id),
      );
    }
    members.push(wood(id++, bottom[bays].id, top[bays].id));
  }
  const ground = nodes.filter((node) => node.y === 0);
  return {
    nodes,
    members,
    supports: [
      { nodeId: ground[0].id, type: "pin" },
      { nodeId: ground[ground.length - 1].id, type: "rollerY" },
    ],
    loads: [],
  };
}
