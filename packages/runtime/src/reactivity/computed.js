import { createSignal } from './signal';
import { createEffect } from './effect';
export function createComputed(fn) {
    // We use a signal to store the computed value
    // This allows the computed itself to be tracked by other effects
    const [get, set] = createSignal(undefined);
    createEffect(() => {
        // Whenever dependencies of fn change, this effect will re-run
        set(fn());
    });
    return () => get();
}
//# sourceMappingURL=computed.js.map