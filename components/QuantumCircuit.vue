<template>
  <div class="circuit-area">
    <div class="multi-qubit-gate-message">
      <div v-if="pendingMultiQubitGate" class="pending-multiqubit-message">
        <template v-if="pendingMultiQubitGate.type === 'CCX'">
          制御ビットを2つ選択してください（列:
          {{ pendingMultiQubitGate.slot + 1 }}）
        </template>
        <template v-else>
          制御ビットを選択してください（列:
          {{ pendingMultiQubitGate.slot + 1 }}）
        </template>
      </div>
    </div>

    <div v-for="(row, q) in circuitData" :key="q" class="qubit-row">
      <span class="qubit-label">
        <KatexLabel :expr="`q_{${q}} \\quad | 0 \\rangle`" />
      </span>
      <div class="circuit-line">
        <span
          v-for="(gate, i) in row"
          :key="i"
          class="circuit-slot"
          :class="{
            'has-gate': !!gate,
            'input-bit': typeof gate === 'object' && gate?.type === 'input',
            'control-candidate':
              pendingMultiQubitGate &&
              pendingMultiQubitGate.slot === i &&
              pendingMultiQubitGate.target !== q,
            'ccx-control-selected':
              pendingMultiQubitGate &&
              pendingMultiQubitGate.type === 'CCX' &&
              pendingMultiQubitGate.slot === i &&
              Array.isArray(pendingMultiQubitGate.controls) &&
              pendingMultiQubitGate.controls.includes(q),
          }"
          @dragover.prevent
          @drop="onDrop(q, i, $event)"
          @click="onSlotClick(q, i)"
          style="position: relative"
        >
          <!-- 多量子ビットゲートの仮描画（pending中） -->
          <template
            v-if="
              pendingMultiQubitGate &&
              pendingMultiQubitGate.slot === i &&
              pendingMultiQubitGate.target === q
            "
          >
            <div class="cx-target-x">
              {{
                pendingMultiQubitGate.type === "CX"
                  ? "X"
                  : pendingMultiQubitGate.type === "CH"
                  ? "H"
                  : pendingMultiQubitGate.type === "CZ"
                  ? "Z"
                  : "?"
              }}
            </div>
          </template>
          <!-- 多量子ビットゲート描画（常に標的ビットにX/H/Zを描画） -->
          <template v-if="isMultiQubitGate(gate)">
            <div
              v-if="gate.type === 'CCX' && gate.target === q"
              class="cx-target-x"
              draggable="true"
              @dragstart="onCXDragStart(gate.controls[0], i, $event)"
              @dblclick="
                emit('remove-gate', {
                  qubits: [gate.controls[0], gate.controls[1], gate.target],
                  slot: i,
                })
              "
            >
              X
            </div>
            <div
              v-else-if="
                gate.type === 'CCX' &&
                gate.controls &&
                gate.controls.includes(q)
              "
              class="cx-control"
              draggable="true"
              @dragstart="onCXDragStart(gate.controls[0], i, $event)"
              @dblclick="
                emit('remove-gate', {
                  qubits: [gate.controls[0], gate.controls[1], gate.target],
                  slot: i,
                })
              "
            ></div>
            <div
              v-else-if="gate.type !== 'CCX' && gate.control === q"
              class="cx-control"
              draggable="true"
              @dragstart="onCXDragStart(gate.control, i, $event)"
              @dblclick="
                emit('remove-gate', {
                  qubits: [gate.control, gate.target],
                  slot: i,
                })
              "
            ></div>
            <div
              v-else-if="gate.type !== 'CCX' && gate.target === q"
              class="cx-target-x"
              draggable="true"
              @dragstart="onCXDragStart(gate.control, i, $event)"
              @dblclick="
                emit('remove-gate', {
                  qubits: [gate.control, gate.target],
                  slot: i,
                })
              "
            >
              {{
                (() => {
                  switch (gate.type as any) {
                    case "CX":
                    case "CCX":
                      return "X";
                    case "CH":
                      return "H";
                    case "CZ":
                      return "Z";
                    default:
                      return "?";
                  }
                })()
              }}
            </div>
          </template>
          <div
            v-else-if="
              gate && !(typeof gate === 'object' && gate?.type === 'input')
            "
            class="gate-in-slot"
            draggable="true"
            @dragstart="onGateDragStart(q, i, gate, $event)"
            @dblclick="emit('remove-gate', { qubit: q, slot: i })"
          >
            {{ gate }}
          </div>
        </span>
        <!-- 目アイコンのトグルボタン -->
        <button
          class="eye-toggle-btn"
          @click="$emit('toggle-qubit-active', q)"
          :aria-label="
            props.activeQubits.includes(q) ? '非表示にする' : '表示する'
          "
        >
          <svg
            v-if="props.activeQubits.includes(q)"
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <ellipse
              cx="12"
              cy="12"
              rx="8"
              ry="5"
              fill="none"
              stroke="#1976d2"
              stroke-width="2"
            />
            <circle cx="12" cy="12" r="2" fill="#1976d2" />
          </svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24">
            <ellipse
              cx="12"
              cy="12"
              rx="8"
              ry="5"
              fill="none"
              stroke="#aaa"
              stroke-width="2"
            />
            <line
              x1="4"
              y1="20"
              x2="20"
              y2="4"
              stroke="#aaa"
              stroke-width="2"
            />
          </svg>
        </button>
        <div class="circuit-slot-line"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import KatexLabel from "./KatexLabel.vue";
