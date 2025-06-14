<template>
  <div class="gate-palette">
    <div class="gate-palette-title">量子ゲート</div>
    <div class="gate-palette-content">
      <button
        v-for="gate in gates"
        :key="gate"
        class="gate-btn"
        draggable="true"
        @dragstart="onDragStart(gate, $event)"
      >
        {{ gate }}
      </button>
    </div>
  </div>
</template>

<script setup>
const gates = ["X", "H", "Y", "Z", "CX", "CH", "CZ", "CCX"];

function onDragStart(gate, event) {
  event.dataTransfer.effectAllowed = "copy";
  if (["CX", "CH", "CZ", "CCX"].includes(gate)) {
    event.dataTransfer.setData(
      "application/json",
      JSON.stringify({ type: gate })
    );
  } else {
    event.dataTransfer.setData("text/plain", gate);
  }
}
</script>

<style scoped>
.gate-palette {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px;
  margin: 16px 0;
  border: 1px solid #515050;
}
.gate-palette-title {
  font-size: 1rem;
  font-weight: bold;
  margin-bottom: 5px;
}
.gate-palette-content {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.gate-btn {
  width: 40px;
  height: 40px;
  font-size: 0.9rem;
  border: 1px solid #515050;
  background: #f5f5f5;
  cursor: grab;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.gate-btn:active {
  cursor: grabbing;
}
.gate-btn:hover {
  background: #e0e0e0;
}
.cx-drag-ghost {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 36px;
}
.cx-dot {
  width: 16px;
  height: 16px;
  background: #6bb6ff;
  border-radius: 50%;
  border: 2px solid #1976d2;
  margin-bottom: 2px;
}
.cx-plus {
  width: 16px;
  height: 16px;
  background: #6bb6ff;
  border-radius: 50%;
  border: 2px solid #1976d2;
  color: #fff;
  font-size: 1rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
