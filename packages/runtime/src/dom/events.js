// Global event delegation
const eventRegistry = new Map();
export function addEventListener(el, eventName, handler) {
    // Simple event binding for now
    // A complete implementation would use global event delegation
    el.addEventListener(eventName, handler);
}
export function removeEventListener(el, eventName, handler) {
    el.removeEventListener(eventName, handler);
}
//# sourceMappingURL=events.js.map