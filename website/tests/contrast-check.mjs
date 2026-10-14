import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stylesPath = resolve(__dirname, '../src/styles.css');

function parseHex(hex) {
  let clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(fgHex, bgHex) {
  const l1 = relativeLuminance(parseHex(fgHex));
  const l2 = relativeLuminance(parseHex(bgHex));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function extractRootVars(filePath) {
  const css = await readFile(filePath, 'utf8');
  const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
  if (!rootMatch) {
    throw new Error('Could not find :root block in ' + filePath);
  }
  const rootBlock = rootMatch[1];
  const vars = new Map();
  const varRegex = /--([\w-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = varRegex.exec(rootBlock)) !== null) {
    vars.set(`--${match[1]}`, match[2].trim());
  }
  return vars;
}

async function runAudit() {
  const vars = await extractRootVars(stylesPath);

  const checks = [
    // --ink / --ink-2 / --ink-3 × --paper, --paper-2, --card
    ...['--ink', '--ink-2', '--ink-3'].flatMap((fg) =>
      ['--paper', '--paper-2', '--card'].map((bg) => ({
        fg,
        bg,
        minRatio: fg === '--ink-3' ? 3.0 : 4.5,
        type: fg === '--ink-3' ? 'helper text' : 'body text',
      })),
    ),
    // --signal / --effect / --dom × --card
    ...['--signal', '--effect', '--dom'].map((fg) => ({
      fg,
      bg: '--card',
      minRatio: 4.5,
      type: 'body text',
    })),
    // --on-night / --on-night-2 / --on-night-3 × --night, --night-2
    ...['--on-night', '--on-night-2', '--on-night-3'].flatMap((fg) =>
      ['--night', '--night-2'].map((bg) => ({
        fg,
        bg,
        minRatio: fg === '--on-night-3' ? 3.0 : 4.5,
        type: fg === '--on-night-3' ? 'helper text' : 'body text',
      })),
    ),
    // --signal-n / --effect-n / --dom-n × --night
    ...['--signal-n', '--effect-n', '--dom-n'].map((fg) => ({
      fg,
      bg: '--night',
      minRatio: 4.5,
      type: 'body text',
    })),
  ];

  console.log('=== FLUXDOM WCAG CONTRAST AUDIT (src/styles.css :root) ===\n');

  let passedCount = 0;
  const failures = [];

  for (const check of checks) {
    const fgVal = vars.get(check.fg);
    const bgVal = vars.get(check.bg);

    if (!fgVal || !bgVal) {
      throw new Error(`Missing variable definition: ${check.fg}=${fgVal}, ${check.bg}=${bgVal}`);
    }

    const ratio = contrastRatio(fgVal, bgVal);
    const pass = ratio >= check.minRatio;

    if (pass) {
      passedCount += 1;
      console.log(
        `[PASS] ${check.fg.padEnd(14)} on ${check.bg.padEnd(12)} | Ratio: ${ratio.toFixed(2).padStart(5)}:1 (Min ${check.minRatio.toFixed(1)}:1, ${check.type})`,
      );
    } else {
      failures.push({ ...check, ratio, fgVal, bgVal });
      console.error(
        `[FAIL] ${check.fg.padEnd(14)} on ${check.bg.padEnd(12)} | Ratio: ${ratio.toFixed(2).padStart(5)}:1 (Expected min ${check.minRatio.toFixed(1)}:1, ${check.type}) [fg: ${fgVal}, bg: ${bgVal}]`,
      );
    }
  }

  console.log(`\nAudit completed: ${passedCount}/${checks.length} passed.`);
  if (failures.length > 0) {
    console.error(`\nReported ${failures.length} contrast failure(s):`);
    for (const f of failures) {
      console.error(`  - ${f.fg} on ${f.bg}: ${f.ratio.toFixed(2)}:1 < ${f.minRatio}:1`);
    }
    process.exit(1);
  }
}

runAudit().catch((error) => {
  console.error(error);
  process.exit(1);
});
