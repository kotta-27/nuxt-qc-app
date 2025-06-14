<template>
  <div class="container">
    <div class="title-container">
      <div class="title-text">量子回路シミュレータ</div>
    </div>
    <div class="content-container">
      <div class="left-container">
        <QuantumGatePalette />
        <QuantumCircuit
          :circuitData="circuitData"
          :pendingMultiQubitGate="pendingMultiQubitGate"
          @place-gate="placeGate"
          @remove-gate="removeGate"
          @select-control-qubit="selectControlQubit"
          :activeQubits="activeQubits"
          @toggle-qubit-active="toggleQubitActive"
        />
        <div class="btn-row">
          <button class="reset-btn" @click="resetCircuit">リセット</button>
        </div>
        <div class="btn-template-container">
          <div class="btn-template-title">テンプレート</div>
          <button class="calc-btn" @click="setFullAdderTemplate">
            全加算器
          </button>
          <button class="calc-btn" @click="setHalfAdderTemplate">
            半加算器
          </button>
        </div>
      </div>
      <div class="right-container">
        <div class="probability-distribution-container">
          <QuantumResultChart :probabilityMap="probabilityMap" />
        </div>
        <div class="sampling-container">
          <div style="margin: 0 0 8px 0">
            <label
              >ショット数:
              <input
                type="number"
                v-model.number="shots"
                min="1"
                max="10000"
                style="width: 80px"
            /></label>
            <label style="margin-left: 16px">
              <input type="checkbox" v-model="noiseEnabled" /> ノイズを入れる
            </label>
            <label v-if="noiseEnabled" style="margin-left: 8px">
              ノイズ強度:
              <input
                type="number"
                v-model.number="noiseLevel"
                min="0"
                max="100"
                style="width: 60px"
              />
              %
            </label>
            <button @click="measure" class="measure-btn">計測する</button>
          </div>
          <QuantumSampleHistogram :histogram="histogram" :shots="shots" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import QuantumGatePalette from "~/components/QuantumGatePalette.vue";
import QuantumCircuit from "~/components/QuantumCircuit.vue";
import QuantumResultChart from "~/components/QuantumResultChart.vue";
import QuantumSampleHistogram from "~/components/QuantumSampleHistogram.vue";
import { simulateQuantumCircuit } from "~/utils/quantumSimulator";
import type { ProbabilityMap } from "~/utils/quantumSimulator";

const NUM_QUBITS = 4;
const NUM_SLOTS = 8;

// アクティブなqubitインデックス配列
const activeQubits = ref<number[]>(
  Array.from({ length: NUM_QUBITS }, (_, i) => i)
);

function toggleQubitActive(q: number) {
  if (activeQubits.value.includes(q)) {
    activeQubits.value = activeQubits.value.filter((x) => x !== q);
  } else {
    activeQubits.value = [...activeQubits.value, q].sort((a, b) => a - b);
  }
}

export type MultiQubitGate =
  | {
      type: "CX" | "CH" | "CZ" | "X" | "H" | "Y" | "Z";
      slot: number;
      target: number;
    }
  | { type: "CCX"; slot: number; target: number; controls?: number[] };
export type CXGate = { type: "CX"; control: number; target: number };
export type CHGate = { type: "CH"; control: number; target: number };
export type CZGate = { type: "CZ"; control: number; target: number };
export type CCXGate = {
  type: "CCX";
  controls: [number, number];
  target: number;
};
export type InputGate = { type: "input" };
export type GateCell =
  | string
  | null
  | CXGate
  | CHGate
  | CZGate
  | CCXGate
  | InputGate;

function createEmptyCircuit(): GateCell[][] {
  return Array.from({ length: NUM_QUBITS }, () => Array(NUM_SLOTS).fill(null));
}

const circuitData = ref<GateCell[][]>(createEmptyCircuit());
const probabilityMap = ref<ProbabilityMap>(
  simulateQuantumCircuit(circuitData.value)
);

// サンプリング用
const shots = ref(1000);
const histogram = ref<{ [bitstring: string]: number }>({});
const noiseEnabled = ref(false);
const noiseLevel = ref(5); // デフォルト5%

// 指定したビットだけ抜き出したビット列を返す
function extractActiveBits(bitstring: string, active: number[]) {
  return active.map((q) => bitstring[q]).join("");
}

watch(
  [circuitData, activeQubits],
  ([newVal, newActive]) => {
    const rawMap = simulateQuantumCircuit(newVal);
    // activeQubitsだけで集計
    const reducedMap: ProbabilityMap = {};
    Object.entries(rawMap).forEach(([bitstring, prob]) => {
      const reduced = extractActiveBits(bitstring, newActive);
      reducedMap[reduced] = (reducedMap[reduced] || 0) + prob;
    });
    probabilityMap.value = reducedMap;
  },
  { deep: true }
);

