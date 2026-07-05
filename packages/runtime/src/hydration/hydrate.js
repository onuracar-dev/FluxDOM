import { insert } from '../dom/operations';
export function hydrate(root, componentRenderFn) {
    // Full hydration:
    // 1. We assume the server sent HTML that matches the initial state
    // 2. We attach event listeners to existing DOM nodes instead of creating new ones
    // Note: True hydration is complex (walking DOM, matching nodes).
    // For the prototype, we do a destructive hydration (React 15 style) 
    // or a naive attach if we assume the DOM structure matches perfectly.
    // Destructive hydration (wipe and re-render) for prototype:
    root.innerHTML = '';
    const elements = componentRenderFn();
    if (Array.isArray(elements)) {
        elements.forEach(el => insert(root, el));
    }
    else {
        insert(root, elements);
    }
}
//# sourceMappingURL=hydrate.js.map