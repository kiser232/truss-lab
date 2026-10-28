export const COLS = 12;
export const ROWS = 8;
export const STEP = 58;
export const PAD_L = 48;
export const PAD_T = 36;

export const BOARD_W = PAD_L + COLS * STEP + 40;
export const BOARD_H = PAD_T + ROWS * STEP + 46;

export function toScreen(x: number, y: number): { sx: number; sy: number } {
  return {
    sx: PAD_L + x * STEP,
    sy: PAD_T + (ROWS - y) * STEP,
  };
}

export function fromScreen(sx: number, sy: number): { x: number; y: number } {
  return {
    x: (sx - PAD_L) / STEP,
    y: ROWS - (sy - PAD_T) / STEP,
  };
}

export function pointSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  if (length < 1e-9) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / length;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
