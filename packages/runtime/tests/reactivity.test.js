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
});
//# sourceMappingURL=reactivity.test.js.map