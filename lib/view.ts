export function snapStep(zoom: number) {
  if (zoom >= 5) return 0.05;
  if (zoom >= 2.5) return 0.1;
  if (zoom >= 1.5) return 0.25;
  return 0.5;
}

export function quantize(value: number, step: number) {
  return Math.round(Math.round(value / step) * step * 1000) / 1000;
}

export function clampZoom(zoom: number) {
  return Math.min(10, Math.max(0.35, zoom));
}
