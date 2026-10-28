/** 부분 피벗 가우스-조던 소거. 특이행렬이면 null. */
export function solveLinear(matrix: number[][], vector: number[]): number[] | null {
  const n = vector.length;
  if (matrix.length !== n) return null;
  if (n === 0) return [];

  const rows = matrix.map((row, index) => {
    if (row.length !== n) return null;
    return [...row, vector[index]];
  });
  if (rows.some((row) => row === null)) return null;
  const m = rows as number[][];

  for (let column = 0; column < n; column += 1) {
    let pivot = column;
    let best = Math.abs(m[column][column]);
    for (let row = column + 1; row < n; row += 1) {
      const value = Math.abs(m[row][column]);
      if (value > best) {
        best = value;
        pivot = row;
      }
    }
    let scale = 0;
    for (let row = column; row < n; row += 1) {
      scale = Math.max(scale, Math.abs(m[row][column]));
    }
    if (!(best > 1e-10) || best <= 1e-9 * Math.max(1, scale)) return null;
    if (pivot !== column) {
      const swap = m[column];
      m[column] = m[pivot];
      m[pivot] = swap;
    }
    const divisor = m[column][column];
    for (let col = column; col <= n; col += 1) m[column][col] /= divisor;
    for (let row = 0; row < n; row += 1) {
      if (row === column) continue;
      const factor = m[row][column];
      if (factor === 0) continue;
      for (let col = column; col <= n; col += 1) {
        m[row][col] -= factor * m[column][col];
      }
    }
  }

  const solution = m.map((row) => row[n]);
  if (solution.some((value) => !Number.isFinite(value))) return null;
  return solution;
}

export function solve2(a: number[][], rhs: number[]): [number, number] | null {
  const determinant = a[0][0] * a[1][1] - a[0][1] * a[1][0];
  if (Math.abs(determinant) < 1e-8) return null;
  const x = (rhs[0] * a[1][1] - a[0][1] * rhs[1]) / determinant;
  const y = (a[0][0] * rhs[1] - rhs[0] * a[1][0]) / determinant;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [x, y];
}
