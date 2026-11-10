"use client";

export function ZoomBar({
  zoom,
  step,
  onZoom,
  onReset,
}: {
  zoom: number;
  step: number;
  onZoom: (next: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="zoom-bar">
      <button type="button" onClick={() => onZoom(zoom / 1.25)} aria-label="축소">
        −
      </button>
      <button type="button" onClick={onReset}>
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" onClick={() => onZoom(zoom * 1.25)} aria-label="확대">
        +
      </button>
      <span>{step}m</span>
    </div>
  );
}
