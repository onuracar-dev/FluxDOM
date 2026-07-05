// Global event delegation
const eventRegistry = new Map<string, Set<Element>>();

export function addEventListener(el: Element, eventName: string, handler: EventListener): void {
  // Simple event binding for now
  // A complete implementation would use global event delegation
  el.addEventListener(eventName, handler);
}

export function removeEventListener(el: Element, eventName: string, handler: EventListener): void {
  el.removeEventListener(eventName, handler);
}
