import { onUnmounted, ref, watch, type Ref } from 'vue'

/**
 * Faz o ícone girar enquanto `loading` é verdadeiro, mas só PARA ao fim de uma
 * volta completa. Sem isso, se o loading termina no meio da volta, a classe
 * de animação sai e o ícone volta de uma vez para a posição parada.
 *
 * Uso: aplique `animate-spin` quando `spinning` for true e ligue
 * `@animationiteration="onIteration"` no mesmo elemento.
 *
 * `cycleMs` deve ser a duração de uma volta (o animate-spin do Tailwind usa 1000).
 */
export function useFullSpin(loading: Ref<boolean>, cycleMs = 1000) {
  const spinning = ref(false)
  let fallback: ReturnType<typeof setTimeout> | undefined

  watch(
    loading,
    (on) => {
      clearTimeout(fallback)
      if (on) {
        spinning.value = true
      } else if (spinning.value) {
        // Rede de segurança: se o navegador não emitir animationiteration
        // (aba em segundo plano, elemento oculto), para um pouco depois da volta.
        fallback = setTimeout(() => (spinning.value = false), cycleMs + 200)
      }
    },
    { immediate: true },
  )

  // Disparado ao fim de cada volta: se o loading já acabou, para exatamente em 360°.
  function onIteration() {
    if (!loading.value) spinning.value = false
  }

  onUnmounted(() => clearTimeout(fallback))

  return { spinning, onIteration }
}