// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  app: {
    head: {
      title: "量子回路シミュレータ",
      meta: [
        { name: "description", content: "量子回路シミュレータ" },
      ],
    },
  },
})
