<template>
  <span v-html="rendered"></span>
</template>

<script setup lang="ts">
import katex from "katex";
import { computed } from "vue";
const props = defineProps<{ expr: string }>();
const rendered = computed(() => {
  try {
    return katex.renderToString(props.expr, {
      throwOnError: false,
    });
  } catch (e) {
    console.error(e);
    return props.expr;
  }
});
</script>

<style scoped>
span {
  font-size: 1.2rem;
  font-family: "KaTeX_Main", serif;
  color: #0a0a0a;
}
</style>
