"use client";

import { useMemo, useState } from "react";
import { analyze } from "@/lib/analyze";
import { LAB_MATERIALS } from "@/lib/materials";
import { bridgeTruss, copyModel, mirrorModel } from "@/lib/shape";
import { TRIPOD } from "@/lib/space";
import type { Model } from "@/lib/types";
import { SolutionPanel } from "@/components/solution-panel";
import { Workspace } from "@/components/workspace";

const HOUSE: Model = {
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
  loads: [{ nodeId: 3, fx: 0, fy: -60, label: "60N" }],
};

const EMPTY: Model = { nodes: [], members: [], supports: [], loads: [] };

export default function LabPage() {
  const [model, setModel] = useState<Model>(HOUSE);
  const [space, setSpace] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const [kit, setKit] = useState({ panels: "4", spacing: "2", rise: "2", copy: "4" });
  const analysis = useMemo(() => analyze(model), [model]);
  const focus = step !== null ? analysis.steps[step] : undefined;

  return (
    <main className="work">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", marginBottom: 12, flexWrap: "wrap" }}>
        <div>
          <p className="kicker">ANALYZE</p>
          <h1 style={{ margin: "4px 0 0", fontSize: 28, letterSpacing: "-0.04em" }}>트러스 계산기</h1>
        </div>
        <div className="row-tools">
          <button type="button" className="ghost" onClick={() => { setSpace(false); setModel(HOUSE); setStep(null); }}>
            집 모양
          </button>
          <button type="button" className="ghost" onClick={() => { setSpace(true); setModel(TRIPOD); setStep(null); }}>
            삼각대
          </button>
          <button type="button" className="ghost" onClick={() => { setModel(EMPTY); setStep(null); }}>
            비우기
          </button>
          <button type="button" className="ghost" onClick={() => { setSpace(false); setModel((current) => mirrorModel(current)); setStep(null); }}>
            좌우 대칭
          </button>
          <button type="button" className="ghost" onClick={() => { setSpace(false); setModel((current) => copyModel(current, Number(kit.copy))); setStep(null); }}>
            복사
          </button>
        </div>
      </div>
      <div className="row-tools" style={{ marginBottom: 12 }}>
        <label className="height-field">칸
          <input aria-label="칸 수" inputMode="numeric" value={kit.panels} onChange={(event) => setKit({ ...kit, panels: event.target.value })} />
        </label>
        <label className="height-field">간격 m
          <input aria-label="부재 간격" inputMode="decimal" value={kit.spacing} onChange={(event) => setKit({ ...kit, spacing: event.target.value })} />
        </label>
        <label className="height-field">높이 m
          <input aria-label="트러스 높이" inputMode="decimal" value={kit.rise} onChange={(event) => setKit({ ...kit, rise: event.target.value })} />
        </label>
        <label className="height-field">복사 m
          <input aria-label="복사 거리" inputMode="decimal" value={kit.copy} onChange={(event) => setKit({ ...kit, copy: event.target.value })} />
        </label>
        {([
          ["pratt", "프랫"],
          ["howe", "하우"],
          ["warren", "와렌"],
        ] as const).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            className="ghost"
            onClick={() => {
              setSpace(false);
              setModel(bridgeTruss(kind, Number(kit.panels), Number(kit.spacing), Number(kit.rise)));
              setStep(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="lab-grid">
        <Workspace
          key={space ? "space" : "plane"}
          model={model}
          onChange={(next) => {
            setModel(next);
            setStep(null);
          }}
          materials={LAB_MATERIALS}
          analysis={analysis.status === "unstable" || analysis.status === "invalid" || analysis.status === "empty" ? null : analysis}
          tools={["select", "node", "member", "pin", "rollerY", "load", "erase"]}
          scene="paper"
          space={space}
          onSpace={(next) => {
            setSpace(next);
            setModel(EMPTY);
            setStep(null);
          }}
          focusNodeId={focus?.focusNodeId}
          focusMemberIds={focus?.memberIds}
        />
        <SolutionPanel analysis={analysis} active={step} onPick={setStep} />
      </div>
      <style>{`
        .lab-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 14px; align-items: start; }
        @media (max-width: 980px) { .lab-grid { grid-template-columns: 1fr; } }
      `}</style>
      <p className="note" style={{ marginTop: 8 }}>
        좌표에 x, y를 넣고 넣기를 누르면 절점이 생깁니다. 직선 위의 절점을 가로질러 부재를 이으면 AB, BC처럼 나뉩니다. 하중은 가로·아래 칸에 숫자를 넣고 절점을 누릅니다. 프랫·하우·와렌은 칸, 간격, 높이로 만듭니다. 풀이 줄에 커서를 올리면 그 식의 뜻이 나옵니다.
      </p>
    </main>
  );
}
