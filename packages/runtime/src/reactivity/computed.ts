import { activeEffect, batch, notifySubscriber, setActiveEffect, type ReactiveEffect } from './context.js';

export function createComputed<T>(fn: () => T): () => T {
  let value: T | undefined;
  let dirty = true;
  const subscribers = new Set<ReactiveEffect>();

  const computedConsumer: ReactiveEffect = (() => {}) as ReactiveEffect;
  computedConsumer.dependencies = new Set<Set<ReactiveEffect>>();
  computedConsumer.markDirty = () => {
    if (!dirty) {
      dirty = true;
      batch(() => {
        subscribers.forEach(sub => notifySubscriber(sub));
      });
    }
  };

  return () => {
    if (activeEffect) {
      subscribers.add(activeEffect);
      activeEffect.dependencies.add(subscribers);
    }

    if (dirty) {
      for (const depSubscribers of computedConsumer.dependencies) {
        depSubscribers.delete(computedConsumer);
      }
      computedConsumer.dependencies.clear();

      const previousEffect = activeEffect;
      setActiveEffect(computedConsumer);
      try {
        value = fn();
        dirty = false;
      } finally {
        setActiveEffect(previousEffect);
      }
    }

    return value as T;
  };
}
