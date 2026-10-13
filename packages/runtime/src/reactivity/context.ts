export interface ReactiveEffect {
  (): void;
  dependencies: Set<Set<ReactiveEffect>>;
}

export let activeEffect: ReactiveEffect | null = null;
export let batchDepth = 0;
export let batchedEffects = new Set<ReactiveEffect>();

export function setActiveEffect(effect: ReactiveEffect | null): void {
  activeEffect = effect;
}

export function batch(fn: () => void): void {
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
