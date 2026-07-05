export function createElement(tag) {
    return document.createElement(tag);
}
export function createText(content) {
    return document.createTextNode(content);
}
export function insert(parent, child) {
    if (Array.isArray(child)) {
        child.forEach(c => parent.appendChild(c));
    }
    else {
        parent.appendChild(child);
    }
    if (typeof window !== 'undefined') {
        // Notify DevTools
        window.dispatchEvent(new CustomEvent('__FluxDOM_MOUNT__', {
            detail: { node: child, parent }
        }));
    }
}
export function remove(node) {
    const parent = node.parentNode;
    if (parent) {
        parent.removeChild(node);
    }
}
export function setAttribute(el, key, value) {
    if (value == null || value === false) {
        el.removeAttribute(key);
    }
    else {
        el.setAttribute(key, value === true ? '' : String(value));
    }
}
export function setProperty(el, key, value) {
    el[key] = value;
}
export function setText(node, value) {
    node.nodeValue = value;
}
//# sourceMappingURL=operations.js.map