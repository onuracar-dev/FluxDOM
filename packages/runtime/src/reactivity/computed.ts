import { createSignal } from './signal';
import { createEffect } from './effect';

export function createComputed<T>(fn: () => T): () => T {
  // We use a signal to store the computed value
  // This allows the computed itself to be tracked by other effects
  const [get, set] = createSignal<T | undefined>(undefined);

  createEffect(() => {
    // Whenever dependencies of fn change, this effect will re-run
    set(fn());
  });

  return () => get() as T;
}
