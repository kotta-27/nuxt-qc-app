<template>
  <div class="gate-palette">
    <div class="gate-palette-header-container">
      <div class="gate-palette-title">量子ゲート</div>
      <div
        class="gate-palette-tooltip"
        @mouseover="showTooltip = true"
        @mouseleave="showTooltip = false"
      >
        <img
          src="/info-icon.svg"
          alt="info"
          class="gate-palette-tooltip-icon"
        />
      </div>
      <div v-if="showTooltip" class="gate-palette-tooltip-content">
        <div class="gate-palette-tooltip-content-item">
          量子ゲートをドラッグ&ドロップで追加できます。
          追加したゲートはダブルクリックで削除できます。
        </div>
      </div>
    </div>
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

const showTooltip = ref(false);
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
  border-radius: 6px;
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
  background: #8d8d8d;
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
.gate-palette-header-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  position: relative;
}
.gate-palette-tooltip {
  margin-left: 10px;
  cursor: pointer;
}
.gate-palette-tooltip-icon {
  width: 24px;
  height: 24px;
  color: #787878;
  filter: invert(1);
}
.gate-palette-tooltip-content {
  position: absolute;
  top: -10px;
  left: 130px;
  width: 300px;
  background: #fff;
  font-size: 0.8rem;
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.3);
}
</style>
