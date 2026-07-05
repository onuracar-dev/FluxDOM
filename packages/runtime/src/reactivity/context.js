export let activeEffect = null;
export let batchDepth = 0;
export let batchedEffects = new Set();
export function setActiveEffect(effect) {
    activeEffect = effect;
}
export function batch(fn) {
    batchDepth++;
    try {
        fn();
    }
    finally {
        batchDepth--;
        if (batchDepth === 0) {
            const effectsToRun = new Set(batchedEffects);
            batchedEffects.clear();
            effectsToRun.forEach(effect => effect());
        }
    }
}
//# sourceMappingURL=context.js.map