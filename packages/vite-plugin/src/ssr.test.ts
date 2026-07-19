import { describe, expect, it } from 'vitest';
import { renderToString } from './ssr.js';

describe('safe static SSR helper', () => {
  it('renders the static subset', () => {
    expect(renderToString('<template><h1>FluxDOM</h1></template>')).toEqual({
      html: '<div id="app"><h1>FluxDOM</h1></div>',
      rendered: true,
    });
  });

  it('returns a client mount point for dynamic components', () => {
    const result = renderToString('<script>let count = 0;</script><template>{count}</template>');
    expect(result.rendered).toBe(false);
    expect(result.html).toContain('data-flow-client-render');
  });

  it('does not call an eventful template static', () => {
    const result = renderToString('<template><button @click="save">Save</button></template>');
    expect(result.rendered).toBe(false);
    expect(result.reason).toContain('CSR');
  });
});
