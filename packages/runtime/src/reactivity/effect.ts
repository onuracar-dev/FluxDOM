import { setActiveEffect, activeEffect, type ReactiveEffect } from './context.js';

export function createEffect(fn: () => void | (() => void)): () => void {
  let cleanup: (() => void) | void;
  let active = true;
  let running = false;
  let pending = false;
  let loopCount = 0;

  const effectFn: ReactiveEffect = (() => {
    if (!active) return;
    if (running) {
      pending = true;
      return;
    }
    running = true;
    loopCount = 0;

    try {
      while (true) {
        pending = false;
        loopCount++;
        if (loopCount > 100) {
          throw new Error('FluxDOM: effect re-triggered itself more than 100 times');
        }

        // 1. Run user cleanup
        if (cleanup) {
          const previousCleanup = cleanup;
          cleanup = undefined;
          previousCleanup();
        }

        // 2. Clear old signal subscriptions to prevent memory leaks
        for (const subscribers of effectFn.dependencies) {
          subscribers.delete(effectFn);
        }
        effectFn.dependencies.clear();

        const previousEffect = activeEffect;
        setActiveEffect(effectFn);
        try {
          const result = fn();
          cleanup = typeof result === 'function' ? result : undefined;
        } finally {
          setActiveEffect(previousEffect);
        }

        if (!pending || !active) break;
      }
    } finally {
      running = false;
      pending = false;
      loopCount = 0;
    }
  }) as ReactiveEffect;

  // Attach a set to track signal subscriptions
  effectFn.dependencies = new Set<Set<ReactiveEffect>>();

  // Run immediately to track dependencies
  effectFn();

  // Return a way to completely destroy the effect
  return () => {
    if (!active) return;
    active = false;
    if (cleanup) {
      const finalCleanup = cleanup;
      cleanup = undefined;
      finalCleanup();
    }
    for (const subscribers of effectFn.dependencies) {
      subscribers.delete(effectFn);
    }
    effectFn.dependencies.clear();
  };
}
