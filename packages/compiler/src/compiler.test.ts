import { describe, expect, it } from 'vitest';
import { parse as babelParse } from '@babel/parser';
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

  it('transforms signal read inside if condition without breaking syntax', () => {
    const result = compileSource(`<script>let count = 0; if (count == 1) {}</script>`, 'test.flow');
    expect(result.js).toContain('if (__count() == 1)');
    expect(() => babelParse(result.js, { sourceType: 'module', plugins: ['typescript'] })).not.toThrow();
  });

  it('does not touch non-computed object property key matching signal name', () => {
    const result = compileSource(`<script>let count = 0; const o = { count: 1 };</script>`, 'test.flow');
    expect(result.js).toContain('{ count: 1 }');
    expect(result.js).not.toContain('__count():');
    expect(() => babelParse(result.js, { sourceType: 'module', plugins: ['typescript'] })).not.toThrow();
  });

  it('transforms object shorthand with signal name to explicit property access', () => {
    const result = compileSource(`<script>let count = 0; const o = { count };</script>`, 'test.flow');
    expect(result.js).toContain('{ count: __count() }');
    expect(() => babelParse(result.js, { sourceType: 'module', plugins: ['typescript'] })).not.toThrow();
  });

  it('does not touch signal names inside string literals', () => {
    const result = compileSource(`<script>let count = 0; console.log('count is');</script>`, 'test.flow');
    expect(result.js).toContain("'count is'");
    expect(result.js).not.toContain('__count() is');
    expect(() => babelParse(result.js, { sourceType: 'module', plugins: ['typescript'] })).not.toThrow();
  });

  it('does not rewrite comments mentioning signal name', () => {
    const result = compileSource(`<script>let count = 0; // count</script>`, 'test.flow');
    expect(result.js).toContain('// count');
    expect(() => babelParse(result.js, { sourceType: 'module', plugins: ['typescript'] })).not.toThrow();
  });

  it('does not treat for-loop let variable as signal', () => {
    const result = compileSource(`<script>for (let i = 0; i < 3; i++) {}</script>`, 'test.flow');
    expect(result.js).toContain('for (let i = 0; i < 3; i++)');
    expect(result.js).not.toContain('__i');
    expect(() => babelParse(result.js, { sourceType: 'module', plugins: ['typescript'] })).not.toThrow();
  });

  it('transforms decrement operators on signals', () => {
    const result = compileSource(`<script>let count = 0; count--;</script>`, 'test.flow');
    expect(result.js).toContain('__setCount(__count() - 1);');
    expect(() => babelParse(result.js, { sourceType: 'module', plugins: ['typescript'] })).not.toThrow();
  });

  it('transforms compound assignment operators on signals', () => {
    const result = compileSource(`<script>let count = 0; count += 2; count -= 1; count *= 3; count /= 4;</script>`, 'test.flow');
    expect(result.js).toContain('__setCount(__count() + 2);');
    expect(result.js).toContain('__setCount(__count() - 1);');
    expect(result.js).toContain('__setCount(__count() * 3);');
    expect(result.js).toContain('__setCount(__count() / 4);');
    expect(() => babelParse(result.js, { sourceType: 'module', plugins: ['typescript'] })).not.toThrow();
  });

  it('transforms signal declaration without semicolon', () => {
    const result = compileSource(`<script>let count = 0</script>`, 'test.flow');
    expect(result.js).toContain('const [__count, __setCount] = createSignal(0)');
    expect(() => babelParse(result.js, { sourceType: 'module', plugins: ['typescript'] })).not.toThrow();
  });

  it('transforms multiline signal declaration', () => {
    const result = compileSource(`<script>let items = [\n  'a',\n  'b'\n];</script>`, 'test.flow');
    expect(result.js).toContain("createSignal([\n  'a',\n  'b'\n])");
    expect(() => babelParse(result.js, { sourceType: 'module', plugins: ['typescript'] })).not.toThrow();
  });

  it('preserves shadowed signal name inside function parameters and scope', () => {
    const result = compileSource(`<script>let count = 0; function f(count) { return count; }</script>`, 'test.flow');
    expect(result.js).toContain('function f(count) { return count; }');
    expect(() => babelParse(result.js, { sourceType: 'module', plugins: ['typescript'] })).not.toThrow();
  });

  it('transforms multiple declarations in a single let statement', () => {
    const result = compileSource(`<script>let a = 1, b = 2;</script>`, 'test.flow');
    expect(result.js).toContain('const [__a, __setA] = createSignal(1)');
    expect(result.js).toContain('const [__b, __setB] = createSignal(2)');
    expect(() => babelParse(result.js, { sourceType: 'module', plugins: ['typescript'] })).not.toThrow();
  });

  it('handles typescript type annotation in let declaration', () => {
    const result = compileSource(`<script lang="ts">let count: number = 0;</script>`, 'test.flow');
    expect(result.js).toContain('const [__count, __setCount] = createSignal(0)');
    expect(() => babelParse(result.js, { sourceType: 'module', plugins: ['typescript'] })).not.toThrow();
  });

  it('throws FlowParseError on destructuring assignment to signal', () => {
    expect(() => compileSource(`<script>let count = 0; [count] = [1];</script>`, 'test.flow'))
      .toThrowError(new FlowParseError("Destructuring assignment to signal 'count' is not supported yet", 'test.flow'));
  });

  it('throws FlowParseError with line and column on syntax error in script', () => {
    expect(() => compileSource(`<script>let count = ;</script>`, 'broken.flow'))
      .toThrow(/broken\.flow:.*\(1:\d+\)/);
  });
});