function sampleFromProbabilityMap(
  probMap: ProbabilityMap,
  shots: number
): { [bitstring: string]: number } {
  const keys = Object.keys(probMap);
  const probs = keys.map((k) => probMap[k]);
  const cdf = probs.reduce((acc, p, i) => {
    acc.push((acc[i - 1] || 0) + p);
    return acc;
  }, [] as number[]);
  const result: { [bitstring: string]: number } = {};
  for (let i = 0; i < shots; i++) {
    const r = Math.random();
    const idx = cdf.findIndex((c) => r < c);
    const key = keys[idx];
    result[key] = (result[key] || 0) + 1;
  }
  keys.forEach((k) => {
    if (!(k in result)) result[k] = 0;
  });
  return result;
}

type PlaceGatePayload = {
  qubit: number;
  slot: number;
  gate: "X" | "H" | "Y" | "Z" | "CX" | "CH" | "CZ" | "CCX";
};
type RemoveGatePayload = { qubit: number; slot: number };

const pendingMultiQubitGate = ref<MultiQubitGate | null>(null);

function placeGate({ qubit, slot, gate }: PlaceGatePayload) {
  if (["CX", "CH", "CZ", "CCX"].includes(gate)) {
    if (gate === "CCX") {
      pendingMultiQubitGate.value = {
        type: gate,
        slot,
        target: qubit,
        controls: [],
      };
    } else {
      pendingMultiQubitGate.value = { type: gate, slot, target: qubit };
    }
    return;
  }
  const newData = circuitData.value.map((row) => [...row]);
  newData[qubit][slot] = gate;
  circuitData.value = newData;
}

function selectControlQubit(control: number) {
  if (!pendingMultiQubitGate.value) return;
  const { type, slot, target } = pendingMultiQubitGate.value;
  if (type === "CCX") {
    const controls = pendingMultiQubitGate.value.controls || [];
    if (controls.includes(control) || control === target) return;
    controls.push(control);
    if (controls.length < 2) {
      pendingMultiQubitGate.value = { type, slot, target, controls };
      return;
    }
    // 2つの制御ビットが揃ったら配置
    const newData = circuitData.value.map((row) => [...row]);
    newData[controls[0]][slot] = {
      type: "CCX",
      controls: [controls[0], controls[1]],
      target,
    };
    newData[controls[1]][slot] = {
      type: "CCX",
      controls: [controls[0], controls[1]],
      target,
    };
    newData[target][slot] = {
      type: "CCX",
      controls: [controls[0], controls[1]],
      target,
    };
    circuitData.value = newData;
    pendingMultiQubitGate.value = null;
    return;
  }
  if (control === target) return;
  const newData = circuitData.value.map((row) => [...row]);
  if (type === "CX") {
    newData[control][slot] = { type: "CX", control, target };
    newData[target][slot] = { type: "CX", control, target };
  } else if (type === "CH") {
    newData[control][slot] = { type: "CH", control, target };
    newData[target][slot] = { type: "CH", control, target };
  } else if (type === "CZ") {
    newData[control][slot] = { type: "CZ", control, target };
    newData[target][slot] = { type: "CZ", control, target };
  }
  circuitData.value = newData;
  pendingMultiQubitGate.value = null;
}

function removeGate(
  payload: RemoveGatePayload | { qubits: number[]; slot: number }
) {
  const newData = circuitData.value.map((row) => [...row]);
  if ("qubits" in payload) {
    for (const q of payload.qubits) {
      newData[q][payload.slot] = null;
    }
  } else {
    newData[payload.qubit][payload.slot] = null;
  }
  circuitData.value = newData;
}

function resetCircuit() {
  circuitData.value = createEmptyCircuit();
  activeQubits.value = [0, 1, 2, 3];
  pendingMultiQubitGate.value = null;
}

// 状態ベクトルにノイズを加えて正規化する
function addNoiseAndNormalize(state: number[], noisePercent: number): number[] {
  const noiseAmp = noisePercent / 100;
  // 各成分にノイズを加える（ガウス分布 or 一様乱数）
  let noisy = state.map((v) => v + (Math.random() * 2 - 1) * noiseAmp);
  // 負の値は0にする（確率解釈のため）
  noisy = noisy.map((v) => (v < 0 ? 0 : v));
  // 正規化
  const norm = Math.sqrt(noisy.reduce((acc, v) => acc + v * v, 0));
  return noisy.map((v) => v / (norm || 1));
}

