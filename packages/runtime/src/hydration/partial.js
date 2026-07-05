export function hydratePartial(islandId, componentRenderFn) {
    const root = document.querySelector(`[data-flow-island="${islandId}"]`);
    if (!root)
        return;
    // Hydrate only this specific island
    // For prototype, destructive hydration of the island
    root.innerHTML = '';
    const elements = componentRenderFn();
    if (Array.isArray(elements)) {
        elements.forEach((el) => root.appendChild(el));
    }
    else {
        root.appendChild(elements);
    }
}
//# sourceMappingURL=partial.js.map