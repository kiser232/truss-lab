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
            <span key={force.memberId} className={`chip ${force.mode}`} title={typeof force.angle === "number" ? `가로축과의 기울기 ${force.angle}°. 0°는 수평, 90°는 수직입니다.` : undefined}>
              {force.name} {force.mode === "zero" ? "0" : signed(force.axial)} {word(force.mode)}
              {typeof force.angle === "number" ? ` · ${force.angle}°` : ""}
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

function stepHint(step: SolutionStep) {
  if (step.kind === "reaction") return "구조 전체를 한 덩어리로 보고, 부재로 들어가기 전에 지점 반력을 구합니다.";
  if (step.kind === "joint") return "미지 부재가 두 개 이하인 절점입니다. 가로 힘의 합과 세로 힘의 합이 각각 0입니다.";
  return "식으로 하나씩 정해지지 않아, 부재 강성 EA로 힘을 나눈 결과입니다.";
}

function lineHint(text: string, tone?: string, hint?: string) {
  if (hint) return hint;
  if (tone === "tension") return "양수는 인장입니다. 부재가 절점을 당깁니다.";
  if (tone === "compression") return "음수는 압축입니다. 부재가 절점을 밉니다.";
  if (tone === "zero") return "이 부재에는 축력이 없습니다.";
  if (tone === "result") return "바로 위 식에서 구한 값입니다.";
  if (text.includes("Σ")) return "힘 또는 모멘트의 합이 0이라는 평형 식입니다.";
  return "이 계산 단계의 식입니다.";
}

function StepButton({ step, on, onClick }: { step: SolutionStep; on: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`step ${on ? "on" : ""}`} onClick={onClick}>
      <div className="title" title={stepHint(step)}>{step.title}</div>
      {step.lines.map((line, index) => (
        <div key={index} className={`eq ${line.tone ?? ""}`} title={lineHint(line.text, line.tone, line.hint)}>
          {line.text}
        </div>
      ))}
    </button>
  );
}
