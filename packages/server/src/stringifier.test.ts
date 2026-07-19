import { describe, expect, it } from 'vitest';
import { parse } from '@fluxdom/compiler';
import { renderStaticComponent, renderToString } from './stringifier.js';

describe('server rendering', () => {
  it('escapes static text and attributes', () => {
    const component = parse('<template><p title="&quot;">Hello & goodbye</p></template>');
    expect(renderStaticComponent(component)).toBe('<div id="app"><p title="&amp;quot;">Hello &amp; goodbye</p></div>');
  });

  it('uses explicit operations without mutating globals', () => {
    const html = renderToString((operations) => {
      const element = operations.createElement('strong');
      operations.insert(element, operations.createText('<safe>'));
      return element;
    });
    expect(html).toBe('<div id="app"><strong>&lt;safe&gt;</strong></div>');
  });

  it('rejects dynamic source instead of evaluating it', () => {
    const component = parse('<template><p>{process.exit()}</p></template>');
    expect(() => renderStaticComponent(component)).toThrow('cannot evaluate Expression');
  });

  it('rejects event handlers instead of silently dropping behavior', () => {
    const component = parse('<template><button @click="save">Save</button></template>');
    expect(() => renderStaticComponent(component)).toThrow('cannot preserve bindings or events');
  });
});
