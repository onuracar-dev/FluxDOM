import { setActiveEffect, activeEffect } from './context.js';

export function createEffect(fn: () => void | (() => void)): () => void {
  let cleanup: (() => void) | void;
  let active = true;
  let running = false;

  const effectFn = () => {
    if (!active || running) return;
    running = true;
    // 1. Run user cleanup
    if (cleanup) {
      const previousCleanup = cleanup;
      cleanup = undefined;
      previousCleanup();
    }
    
    // 2. Clear old signal subscriptions to prevent memory leaks
    if ((effectFn as any).dependencies) {
      for (const subscribers of (effectFn as any).dependencies) {
        subscribers.delete(effectFn);
      }
      (effectFn as any).dependencies.clear();
    }
    
    const previousEffect = activeEffect;
    setActiveEffect(effectFn);
    try {
      const result = fn();
      cleanup = typeof result === 'function' ? result : undefined;
    } finally {
      setActiveEffect(previousEffect);
      running = false;
    }
  };

  // Attach a set to track signal subscriptions
  (effectFn as any).dependencies = new Set<Set<() => void>>();

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
    if ((effectFn as any).dependencies) {
      for (const subscribers of (effectFn as any).dependencies) {
        subscribers.delete(effectFn);
      }
      (effectFn as any).dependencies.clear();
    }
  };
}
