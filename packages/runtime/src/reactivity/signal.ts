import { activeEffect, batch, notifySubscriber, type ReactiveEffect } from './context.js';

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
      batch(() => {
        subscribers.forEach(sub => notifySubscriber(sub));
      });
    }
  };

  return [get, set];
}
