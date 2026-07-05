import { describe, it, expect } from 'vitest';
import { createElement, createText, insert, remove, setAttribute, setText } from '../src/dom';
describe('DOM Operations', () => {
    it('should create elements and text nodes', () => {
        const el = createElement('div');
        expect(el.tagName).toBe('DIV');
        const text = createText('hello');
        expect(text.textContent).toBe('hello');
    });
    it('should insert and remove nodes', () => {
        const parent = createElement('div');
        const child = createElement('span');
        insert(parent, child);
        expect(parent.childNodes.length).toBe(1);
        expect(parent.firstChild).toBe(child);
        remove(child);
        expect(parent.childNodes.length).toBe(0);
    });
    it('should set attributes and text', () => {
        const el = createElement('div');
        setAttribute(el, 'id', 'test');
        expect(el.getAttribute('id')).toBe('test');
        const text = createText('hello');
        setText(text, 'world');
        expect(text.textContent).toBe('world');
    });
});
//# sourceMappingURL=dom.test.js.map