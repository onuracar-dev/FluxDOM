import { describe, it, expect, vi } from 'vitest';
import { createSignal, createEffect, createComputed, batch } from '../src/reactivity';

describe('Reactivity', () => {
  it('should update signal value', () => {
    const [count, setCount] = createSignal(0);
    expect(count()).toBe(0);
    setCount(1);
    expect(count()).toBe(1);
  });

  it('should trigger effect when signal changes', () => {
    const [count, setCount] = createSignal(0);
    const mockFn = vi.fn(() => {
      count();
    });

    createEffect(mockFn);
    expect(mockFn).toHaveBeenCalledTimes(1);

    setCount(1);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should compute derived values', () => {
    const [count, setCount] = createSignal(1);
    const doubled = createComputed(() => count() * 2);

    expect(doubled()).toBe(2);

    setCount(2);
    expect(doubled()).toBe(4);
  });

  it('should batch updates', () => {
    const [count, setCount] = createSignal(0);
    const mockFn = vi.fn(() => {
      count();
    });

    createEffect(mockFn);
    expect(mockFn).toHaveBeenCalledTimes(1);

    batch(() => {
      setCount(1);
      setCount(2);
      setCount(3);
    });

    // Should only be called once more despite 3 updates
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(count()).toBe(3);
  });

  it('removes dependencies that are no longer read', () => {
    const [primary, setPrimary] = createSignal(true);
    const [left, setLeft] = createSignal('left');
    const [right, setRight] = createSignal('right');
    const values: string[] = [];
    createEffect(() => values.push(primary() ? left() : right()));

    setPrimary(false);
    setLeft('ignored');
    setRight('used');
    expect(values).toEqual(['left', 'right', 'used']);
  });

  it('runs cleanup once when an effect is stopped', () => {
    const [count, setCount] = createSignal(0);
    const events: string[] = [];
    const stop = createEffect(() => {
      const value = count();
      events.push(`run:${value}`);
      return () => events.push(`cleanup:${value}`);
    });

    setCount(1);
    stop();
    stop();
    setCount(2);
    expect(events).toEqual(['run:0', 'cleanup:0', 'run:1', 'cleanup:1']);
  });

  it('uses Object.is equality and flushes nested batches once', () => {
    const [value, setValue] = createSignal(Number.NaN);
    const effect = vi.fn(value);
    createEffect(effect);
    setValue(Number.NaN);
    batch(() => {
      setValue(1);
      batch(() => setValue(2));
    });
    expect(effect).toHaveBeenCalledTimes(2);
    expect(effect).toHaveLastReturnedWith(2);
  });

  it('does not leak signals to globalThis.__FluxDOM_SIGNALS__ when devtools hook is not registered', () => {
    delete (globalThis as any).__FluxDOM_SIGNALS__;
    delete (globalThis as any).__FLUXDOM_DEVTOOLS_HOOK__;

    for (let i = 0; i < 1000; i++) {
      createSignal(i);
    }

    expect((globalThis as any).__FluxDOM_SIGNALS__).toBeUndefined();
  });

  it('calls hook.onSignalCreated once per signal when devtools hook is defined', () => {
    const onSignalCreated = vi.fn();
    (globalThis as any).__FLUXDOM_DEVTOOLS_HOOK__ = { onSignalCreated };

    try {
      const [getA] = createSignal(10);
      const [getB] = createSignal('hello');

      expect(onSignalCreated).toHaveBeenCalledTimes(2);
      expect(onSignalCreated.mock.calls[0][0].get()).toBe(10);
      expect(onSignalCreated.mock.calls[1][0].get()).toBe('hello');
    } finally {
      delete (globalThis as any).__FLUXDOM_DEVTOOLS_HOOK__;
    }
  });

  it('allows an effect to update its own read signal until condition is satisfied', () => {
    const [a, setA] = createSignal(0);
    createEffect(() => {
      if (a() < 3) {
        setA(a() + 1);
      }
    });
    expect(a()).toBe(3);
  });

  it('throws an error when an effect unconditionally re-triggers itself more than 100 times', () => {
    const [a, setA] = createSignal(0);
    expect(() => {
      createEffect(() => {
        setA(a() + 1);
      });
    }).toThrow('FluxDOM: effect re-triggered itself more than 100 times');
  });

  it('avoids diamond dependency glitches in computed signals', () => {
    const [a, setA] = createSignal(1);
    const b = createComputed(() => a() * 2);
    const c = createComputed(() => a() * 3);
    const d = createComputed(() => b() + c());
    const seen: number[] = [];
    createEffect(() => {
      seen.push(d());
    });
    setA(2);
    expect(seen).toEqual([5, 10]); // bugünkü kodda [5, 8, 10] çıkıyor
  });
});
