import { activeEffect, batchedEffects, batchDepth } from './context.js';

// We need to export a way for effects to subscribe to signals
// And for signals to track which effects are subscribed

export function createSignal<T>(initialValue: T): [() => T, (newValue: T) => void] {
  let value = initialValue;
  const subscribers = new Set<() => void>();
  
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (!win.__FluxDOM_SIGNALS__) win.__FluxDOM_SIGNALS__ = [];
    win.__FluxDOM_SIGNALS__.push({ get: () => value });
    
    window.dispatchEvent(new CustomEvent('__FluxDOM_SIGNAL_CREATED__'));
  }

  const get = () => {
    if (activeEffect) {
      subscribers.add(activeEffect);
      // Let the effect know it subscribed to this signal
      if ((activeEffect as any).dependencies) {
        (activeEffect as any).dependencies.add(subscribers);
      }
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
