<template>
  <div class="chart-container">
    <div class="chart-header-container">
      <div class="chart-title">確率分布</div>
      <div
        class="chart-tooltip"
        @mouseover="showTooltip = true"
        @mouseleave="showTooltip = false"
      >
        <img src="/info-icon.svg" alt="info" class="chart-tooltip-icon" />
      </div>
      <div v-if="showTooltip" class="chart-tooltip-content">
        <div class="chart-tooltip-content-item">
          ビットは
          <KatexLabel :expr="`q_3 q_2 q_1 q_0`" fontSize="0.8rem" />
          の順で表記します。
        </div>
      </div>
    </div>
    <Bar
      :data="chartData"
      :options="chartOptions"
      style="width: 80%; max-width: 80%"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Bar } from "vue-chartjs";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const props = defineProps<{
  probabilityMap: { [bitstring: string]: number };
}>();

const showTooltip = ref(false);

const chartData = computed(() => {
  const labels = Object.keys(props.probabilityMap).map((s) =>
    s.split("").reverse().join("")
  );
  const sortedLabels = labels.sort((a, b) => parseInt(a, 2) - parseInt(b, 2));
  const data = sortedLabels.map(
    (k) => props.probabilityMap[k.split("").reverse().join("")]
  );
  return {
    labels: sortedLabels,
    datasets: [
      {
        label: "Probability",
        backgroundColor: "#42A5F5",
        data,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: {
      min: 0,
      max: 1,
    },
  },
};
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 90%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.chart-header-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  text-align: center;
  justify-content: space-between;
  position: relative;
}
.chart-title {
  font-size: 1rem;
  font-weight: bold;
}
.chart-tooltip {
  height: 24px;
  font-weight: bold;
  cursor: pointer;
}
.chart-tooltip-icon {
  color: #787878;
  filter: invert(1);
  margin-left: 10px;
}
.chart-tooltip:hover {
  color: #42a5f5;
}
.chart-tooltip-content {
  position: absolute;
  top: 0px;
  left: 100px;
  width: 230px;
  font-size: 0.8rem;
  background: #fff;
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.3);
}
</style>
