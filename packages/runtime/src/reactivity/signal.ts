import { activeEffect, batchedEffects, batchDepth, type ReactiveEffect } from './context.js';

export function createSignal<T>(initialValue: T): [() => T, (newValue: T) => void] {
  let value = initialValue;
  const subscribers = new Set<ReactiveEffect>();

  const hook = (globalThis as any).__FLUXDOM_DEVTOOLS_HOOK__;
  if (hook) {
    hook.onSignalCreated({ get: () => value });
  }

  const get = () => {
    if (activeEffect) {
      subscribers.add(activeEffect);
      activeEffect.dependencies.add(subscribers);
    }
    return value;
  };

  const set = (newValue: T) => {
    if (!Object.is(value, newValue)) {
      value = newValue;
      if (batchDepth > 0) {
        subscribers.forEach(sub => batchedEffects.add(sub));
      } else {
        const effectsToRun = new Set(subscribers);
        effectsToRun.forEach(effect => effect());
      }
    }
  };

  return [get, set];
}
