import { setActiveEffect, activeEffect } from './context';

export function createEffect(fn: () => void | (() => void)): () => void {
  let cleanup: (() => void) | void;

  const effectFn = () => {
    // 1. Run user cleanup
    if (cleanup) {
      cleanup();
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
      cleanup = fn();
    } finally {
      setActiveEffect(previousEffect);
    }
  };

  // Attach a set to track signal subscriptions
  (effectFn as any).dependencies = new Set<Set<() => void>>();

  // Run immediately to track dependencies
  effectFn();

  // Return a way to completely destroy the effect
  return () => {
    if (cleanup) cleanup();
    if ((effectFn as any).dependencies) {
      for (const subscribers of (effectFn as any).dependencies) {
        subscribers.delete(effectFn);
      }
      (effectFn as any).dependencies.clear();
    }
  };
}
