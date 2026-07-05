export const persistState = {
    load(name, type) {
        try {
            const storage = type === 'local' ? localStorage : sessionStorage;
            const data = storage.getItem(`flow_store_${name}`);
            return data ? JSON.parse(data) : null;
        }
        catch (e) {
            console.warn(`Failed to load persisted state for ${name}`, e);
            return null;
        }
    },
    save(name, state, type) {
        try {
            const storage = type === 'local' ? localStorage : sessionStorage;
            storage.setItem(`flow_store_${name}`, JSON.stringify(state));
        }
        catch (e) {
            console.warn(`Failed to save persisted state for ${name}`, e);
        }
    }
};
//# sourceMappingURL=persist.js.map