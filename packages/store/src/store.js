import { createSignal } from '@fluxdom/runtime';
import { persistState } from './persist';
export function store(config) {
    const storeInstance = {};
    // Try to load persisted state
    let initialState = config.state;
    if (config.persist) {
        const saved = persistState.load(config.name, config.persist);
        if (saved) {
            initialState = { ...initialState, ...saved };
        }
    }
    const stateSignals = {};
    // Setup signals for each state property
    for (const key in initialState) {
        const [get, set] = createSignal(initialState[key]);
        stateSignals[key] = [get, set];
        // Expose getter
        storeInstance[key] = get;
        // Expose setter
        const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
        storeInstance[`set${capitalizedKey}`] = (val) => {
            set(val);
            if (config.persist) {
                // Save to storage
                const currentState = Object.keys(stateSignals).reduce((acc, k) => {
                    acc[k] = stateSignals[k][0]();
                    return acc;
                }, {});
                persistState.save(config.name, currentState, config.persist);
            }
        };
    }
    // Bind actions
    if (config.actions) {
        // Create a context that has getters and setters
        const context = {};
        for (const key in initialState) {
            Object.defineProperty(context, key, {
                get: () => stateSignals[key][0](),
                set: (val) => storeInstance[`set${key.charAt(0).toUpperCase() + key.slice(1)}`](val),
            });
        }
        for (const actionName in config.actions) {
            storeInstance[actionName] = (...args) => {
                return config.actions[actionName].apply(context, args);
            };
        }
    }
    return storeInstance;
}
//# sourceMappingURL=store.js.map