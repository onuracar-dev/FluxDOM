import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hashFilename } from './hash.js';

describe('hashFilename (FNV-1a 32-bit)', () => {
  it('returns deterministic 8-character hex hash for a given filename', () => {
    const hash1 = hashFilename('App.flow');
    const hash2 = hashFilename('App.flow');
    const hash3 = hashFilename('Other.flow');

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{8}$/);
    expect(hash1).not.toBe(hash3);
  });

  it('ensures packages/compiler/src has no Node-only imports in production code', () => {
    const srcDir = join(process.cwd(), 'packages/compiler/src');
    const nodeOnlyPattern = /from\s+['"](crypto|fs|path|node:.*)['"]/;

    function findTsFiles(dir: string): string[] {
      const entries = readdirSync(dir);
      const files: string[] = [];
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        if (statSync(fullPath).isDirectory()) {
          files.push(...findTsFiles(fullPath));
        } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const sourceFiles = findTsFiles(srcDir);
    expect(sourceFiles.length).toBeGreaterThan(0);

    for (const file of sourceFiles) {
      const content = readFileSync(file, 'utf-8');
      const match = content.match(nodeOnlyPattern);
      expect(match, `File ${file} contains Node-only import: ${match?.[0]}`).toBeNull();
    }
  });
});