import type {
  CXGate,
  CHGate,
  CZGate,
  CCXGate,
  GateCell,
  MultiQubitGate,
  InputGate,
} from "../pages/index.vue";
const props = defineProps<{
  circuitData: GateCell[][];
  pendingMultiQubitGate: MultiQubitGate | null;
  activeQubits: number[];
}>();
const emit = defineEmits([
  "place-gate",
  "remove-gate",
  "select-control-qubit",
  "toggle-qubit-active",
]);

function isMultiQubitGate(
  gate: any
): gate is CXGate | CHGate | CZGate | CCXGate {
  return (
    typeof gate === "object" &&
    gate !== null &&
    (gate.type === "CX" ||
      gate.type === "CH" ||
      gate.type === "CZ" ||
      gate.type === "CCX")
  );
}

function onSlotClick(q: number, i: number) {
  if (
    props.pendingMultiQubitGate &&
    props.pendingMultiQubitGate.slot === i &&
    props.pendingMultiQubitGate.target !== q
  ) {
    emit("select-control-qubit", q);
  }
}

function cxLineStyle(control: number, target: number) {
  return {
    position: "absolute",
    left: "50%",
    top: control < target ? "10px" : "-36px",
    transform: "translateX(-50%)",
    pointerEvents: "none" as const,
    zIndex: 0,
  };
}

function onGateDragStart(
  q: number,
  i: number,
  gate: string | InputGate,
  event: DragEvent
) {
  event.dataTransfer!.effectAllowed = "move";
  if (typeof gate === "string") {
    event.dataTransfer!.setData("text/plain", gate);
  }
  event.dataTransfer!.setData(
    "application/x-qc-from",
    JSON.stringify({ fromQubit: q, fromSlot: i })
  );
}

function onCXDragStart(q: number, i: number, event: DragEvent) {
  event.dataTransfer!.effectAllowed = "move";
  // CCX対応
  const cell = props.circuitData[q][i];
  let gateType = "CX";
  if (typeof cell === "object" && cell !== null && "type" in cell) {
    gateType = cell.type;
  }
  event.dataTransfer!.setData(
    "application/json",
    JSON.stringify({ type: gateType })
  );
  event.dataTransfer!.setData(
    "application/x-qc-from",
    JSON.stringify({ fromQubit: q, fromSlot: i, isCX: true })
  );
}

