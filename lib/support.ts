import type { Support, SupportType } from "./types";

export function supportAngle(support: { type: SupportType; angle?: number }) {
  if (typeof support.angle === "number" && Number.isFinite(support.angle)) {
    return ((Math.round(support.angle / 90) * 90) % 360 + 360) % 360;
  }
  return support.type === "rollerX" ? 90 : 0;
}

export function canTurn(type: SupportType) {
  return type === "pin" || type === "rollerY" || type === "rollerX" || type === "ball" || type === "slot";
}

/** Quarter-turn. Rollers switch between a floor roller and the old horizontal roller. */
export function rotateSupport(support: Support): Support {
  const angle = (supportAngle(support) + 90) % 360;
  if (support.type === "rollerY" || support.type === "rollerX") {
    const restrainsX = angle === 90 || angle === 270;
    return { ...support, angle, type: restrainsX ? "rollerX" : "rollerY" };
  }
  return { ...support, angle };
}
