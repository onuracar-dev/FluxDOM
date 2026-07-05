export function createElement(tag: string): HTMLElement {
  return document.createElement(tag);
}

export function createText(content: string): Text {
  return document.createTextNode(content);
}

export function insert(parent: HTMLElement, child: HTMLElement | Text | (HTMLElement | Text)[]) {
  if (Array.isArray(child)) {
    child.forEach(c => parent.appendChild(c));
  } else {
    parent.appendChild(child);
  }
  
  if (typeof window !== 'undefined') {
    // Notify DevTools
    window.dispatchEvent(new CustomEvent('__FluxDOM_MOUNT__', {
      detail: { node: child, parent }
    }));
  }
}

export function remove(node: Node): void {
  const parent = node.parentNode;
  if (parent) {
    parent.removeChild(node);
  }
}

export function setAttribute(el: Element, key: string, value: any): void {
  if (value == null || value === false) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value === true ? '' : String(value));
  }
}

export function setProperty(el: any, key: string, value: any): void {
  el[key] = value;
}

export function setText(node: Text, value: string): void {
  node.nodeValue = value;
}
