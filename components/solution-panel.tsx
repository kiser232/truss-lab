import { fmt, letter, signed } from "@/lib/format";
import type { Analysis, EnvelopeBar, SolutionStep } from "@/lib/types";

function word(mode: "tension" | "compression" | "zero") {
  if (mode === "tension") return "인";
  if (mode === "compression") return "압";
  return "0";
}

function rangeWord(min: number, max: number) {
  if (min < -0.05 && max > 0.05) return "양";
  if (max > 0.05) return "인";
  if (min < -0.05) return "압";
  return "0";
}

export function SolutionPanel({
  analysis,
  envelope,
  active,
  onPick,
  cost,
  budget,
  kicker,
  caseLabel,
  placeholder = "절점을 잇고 하중을 올리세요.",
}: {
  analysis: Analysis | null;
  envelope?: EnvelopeBar[];
  active: number | null;
  onPick: (index: number | null) => void;
  cost?: number;
  budget?: number;
  kicker?: string;
  caseLabel?: string;
  placeholder?: string;
}) {
  if (!analysis || analysis.status === "empty" || analysis.status === "invalid") {
    return (
      <aside className="panel solution">
        <div className="badge">풀이</div>
        <p className="note" style={{ marginTop: 12 }}>
          {analysis?.message || placeholder}
        </p>
      </aside>
    );
  }

  const det =
    analysis.degree === 0 ? "정정" : analysis.degree > 0 ? "부정정" : "불안정";
  const badgeClass =
    analysis.status === "ok" ? "ok" : analysis.status === "overstressed" ? "bad" : "warn";

  return (
    <aside className="panel solution">
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {kicker ? <span className="badge">{kicker}</span> : null}
        <span className={`badge ${badgeClass}`}>{analysis.status === "ok" ? "견딤" : analysis.status === "overstressed" ? "파괴" : analysis.message}</span>
        <span className="badge">
          {det} {analysis.m}+{analysis.r}={analysis.m + analysis.r} · {analysis.space ? "3j" : "2j"}=
          {analysis.j * (analysis.space ? 3 : 2)}
        </span>
      </div>
      {typeof cost === "number" && typeof budget === "number" ? (
        <p style={{ margin: "10px 0 0", fontWeight: 800 }}>
          재료비 {fmt(cost)} <span style={{ color: "#7b8798", fontWeight: 700 }}>/ {budget}</span>
        </p>
      ) : null}
      <p className="note" style={{ margin: "8px 0 0" }}>
        {[
          analysis.method === "joints" ? "절점법" : analysis.method === "stiffness" ? "EA 분담" : "",
          caseLabel,
          analysis.status === "overstressed" ? analysis.message : "",
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      {envelope && envelope.length > 0 ? (
        <div className="chips" aria-label="포락">
          {envelope.map((bar) => {
            const varied = bar.min < -0.05 && bar.max > 0.05;
            const mode = rangeWord(bar.min, bar.max);
            const tone = mode === "양" ? "zero" : mode === "인" ? "tension" : mode === "압" ? "compression" : "zero";
            return (
              <span key={bar.memberId} className={`chip ${tone}`}>
                {bar.name}{" "}
                {varied ? `${signed(bar.min)}~${signed(bar.max)}` : signed(bar.max === 0 ? bar.min : bar.worst)}{" "}
                {mode}
                {bar.over ? " !" : ""}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="chips">
          {analysis.forces.map((force) => (
            <span key={force.memberId} className={`chip ${force.mode}`}>
              {force.name} {force.mode === "zero" ? "0" : signed(force.axial)} {word(force.mode)}
            </span>
          ))}
        </div>
      )}

      <div className="chips">
        {analysis.reactions
          .filter((reaction) => Math.hypot(reaction.rx, reaction.ry, reaction.rz ?? 0) > 0.05)
          .map((reaction) => {
            const tag = nodeTag(analysis, reaction.nodeId);
            const bits = [
              Math.abs(reaction.rx) > 0.05 ? `${tag}x ${signed(reaction.rx)}` : "",
              Math.abs(reaction.ry) > 0.05 ? `${tag}y ${signed(reaction.ry)}` : "",
              Math.abs(reaction.rz ?? 0) > 0.05 ? `${tag}z ${signed(reaction.rz ?? 0)}` : "",
            ].filter(Boolean);
            return (
              <span key={reaction.nodeId} className="chip">
                {bits.join("  ")}
              </span>
            );
          })}
      </div>

      {analysis.steps.map((step, index) => (
        <StepButton key={`${step.title}-${index}`} step={step} on={active === index} onClick={() => onPick(active === index ? null : index)} />
      ))}
    </aside>
  );
}

function nodeTag(analysis: Analysis, nodeId: number) {
  const ids = analysis.reactions.map((reaction) => reaction.nodeId).sort((a, b) => a - b);
  const index = ids.indexOf(nodeId);
  return index >= 0 ? letter(index) : `#${nodeId}`;
}

function StepButton({ step, on, onClick }: { step: SolutionStep; on: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`step ${on ? "on" : ""}`} onClick={onClick}>
      <div className="title">{step.title}</div>
      {step.lines.map((line, index) => (
        <div key={index} className={`eq ${line.tone ?? ""}`}>
          {line.text}
        </div>
      ))}
    </button>
  );
}
