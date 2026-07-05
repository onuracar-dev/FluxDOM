declare class MockNode {
    type: 'element' | 'text';
    tag?: string;
    content?: string;
    attributes: Record<string, string>;
    children: MockNode[];
    constructor(type: 'element' | 'text', tagOrContent: string);
    toString(): string;
}
export declare function createMockDOMContext(): {
    root: MockNode;
    mockOperations: {
        createElement(tag: string): MockNode;
        createText(text: string): MockNode;
        insert(parent: MockNode, child: MockNode): void;
        setAttribute(el: MockNode, name: string, value: string): void;
        setText(el: MockNode, value: string): void;
        remove(parent: MockNode, child: MockNode): void;
        addEventListener(): void;
    };
};
export declare function renderToString(renderFn: (ops: any) => any): string;
export {};
//# sourceMappingURL=stringifier.d.ts.map