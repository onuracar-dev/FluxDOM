export let activeEffect: (() => void) | null = null;
export let batchDepth = 0;
export let batchedEffects = new Set<() => void>();

export function setActiveEffect(effect: (() => void) | null) {
  activeEffect = effect;
}

export function batch(fn: () => void) {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      const effectsToRun = new Set(batchedEffects);
      batchedEffects.clear();
      effectsToRun.forEach(effect => effect());
    }
  }
}
