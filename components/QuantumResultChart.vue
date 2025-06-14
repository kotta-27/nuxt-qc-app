<template>
  <div class="chart-container">
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
  probabilityMap: { [bitstring: string]: number };
}>();

const chartData = computed(() => {
  const labels = Object.keys(props.probabilityMap).sort();
  const data = labels.map((k) => props.probabilityMap[k]);
  return {
    labels,
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
    title: {
      display: true,
      text: "確率分布",
      color: "#000",
    },
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
  height: 80%;
  background: rgba(255, 255, 255, 0.2);
}
</style>
