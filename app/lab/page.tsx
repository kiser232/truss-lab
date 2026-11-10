"use client";

import { useMemo, useState } from "react";
import { analyze } from "@/lib/analyze";
import { LAB_MATERIALS } from "@/lib/materials";
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
  const [step, setStep] = useState<number | null>(null);
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
          <button type="button" className="ghost" onClick={() => { setModel(HOUSE); setStep(null); }}>
            집 모양
          </button>
          <button type="button" className="ghost" onClick={() => { setModel(EMPTY); setStep(null); }}>
            비우기
          </button>
        </div>
      </div>
      <div className="lab-grid">
        <Workspace
          model={model}
          onChange={(next) => {
            setModel(next);
            setStep(null);
          }}
          materials={LAB_MATERIALS}
          analysis={analysis.status === "unstable" || analysis.status === "invalid" || analysis.status === "empty" ? null : analysis}
          tools={["select", "node", "member", "pin", "rollerY", "rollerX", "load", "erase"]}
          scene="paper"
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
        부재를 이을 때 우클릭으로 자재. + 인장 · − 압축. 한 칸 = 1m.
      </p>
    </main>
  );
}
