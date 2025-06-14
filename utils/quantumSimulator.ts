import type { CXGate, CHGate, CZGate, GateCell } from '../pages/index.vue';
export type CircuitData = GateCell[][];
export type ProbabilityMap = { [bitstring: string]: number };

// 1量子ビットゲートの行列定義
const I = [
  [1, 0],
  [0, 1],
];
const X = [
  [0, 1],
  [1, 0],
];
const H = [
  [1 / Math.sqrt(2), 1 / Math.sqrt(2)],
  [1 / Math.sqrt(2), -1 / Math.sqrt(2)],
];
const Z = [
  [1, 0],
  [0, -1],
];

// 2量子ビットCXゲート（4x4）
const CX = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 0, 1],
  [0, 0, 1, 0],
];
// CH: 制御が1のときH
const CH = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1/Math.sqrt(2), 1/Math.sqrt(2)],
  [0, 0, 1/Math.sqrt(2), -1/Math.sqrt(2)]
];
// CZ: 制御が1のときZ
const CZ = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, -1],
];

function getGateMatrix(gate: GateCell) {
  if (typeof gate === 'object' && gate !== null && (
    gate.type === 'CX' || gate.type === 'CH' || gate.type === 'CZ')) {
    // 多量子ビットゲートはここではIを返す（本体で適用）
    return I;
  }
  switch (gate) {
    case 'X': return X;
    case 'H': return H;
    case 'Z': return Z;
    case null:
    case undefined:
    case 'I':
    default:
      return I;
  }
}

// テンソル積（Kronecker積）
function kron(a: number[][], b: number[][]): number[][] {
  const m = a.length, n = a[0].length;
  const p = b.length, q = b[0].length;
  const result: number[][] = Array.from({ length: m * p }, () => Array(n * q).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < p; k++) {
        for (let l = 0; l < q; l++) {
          result[i * p + k][j * q + l] = a[i][j] * b[k][l];
        }
      }
    }
  }
  return result;
}

// 行列×ベクトル
function matVecMul(mat: number[][], vec: number[]): number[] {
  return mat.map(row => row.reduce((acc, v, i) => acc + v * vec[i], 0));
}

// 状態ベクトルの初期化
function getInitialState(numQubits: number): number[] {
  const state = Array(2 ** numQubits).fill(0);
  state[0] = 1;
  return state;
}

// ビット列文字列化
function indexToBitString(idx: number, numQubits: number): string {
  return idx.toString(2).padStart(numQubits, '0');
}

export function simulateQuantumCircuit(circuitData: CircuitData): ProbabilityMap {
  const numQubits = circuitData.length;
  const numSlots = circuitData[0]?.length || 0;
  let state = getInitialState(numQubits);

  for (let col = 0; col < numSlots; col++) {
    // まず2量子ビットゲート（CX,CH,CZ）を探す
    let twoQubitPairs: {type: string, ctrl: number, tgt: number, mat: number[][]}[] = [];
    for (let row = 0; row < numQubits - 1; row++) {
      const cell = circuitData[row][col];
      const nextCell = circuitData[row + 1][col];
      if (typeof cell === 'object' && cell !== null &&
          typeof nextCell === 'object' && nextCell !== null &&
          cell.type === nextCell.type &&
          (cell.type === 'CX' || cell.type === 'CH' || cell.type === 'CZ') &&
          cell.control === row && cell.target === row + 1 &&
          nextCell.control === row && nextCell.target === row + 1) {
        let mat = CX;
        if (cell.type === 'CH') mat = CH;
        if (cell.type === 'CZ') mat = CZ;
        twoQubitPairs.push({type: cell.type, ctrl: row, tgt: row + 1, mat});
      }
    }
    // どのビットに2量子ビットゲートがあるかを記録
    let skip = Array(numQubits).fill(false);
    twoQubitPairs.forEach(({ctrl, tgt}) => {
      skip[ctrl] = true;
      skip[tgt] = true;
    });

    // ゲート行列リストを作る
    let gateMats: number[][][] = [];
    for (let row = 0; row < numQubits; ) {
      // 2量子ビットゲート
      const pair = twoQubitPairs.find(({ctrl}) => ctrl === row);
      if (pair) {
        gateMats.push(pair.mat);
        row += 2;
        continue;
      }
      // 1量子ビットゲート
      if (!skip[row]) {
        gateMats.push(getGateMatrix(circuitData[row][col]));
      }
      row += 1;
    }
    // テンソル積で全体ユニタリ行列を構築
    let U = gateMats.reduce((acc, mat) => kron(acc, mat));
    // 状態ベクトルを更新
    state = matVecMul(U, state);
  }

  // 確率分布を計算
  const probMap: ProbabilityMap = {};
  for (let i = 0; i < state.length; i++) {
    probMap[indexToBitString(i, numQubits)] = Math.pow(Math.abs(state[i]), 2);
  }
  return probMap;
} 