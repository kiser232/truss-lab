export function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) < 0.05) return "0";
  const r = Math.round(n * 100) / 100;
  if (Math.abs(r - Math.round(r)) < 0.001) return String(Math.round(r));
  return r.toFixed(2).replace(/0$/, "").replace(/\.$/, "");
}

export function fmtCoef(n: number): string {
  const a = Math.abs(n);
  if (a < 0.0005) return "";
  if (Math.abs(a - 1) < 0.001) return "";
  const r = Math.round(a * 1000) / 1000;
  return `${r.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")} `;
}

export function signed(n: number): string {
  if (Math.abs(n) < 0.05) return "0";
  return n > 0 ? `+${fmt(n)}` : `−${fmt(Math.abs(n))}`;
}

export function letter(index: number): string {
  let n = index;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}
