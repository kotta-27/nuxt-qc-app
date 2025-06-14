<template>
  <div class="histogram-container">
    <Bar :data="chartData" :options="chartOptions" />
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
  // ビット列を昇順でソート
  const labels = Object.keys(props.histogram).sort();
  const data = labels.map((k) => props.histogram[k]);
  return {
    labels,
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
    title: {
      display: true,
      text: `Sampling Result Histogram (${props.shots} shots)`,
    },
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
}
</style>