function measure() {
  // activeQubitsだけでサンプリング結果を集計
  let rawState = null;
  let rawMap = null;
  if (noiseEnabled.value) {
    // ノイズを加えた状態ベクトルを作る
    // simulateQuantumCircuitの内部ロジックを一部再現
    const numQubits = circuitData.value.length;
    const numSlots = circuitData.value[0]?.length || 0;
    // 状態ベクトルの初期化
    let state = Array(2 ** numQubits).fill(0);
    state[0] = 1;
    for (let col = 0; col < numSlots; col++) {
      // ...既存のsimulateQuantumCircuitのループを簡易再現...
      // ここでは簡易的に通常のsimulateQuantumCircuitで状態ベクトルを取得し、ノイズを加える
      // 本来はutils/quantumSimulator.tsを分割して状態ベクトルを直接取得できるようにするのが理想
    }
    // 既存の確率分布を取得
    rawMap = simulateQuantumCircuit(circuitData.value);
    // 確率分布から状態ベクトルを近似（√pで位相無視）
    rawState = Object.values(rawMap).map((p) => Math.sqrt(p));
    // ノイズを加えて正規化
    const noisyState = addNoiseAndNormalize(rawState, noiseLevel.value);
    // 確率分布に変換
    const noisyProbMap: ProbabilityMap = {};
    const keys = Object.keys(rawMap);
    noisyState.forEach((amp, i) => {
      noisyProbMap[keys[i]] = amp * amp;
    });
    // activeQubitsだけで集計
    const reducedMap: ProbabilityMap = {};
    Object.entries(noisyProbMap).forEach(([bitstring, prob]) => {
      const reduced = extractActiveBits(bitstring, activeQubits.value);
      reducedMap[reduced] = (reducedMap[reduced] || 0) + prob;
    });
    histogram.value = sampleFromProbabilityMap(reducedMap, shots.value);
  } else {
    // ノイズなし
    const rawMap = simulateQuantumCircuit(circuitData.value);
    const reducedMap: ProbabilityMap = {};
    Object.entries(rawMap).forEach(([bitstring, prob]) => {
      const reduced = extractActiveBits(bitstring, activeQubits.value);
      reducedMap[reduced] = (reducedMap[reduced] || 0) + prob;
    });
    histogram.value = sampleFromProbabilityMap(reducedMap, shots.value);
  }
}

function setFullAdderTemplate() {
  resetCircuit();
  const newData = circuitData.value.map((row) => [...row]);
  // 入力ビットの背景色を変更
  newData[0][0] = { type: "input" };
  newData[1][0] = { type: "input" };
  newData[2][0] = { type: "input" };
  // slot2
  newData[0][2] = { type: "CCX", controls: [0, 1], target: 3 };
  newData[1][2] = { type: "CCX", controls: [0, 1], target: 3 };
  newData[3][2] = { type: "CCX", controls: [0, 1], target: 3 };
  // slot3
  newData[0][3] = { type: "CX", control: 0, target: 1 };
  newData[1][3] = { type: "CX", control: 0, target: 1 };
  // slot4
  newData[1][4] = { type: "CCX", controls: [1, 2], target: 3 };
  newData[2][4] = { type: "CCX", controls: [1, 2], target: 3 };
  newData[3][4] = { type: "CCX", controls: [1, 2], target: 3 };
  // slot5
  newData[1][5] = { type: "CX", control: 1, target: 2 };
  newData[2][5] = { type: "CX", control: 1, target: 2 };
  circuitData.value = newData;
  activeQubits.value = [2, 3];
}

function setHalfAdderTemplate() {
  resetCircuit();
  const newData = circuitData.value.map((row) => [...row]);
  // 入力ビットの背景色を変更
  newData[0][0] = { type: "input" };
  newData[1][0] = { type: "input" };
  // slot3
  newData[0][3] = {
    type: "CCX",
    controls: [0, 1] as [number, number],
    target: 2,
  };
  newData[1][3] = {
    type: "CCX",
    controls: [0, 1] as [number, number],
    target: 2,
  };
  newData[2][3] = {
    type: "CCX",
    controls: [0, 1] as [number, number],
    target: 2,
  };
  // slot4
  newData[0][4] = { type: "CX", control: 0, target: 1 };
  newData[1][4] = { type: "CX", control: 0, target: 1 };
  circuitData.value = newData;
  activeQubits.value = [1, 2];
}
</script>

<style scoped>
.container {
  width: 100%;
  height: 100vh;
  background: #f7f7f7;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.btn-row {
  display: flex;
  flex-direction: row;
  justify-content: end;
  gap: 16px;
  margin-bottom: 32px;
}
.calc-btn,
.reset-btn {
  padding: 8px 10px;
  font-size: 0.7rem;
  border-radius: 8px;
  border: none;
  background: #1976d2;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}
.reset-btn {
  background: #888;
  border: 2px solid #888;
}

.calc-btn {
  font-size: 0.9rem;
  width: 150px;
}
.calc-btn:hover {
  background: #1565c0;
}
.reset-btn:hover {
  background: #666;
  border: 2px solid #0f0f0f;
}

.btn-template-container {
  border: 1.5px solid #888;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.btn-template-title {
  font-size: 1rem;
  font-weight: bold;
}

.title-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 10vh;
  background-color: #1976d2;
  color: #fff;
}

.title-text {
  font-size: 1.7rem;
  font-weight: bold;
}

.content-container {
  background-color: rgba(208, 208, 208, 0.5);
  width: 100%;
  height: 90vh;
  display: flex;
  flex-direction: row;
  align-items: center;
}

.left-container {
  width: 50%;
  height: 100%;
  padding: 0 16px;
}
.right-container {
  width: 50%;
  height: 100%;
}
.probability-distribution-container {
  width: 100%;
  height: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.sampling-container {
  width: 100%;
  height: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.measure-btn {
  margin-left: 16px;
  padding: 4px 16px;
  border-radius: 6px;
  background: #17c961;
  border: 2px solid #17c961;
  color: #fff;
  cursor: pointer;
}
.measure-btn:hover {
  background: #15a352;
  border: 2px solid #010703;
}
</style>
