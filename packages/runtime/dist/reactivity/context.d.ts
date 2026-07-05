export declare let activeEffect: (() => void) | null;
export declare let batchDepth: number;
export declare let batchedEffects: Set<() => void>;
export declare function setActiveEffect(effect: (() => void) | null): void;
export declare function batch(fn: () => void): void;
//# sourceMappingURL=context.d.ts.map