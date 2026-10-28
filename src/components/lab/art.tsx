import type { TrussKind } from "@/lib/truss/quiz";

export function TrussArt({ kind }: { kind: TrussKind }) {
  return (
    <svg className="truss-art" viewBox="0 0 240 128" role="img" aria-label={kind}>
      <rect x="8" y="8" width="224" height="112" rx="8" className="art-paper" />
      {kind === "warren" ? <Warren /> : null}
      {kind === "howe" ? <Panel diagonals="howe" /> : null}
      {kind === "pratt" ? <Panel diagonals="pratt" /> : null}
      {kind === "kingpost" ? <King /> : null}
      {kind === "queenpost" ? <Queen /> : null}
    </svg>
  );
}

function Warren() {
  const bottom = [24, 78, 132, 186];
  const top = [51, 105, 159];
  const yb = 96;
  const yt = 40;
  const lines: Array<[number, number, number, number]> = [];
  for (let index = 0; index < bottom.length - 1; index += 1) {
    lines.push([bottom[index], yb, bottom[index + 1], yb]);
  }
  for (let index = 0; index < top.length - 1; index += 1) {
    lines.push([top[index], yt, top[index + 1], yt]);
  }
  lines.push([bottom[0], yb, top[0], yt]);
  lines.push([top[0], yt, bottom[1], yb]);
  lines.push([bottom[1], yb, top[1], yt]);
  lines.push([top[1], yt, bottom[2], yb]);
  lines.push([bottom[2], yb, top[2], yt]);
  lines.push([top[2], yt, bottom[3], yb]);
  return <Lines lines={lines} />;
}

function Panel({ diagonals }: { diagonals: "howe" | "pratt" }) {
  const xs = [22, 71, 120, 169, 218];
  const yb = 98;
  const yt = 38;
  const lines: Array<[number, number, number, number]> = [];
  for (let index = 0; index < xs.length - 1; index += 1) {
    lines.push([xs[index], yb, xs[index + 1], yb]);
    lines.push([xs[index], yt, xs[index + 1], yt]);
  }
  for (const x of xs) lines.push([x, yt, x, yb]);
  const center = 2;
  for (let index = 0; index < xs.length - 1; index += 1) {
    const inward = index < center;
    if (diagonals === "howe") {
      lines.push(inward ? [xs[index], yb, xs[index + 1], yt] : [xs[index + 1], yb, xs[index], yt]);
    } else {
      lines.push(inward ? [xs[index], yt, xs[index + 1], yb] : [xs[index + 1], yt, xs[index], yb]);
    }
  }
  return <Lines lines={lines} />;
}

function King() {
  return (
    <Lines
      lines={[
        [36, 100, 204, 100],
        [36, 100, 120, 30],
        [204, 100, 120, 30],
        [120, 30, 120, 100],
      ]}
    />
  );
}

function Queen() {
  return (
    <Lines
      lines={[
        [28, 102, 212, 102],
        [28, 102, 82, 42],
        [212, 102, 158, 42],
        [82, 42, 158, 42],
        [82, 42, 82, 102],
        [158, 42, 158, 102],
      ]}
    />
  );
}

function Lines({ lines }: { lines: Array<[number, number, number, number]> }) {
  return (
    <g className="art-ink" fill="none" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
      {lines.map((line, index) => (
        <line key={index} x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]} />
      ))}
    </g>
  );
}

export function MaterialArt({ icon }: { icon: string }) {
  return (
    <svg className="material-art" viewBox="0 0 72 72" aria-hidden="true">
      <rect x="1" y="1" width="70" height="70" rx="12" className="art-paper" />
      {icon === "wood" ? <Wood /> : null}
      {icon === "cable" ? <Cable /> : null}
      {icon === "rope" ? <Rope /> : null}
      {icon === "rebar" ? <Rebar /> : null}
      {icon === "bamboo" ? <Bamboo /> : null}
      {icon === "concrete" ? <Concrete /> : null}
      {icon === "castiron" ? <CastIron /> : null}
      {icon === "stone" ? <Stone /> : null}
      {icon === "brick" ? <Brick /> : null}
      {icon === "glass" ? <Glass /> : null}
      {icon === "plastic" ? <Plastic /> : null}
      {icon === "tube" ? <Tube /> : null}
    </svg>
  );
}

function Wood() {
  return (
    <g stroke="#6a3d16" strokeWidth="2" fill="#d08a45">
      <rect x="16" y="18" width="40" height="36" rx="4" />
      <path d="M22 26h28M22 36h28M22 46h28" fill="none" />
    </g>
  );
}

function Cable() {
  return <path d="M14 28c10 16 14-16 24 0s14-16 20 0" fill="none" stroke="#241c16" strokeWidth="3" />;
}

function Rope() {
  return <path d="M18 46c8-20 12-20 18 0s10 18 18-6" fill="none" stroke="#8a5a2b" strokeWidth="4" strokeLinecap="round" />;
}

function Rebar() {
  return (
    <g stroke="#4d565e" strokeWidth="6" strokeLinecap="round">
      <path d="M14 36h44" />
      <path d="M22 30v12M30 30v12M38 30v12M46 30v12" strokeWidth="2" />
    </g>
  );
}

function Bamboo() {
  return (
    <g fill="#7ea04a" stroke="#3e5a22" strokeWidth="2">
      <rect x="30" y="12" width="12" height="48" rx="6" />
      <path d="M30 24h12M30 36h12M30 48h12" />
    </g>
  );
}

function Concrete() {
  return (
    <g fill="#b7bbb6" stroke="#5e6560">
      <rect x="18" y="20" width="36" height="32" rx="3" />
      <circle cx="28" cy="32" r="1.4" />
      <circle cx="40" cy="40" r="1.4" />
      <circle cx="44" cy="28" r="1.2" />
    </g>
  );
}

function CastIron() {
  return (
    <g fill="#3e4650" stroke="#1c2126">
      <path d="M24 22h24l6 10v16H18V32z" />
      <path d="M28 22c0-6 16-6 16 0" fill="none" strokeWidth="3" />
    </g>
  );
}

function Stone() {
  return <path d="M20 46 28 24l16-6 12 14-4 16-18 6z" fill="#9a9084" stroke="#4d463e" strokeWidth="2" />;
}

function Brick() {
  return (
    <g fill="#b85a3d" stroke="#6e2e22" strokeWidth="1.6">
      <rect x="16" y="22" width="18" height="10" />
      <rect x="38" y="22" width="18" height="10" />
      <rect x="16" y="36" width="12" height="10" />
      <rect x="30" y="36" width="18" height="10" />
      <rect x="50" y="36" width="6" height="10" />
    </g>
  );
}

function Glass() {
  return (
    <g fill="#d5eef8" stroke="#6f8f9c" strokeWidth="2">
      <rect x="22" y="16" width="28" height="40" rx="2" />
      <path d="M28 20 34 44" stroke="#ffffff" />
    </g>
  );
}

function Plastic() {
  return (
    <g fill="#7ec3de" stroke="#2d6d88" strokeWidth="2">
      <rect x="26" y="14" width="20" height="8" rx="2" />
      <rect x="22" y="22" width="28" height="34" rx="6" />
    </g>
  );
}

function Tube() {
  return (
    <g fill="none" stroke="#2c3844" strokeWidth="7" strokeLinecap="round">
      <path d="M16 36h40" />
      <path d="M16 36h40" stroke="#9fb0c0" strokeWidth="2" />
    </g>
  );
}
