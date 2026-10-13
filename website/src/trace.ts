let isTracking = false;
let didMutate = false;
let isInitial = true;

if (typeof window !== 'undefined') {
  const origSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name: string, value: string) {
    if (isTracking && this.getAttribute(name) !== String(value)) {
      didMutate = true;
    }
    return origSetAttribute.call(this, name, value);
  };

  const textDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'nodeValue');
  if (textDescriptor && textDescriptor.set) {
    const origSet = textDescriptor.set;
    Object.defineProperty(Node.prototype, 'nodeValue', {
      ...textDescriptor,
      set(val: string) {
        if (isTracking && this.nodeValue !== val) {
          didMutate = true;
        }
        return origSet.call(this, val);
      },
    });
  }
}

export function __trace(line: number, fn: () => void | (() => void)): () => void | (() => void) {
  return () => {
    if (isInitial) {
      return fn();
    }
    didMutate = false;
    isTracking = true;
    try {
      const result = fn();
      if (didMutate && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('flux-trace', { detail: line }));
      }
      return result;
    } finally {
      isTracking = false;
    }
  };
}

export function startTracing() {
  isInitial = false;
}