function onDrop(q: number, i: number, event: DragEvent) {
  // 移動元情報があれば、元の位置のゲートを消す
  const from = event.dataTransfer!.getData("application/x-qc-from");
  if (from) {
    try {
      const { fromQubit, fromSlot, isCX } = JSON.parse(from);
      if (isCX) {
        emit("remove-gate", { qubit: fromQubit, slot: fromSlot });
        emit("remove-gate", { qubit: fromQubit + 1, slot: fromSlot });
      } else {
        emit("remove-gate", { qubit: fromQubit, slot: fromSlot });
      }
    } catch (e) {}
  }
  // 多量子ビットゲートDnD対応（CX,CH,CZ,CCX）
  const json = event.dataTransfer!.getData("application/json");
  if (json) {
    try {
      const data = JSON.parse(json);
      if (["CX", "CH", "CZ", "CCX"].includes(data.type)) {
        emit("place-gate", { qubit: q, slot: i, gate: data.type });
        return;
      }
    } catch (e) {}
  }
  // 通常ゲート
  const gate = event.dataTransfer!.getData("text/plain");
  emit("place-gate", { qubit: q, slot: i, gate });
}
</script>

<style scoped>
.circuit-area {
  width: 97%;
  border: 1px solid #515050;
  padding-left: 16px;
  margin-bottom: 24px;
}
.qubit-row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
.qubit-label {
  width: 60px;
  font-weight: bold;
  margin-right: 8px;
}
.circuit-line {
  display: flex;
  align-items: center;
  position: relative;
  flex: 1;
  min-width: 400px;
}
.circuit-slot {
  display: inline-block;
  z-index: 1;
  width: 36px;
  height: 36px;
  margin: 0 8px;
  background: #eee;
  border-radius: 6px;
  border: 2px solid #ccc;
  display: flex;
  position: relative;
  justify-content: center;
  align-items: center;
}
.circuit-slot-line {
  position: absolute;
  width: 80%;
  height: 2px;
  background: #ccc;
  margin: 0 8px;
  z-index: 0;
}
.has-gate {
  background: #b3e5fc;
  border: 2px solid #0288d1;
}
.gate-in-slot {
  font-weight: bold;
  color: #1976d2;
  font-size: 1.1rem;
}
.gate-in-slot:hover {
  cursor: grab;
}
.gate-in-slot:active {
  cursor: grabbing;
}
.cx-control {
  width: 10px;
  height: 10px;
  background: #202020;
  border-radius: 50%;
  margin: 0 auto;
  margin-bottom: 2px;
  border: 2px solid #202021;
  position: relative;
  z-index: 1;
}
.cx-target-x {
  width: 18px;
  height: 18px;
  color: #1976d2;
  font-weight: bold;
  font-size: 1.1rem;
  /* background: #6bb6ff; */
  border-radius: 50%;
  margin: 0 auto;
  /* border: 2px solid #1976d2; */
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}
.pending-multiqubit-message {
  color: #1976d2;
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 1.1rem;
}
.control-candidate {
  outline: 2px dashed #1976d2;
  outline-offset: -2px;
  cursor: pointer;
}
.control-candidate:hover {
  background: #b3e5fc;
}

.multi-qubit-gate-message {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}
.ccx-control-selected {
  background: #ffe082 !important;
  border: 2px solid #ffb300 !important;
}
.eye-toggle-btn {
  background: #eee;
  border: 1px solid #eee;
  border-radius: 50%;
  margin-left: 30px;
  cursor: pointer;
  padding: 0;
  vertical-align: middle;
  z-index: 1;
}
.eye-toggle-btn:hover {
  border: 1px solid #1976d2;
}
.eye-toggle-btn:active {
  transform: scale(0.98);
}
.eye-toggle-btn svg {
  display: inline-block;
  vertical-align: middle;
}
.input-bit {
  background: #baffc8 !important;
  border: 2px solid #2bdb57 !important;
}
</style>
