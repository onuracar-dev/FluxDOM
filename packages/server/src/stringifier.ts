class MockNode {
  type: 'element' | 'text';
  tag?: string;
  content?: string;
  attributes: Record<string, string> = {};
  children: MockNode[] = [];

  constructor(type: 'element' | 'text', tagOrContent: string) {
    this.type = type;
    if (type === 'element') this.tag = tagOrContent;
    else this.content = tagOrContent;
  }

  toString(): string {
    if (this.type === 'text') {
      return this.content || '';
    }
    
    let attrStr = Object.entries(this.attributes)
      .map(([k, v]) => ` ${k}="${v.replace(/"/g, '&quot;')}"`)
      .join('');
      
    const childrenStr = this.children.map(c => c.toString()).join('');
    
    // Self closing tags
    if (['img', 'input', 'br', 'hr', 'meta'].includes(this.tag!)) {
      return `<${this.tag}${attrStr} />`;
    }

    return `<${this.tag}${attrStr}>${childrenStr}</${this.tag}>`;
  }
}

export function createMockDOMContext() {
  const root = new MockNode('element', 'div');
  root.attributes['id'] = 'app';
  
  // These functions mimic packages/runtime/src/dom/operations.ts
  const mockOperations = {
    createElement(tag: string) {
      return new MockNode('element', tag);
    },
    createText(text: string) {
      return new MockNode('text', text);
    },
    insert(parent: MockNode, child: MockNode) {
      if (parent) parent.children.push(child);
    },
    setAttribute(el: MockNode, name: string, value: string) {
      if (el && el.type === 'element') el.attributes[name] = value;
    },
    setText(el: MockNode, value: string) {
      if (el && el.type === 'text') el.content = value;
    },
    remove(parent: MockNode, child: MockNode) {
      if (parent) {
        parent.children = parent.children.filter(c => c !== child);
      }
    },
    addEventListener() {
      // Ignored in SSR
    }
  };

  return { root, mockOperations };
}

export function renderToString(renderFn: (ops: any) => any): string {
  const { root, mockOperations } = createMockDOMContext();
  
  // Normally the compiled component requires the runtime operations.
  // To do true SSR, we would inject our mockOperations globally 
  // or pass them to the renderFn.
  
  // For this framework prototype, we will execute the renderFn 
  // assuming it uses our globally injected operations.
  const globalAny = global as any;
  const original = {
    createElement: globalAny.createElement,
    createText: globalAny.createText,
    insert: globalAny.insert,
    setAttribute: globalAny.setAttribute,
    setText: globalAny.setText,
    remove: globalAny.remove,
    addEventListener: globalAny.addEventListener,
  };

  Object.assign(globalAny, mockOperations);

  try {
    const elements = renderFn(mockOperations);
    if (Array.isArray(elements)) {
      elements.forEach(el => mockOperations.insert(root, el));
    } else if (elements) {
      mockOperations.insert(root, elements);
    }
  } catch (err) {
    console.error('SSR Render Error:', err);
  } finally {
    Object.assign(globalAny, original);
  }

  return root.toString();
}
