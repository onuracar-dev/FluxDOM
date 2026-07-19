import { describe, expect, it } from 'vitest';
import { compileSource, FlowParseError, parse } from './index.js';

describe('Flow parser', () => {
  it('parses nested directives, quoted > characters, and boolean attributes', () => {
    const component = parse(`<template>
      <section data-label="a > b" hidden>
        {#if ready}
          {#each items as item, index}<p>{index}: {item}</p>{/each}
        {/if}
      </section>
    </template>`, 'nested.flow');

    const section = component.template?.children[0];
    expect(section?.type).toBe('Element');
    if (section?.type !== 'Element') throw new Error('Expected an element');
    expect(section.attributes).toEqual({ 'data-label': 'a > b', hidden: '' });
    expect(section.children[0].type).toBe('IfBlock');
  });

  it('reports mismatched markup with the filename', () => {
    expect(() => parse('<template><div></span></template>', 'broken.flow'))
      .toThrowError(new FlowParseError('Unexpected closing tag </span>', 'broken.flow'));
  });

  it('reports an unclosed top-level block instead of silently dropping it', () => {
    expect(() => parse('<template><p>broken</p>', 'unclosed.flow')).toThrow('Unclosed <template> block');
  });
});

describe('Flow compiler', () => {
  it('generates reactive bindings, each blocks, escaped text, and scope markers', () => {
    const result = compileSource(`<script>let items = ['one']; let active = true;</script>
      <template><ul :class="active ? 'on' : 'off'">{#each items as item}<li>{item}</li>{/each}<li>\`safe\`</li></ul></template>
      <style scoped>ul:hover, li { color: rebeccapurple; }</style>`, 'fixture.flow');

    expect(result.js).toContain('clearChildren');
    expect(result.js).toContain("__active() ? 'on' : 'off'");
    expect(result.js).toContain('data-fluxdom');
    expect(result.js).toContain('createText("`safe`")');
    expect(result.css).toMatch(/ul\[data-fluxdom="[a-f0-9]{8}"\]:hover/);
  });

  it('leaves unscoped CSS unchanged', () => {
    const result = compileSource('<template><p>Hello</p></template><style>p { color: red; }</style>', 'plain.flow');
    expect(result.css).toBe('p { color: red; }');
  });

  it('does not rewrite signal names inside string literals or property access', () => {
    const result = compileSource(
      `<script>let status = 'ready';</script><template><p>{status === 'status' ? model.status : status}</p></template>`,
      'strings.flow',
    );
    expect(result.js).toContain("__status() === 'status' ? model.status : __status()");
  });
});
