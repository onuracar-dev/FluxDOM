import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { build as viteBuild } from 'vite';
import { compileSource } from '@fluxdom/compiler';
import { create } from './create.js';

const created: string[] = [];

afterEach(() => {
  for (const directory of created.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('flow create', () => {
  it('creates a compilable starter without installing dependencies', () => {
    const name = `fluxdom-cli-${process.pid}-${Date.now()}`;
    const root = create([name], { cwd: tmpdir(), log: () => undefined });
    created.push(root);

    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const component = readFileSync(join(root, 'src', 'App.flow'), 'utf8');
    const output = compileSource(component, join(root, 'src', 'App.flow'));

    expect(packageJson.scripts.build).toBe('vite build');
    expect(output.js).toContain('export function render()');
    expect(output.css).toContain('[data-fluxdom=');
  });

  it('does not overwrite a non-empty directory', () => {
    const name = `fluxdom-cli-${process.pid}-${Date.now()}`;
    const root = create([name], { cwd: tmpdir(), log: () => undefined });
    created.push(root);
    expect(() => create([name], { cwd: tmpdir(), log: () => undefined })).toThrow('Refusing to overwrite');
  });

  it('builds a generated starter through the real Vite plugin', async () => {
    const name = `.fluxdom-cli-test-${process.pid}-${Date.now()}`;
    const root = create([name], { cwd: process.cwd(), log: () => undefined });
    created.push(root);

    const result = await viteBuild({ root, logLevel: 'silent' });
    expect(result).toBeTruthy();
  });
});
