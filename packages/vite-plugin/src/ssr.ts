import { analyze, parse } from '@fluxdom/compiler';
import { renderStaticComponent } from '@fluxdom/server';

export interface StaticRenderResult {
  html: string;
  rendered: boolean;
  reason?: string;
}

/**
 * Safely renders the static `.flow` subset without evaluating source code.
 * Dynamic components receive a client-rendering mount point.
 */
export function renderToString(source: string, filename = 'ssr.flow'): StaticRenderResult {
  const component = parse(source, filename);
  const analysis = analyze(component);
  if (analysis.strategy !== 'SSG') {
    return {
      html: '<div id="app" data-flow-client-render></div>',
      rendered: false,
      reason: `The ${analysis.strategy} strategy requires client rendering`,
    };
  }

  try {
    return { html: renderStaticComponent(component), rendered: true };
  } catch (error) {
    return {
      html: '<div id="app" data-flow-client-render></div>',
      rendered: false,
      reason: error instanceof Error ? error.message : 'Static rendering failed',
    };
  }
}
