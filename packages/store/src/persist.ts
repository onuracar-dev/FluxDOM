export const persistState = {
  load(name: string, type: 'local' | 'session'): any | null {
    try {
      const storage = type === 'local' ? localStorage : sessionStorage;
      const data = storage.getItem(`flow_store_${name}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn(`Failed to load persisted state for ${name}`, e);
      return null;
    }
  },

  save(name: string, state: any, type: 'local' | 'session'): void {
    try {
      const storage = type === 'local' ? localStorage : sessionStorage;
      storage.setItem(`flow_store_${name}`, JSON.stringify(state));
    } catch (e) {
      console.warn(`Failed to save persisted state for ${name}`, e);
    }
  }
};
