<template>
  <div class="histogram-container">
    <div class="histogram-header-container">
      <div class="histogram-title">サンプリング</div>
      <div class="histogram-tooltip">
        <img src="/info-icon.svg" alt="info" class="histogram-tooltip-icon" />
      </div>
    </div>
    <Bar
      :data="chartData"
      :options="chartOptions"
      style="width: 80%; max-width: 80%; height: 90%; max-height: 90%"
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
  histogram: { [bitstring: string]: number };
  shots: number;
}>();

const chartData = computed(() => {
  const labels = Object.keys(props.histogram).map((s) =>
    s.split("").reverse().join("")
  );
  const sortedLabels = labels.sort((a, b) => parseInt(a, 2) - parseInt(b, 2));
  const data = sortedLabels.map(
    (k) => props.histogram[k.split("").reverse().join("")]
  );
  return {
    labels: sortedLabels,
    datasets: [
      {
        label: "Counts",
        backgroundColor: "#66bb6a",
        data,
      },
    ],
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: {
      min: 0,
      max: props.shots,
      ticks: {
        stepSize: 100,
      },
    },
  },
}));
</script>

<style scoped>
.histogram-container {
  width: 100%;
  height: 80%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.histogram-header-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.histogram-title {
  font-size: 1rem;
  font-weight: bold;
}
.histogram-tooltip {
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
}
</style>
