export function hydratePartial(islandId: string, componentRenderFn: () => any) {
  const root = document.querySelector(`[data-flow-island="${islandId}"]`) as HTMLElement;
  if (!root) return;

  // Hydrate only this specific island
  // For prototype, destructive hydration of the island
  root.innerHTML = '';
  const elements = componentRenderFn();
  
  if (Array.isArray(elements)) {
    elements.forEach((el: any) => root.appendChild(el));
  } else {
    root.appendChild(elements);
  }
}
