import { setActiveEffect, activeEffect } from './context';
export function createEffect(fn) {
    let cleanup;
    const effectFn = () => {
        // 1. Run user cleanup
        if (cleanup) {
            cleanup();
        }
        // 2. Clear old signal subscriptions to prevent memory leaks
        if (effectFn.dependencies) {
            for (const subscribers of effectFn.dependencies) {
                subscribers.delete(effectFn);
            }
            effectFn.dependencies.clear();
        }
        const previousEffect = activeEffect;
        setActiveEffect(effectFn);
        try {
            cleanup = fn();
        }
        finally {
            setActiveEffect(previousEffect);
        }
    };
    // Attach a set to track signal subscriptions
    effectFn.dependencies = new Set();
    // Run immediately to track dependencies
    effectFn();
    // Return a way to completely destroy the effect
    return () => {
        if (cleanup)
            cleanup();
        if (effectFn.dependencies) {
            for (const subscribers of effectFn.dependencies) {
                subscribers.delete(effectFn);
            }
            effectFn.dependencies.clear();
        }
    };
}
//# sourceMappingURL=effect.js.map