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

// 3量子ビットCCXゲート（8x8）
const CCX = [
  [1,0,0,0,0,0,0,0],
  [0,1,0,0,0,0,0,0],
  [0,0,1,0,0,0,0,0],
  [0,0,0,1,0,0,0,0],
  [0,0,0,0,1,0,0,0],
  [0,0,0,0,0,1,0,0],
  [0,0,0,0,0,0,0,1],
  [0,0,0,0,0,0,1,0],
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

// n量子ビットのテンソル積で、任意の位置に多量子ビットゲートを挿入
function kronNWithGate(numQubits: number, gate: number[][], positions: number[]) {
  let mats: number[][][] = [];
  let i = 0;
  while (i < numQubits) {
    if (positions.includes(i)) {
      if (i === positions[0]) {
        mats.push(gate);
        i += positions.length;
      } else {
        i++;
      }
    } else {
      mats.push(I);
      i++;
    }
  }
  return mats.reduce((acc, m) => kron(acc, m), [[1]]);
}

// 任意の位置の2量子ビット制御ゲート（CX, CZ, CH）全体行列を構築
function makeGeneralControlledGate(numQubits: number, control: number, target: number, baseGate: number[][]) {
  const dim = 2 ** numQubits;
  const U = Array.from({ length: dim }, () => Array(dim).fill(0));
  for (let i = 0; i < dim; i++) {
    const bits = i.toString(2).padStart(numQubits, '0').split('').map(Number);
    if (bits[control] === 1) {
      // ターゲットにbaseGateを作用
      const flipped = [...bits];
      // baseGate: 2x2
      const t = bits[target];
      for (let k = 0; k < 2; k++) {
        flipped[target] = k;
        const j = parseInt(flipped.join(''), 2);
        U[j][i] = baseGate[k][t];
      }
    } else {
      U[i][i] = 1;
    }
  }
  return U;
}

// 任意の位置の3量子ビットCCX全体行列
function makeGeneralCCX(numQubits: number, controls: number[], target: number) {
  const dim = 2 ** numQubits;
  const U = Array.from({ length: dim }, () => Array(dim).fill(0));
  for (let i = 0; i < dim; i++) {
    const bits = i.toString(2).padStart(numQubits, '0').split('').map(Number);
    if (bits[controls[0]] === 1 && bits[controls[1]] === 1) {
      const flipped = [...bits];
      flipped[target] = 1 - flipped[target];
      const j = parseInt(flipped.join(''), 2);
      U[j][i] = 1;
    } else {
      U[i][i] = 1;
    }
  }
  return U;
}

export function simulateQuantumCircuit(circuitData: CircuitData): ProbabilityMap {
  const numQubits = circuitData.length;
  const numSlots = circuitData[0]?.length || 0;
  let state = getInitialState(numQubits);
  console.log(circuitData);

  for (let col = 0; col < numSlots; col++) {
    // まずこの列の多量子ビットゲートを全て収集
    let used = Array(numQubits).fill(false);
    let gateOps: { mat: number[][], positions: number[] }[] = [];
    for (let q = 0; q < numQubits; q++) {
      if (used[q]) continue;
      const cell = circuitData[q][col];
      if (typeof cell === 'object' && cell !== null) {
        if (cell.type === 'CX' || cell.type === 'CH' || cell.type === 'CZ') {
          const ctrl = cell.control;
          const tgt = cell.target;
          if (!used[ctrl] && !used[tgt]) {
            let baseGate = X;
            if (cell.type === 'CH') baseGate = H;
            if (cell.type === 'CZ') baseGate = Z;
            const U = makeGeneralControlledGate(numQubits, ctrl, tgt, baseGate);
            gateOps.push({ mat: U, positions: Array.from({length: numQubits}, (_,i)=>i) });
            used[ctrl] = true;
            used[tgt] = true;
          }
        } else if (cell.type === 'CCX') {
          const [c1, c2] = cell.controls;
          const tgt = cell.target;
          if (!used[c1] && !used[c2] && !used[tgt]) {
            const U = makeGeneralCCX(numQubits, [c1, c2], tgt);
            gateOps.push({ mat: U, positions: Array.from({length: numQubits}, (_,i)=>i) });
            used[c1] = true;
            used[c2] = true;
            used[tgt] = true;
          }
        }
      }
    }
    // 1量子ビットゲートやIを残りに
    for (let q = 0; q < numQubits; q++) {
      if (!used[q]) {
        gateOps.push({ mat: getGateMatrix(circuitData[q][col]), positions: [q] });
        used[q] = true;
      }
    }
    // 位置でソート（テンソル積順序を保証）
    gateOps.sort((a, b) => a.positions[0] - b.positions[0]);
    // 全体ユニタリを構築
    let U = [[1]];
    for (const op of gateOps) {
      if (op.positions.length === numQubits) {
        U = op.mat;
        break;
      } else {
        U = kron(U, op.mat);
      }
    }
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