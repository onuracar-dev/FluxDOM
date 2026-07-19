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
});
