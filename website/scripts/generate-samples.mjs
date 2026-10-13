import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codeToHtml } from 'shiki';
import { parse as babelParse } from '@babel/parser';
import MagicString from 'magic-string';
import { compileSource, parse, analyze } from '../../packages/compiler/dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(__dirname, '../src/generated');
const samplesJsonFile = resolve(outputDir, 'samples.json');
const counterDisplayFile = resolve(outputDir, 'counter.display.js');
const counterRunFile = resolve(outputDir, 'counter.run.js');

const addLineNumbers = {
  line(node, line) {
    node.properties['data-line'] = line;
  },
};

async function highlight(code, lang) {
  return codeToHtml(code.trim(), {
    lang,
    themes: {
      light: 'github-light',
      dark: 'github-dark-dimmed',
    },
    transformers: [addLineNumbers],
  });
}

// 1. Signature Hero Demo: Counter.flow
const counterFlowSource = `<script lang="ts">
  let count = 0;
</script>

<template>
  <button :class="count > 5 ? 'max' : ''" @click="() => count++">
    Count: {count}
  </button>
</template>`;

// 2. Full Architecture Flow: App.flow
const flowSource = `<script lang="ts">
  let items = ['compiler', 'signals'];
  let visible = true;
</script>

<template>
  {#if visible}
    <ul :class="items.length > 1 ? 'ready' : ''">
      {#each items as item, index}
        <li>{index}: {item}</li>
      {/each}
    </ul>
  {/if}
</template>

<style scoped>
  li { color: rebeccapurple; }
</style>`;

function instrumentCounter(displayJs) {
  const ast = babelParse(displayJs, { sourceType: 'module' });
  const magic = new MagicString(displayJs);

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'CallExpression' && node.callee?.name === 'createEffect') {
      const arg = node.arguments[0];
      if (arg) {
        const line = node.loc.start.line;
        magic.prependLeft(arg.start, `__trace(${line}, `);
        magic.appendRight(arg.end, ')');
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) walk(item);
      } else if (child && typeof child === 'object') {
        walk(child);
      }
    }
  }

  walk(ast);
  magic.prepend(`import { __trace } from '../trace.js';\n`);
  return magic.toString();
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  // Compile Counter for Hero Live Demo
  const counterCompiled = compileSource(counterFlowSource, 'Counter.flow');
  const counterDisplayJs = counterCompiled.js.trim();
  const counterRunJs = instrumentCounter(counterDisplayJs);

  await writeFile(counterDisplayFile, `${counterDisplayJs}\n`, 'utf-8');
  await writeFile(counterRunFile, `${counterRunJs}\n`, 'utf-8');

  const counterSourceHtml = await highlight(counterFlowSource, 'html');
  const counterDisplayJsHtml = await highlight(counterDisplayJs, 'javascript');

  // Compile App.flow for How It Works Pipeline
  const ast = parse(flowSource, 'App.flow');
  const analysis = analyze(ast);
  const compiled = compileSource(flowSource, 'App.flow');

  const astSample = JSON.stringify(
    {
      type: ast.type,
      filename: ast.filename,
      script: {
        lang: ast.script?.lang,
        content: ast.script?.content.trim(),
      },
      template: {
        childrenCount: ast.template?.children.length,
        directives: ['#if visible', '#each items as item, index'],
      },
      style: {
        scoped: ast.style?.scoped,
        content: ast.style?.content.trim(),
      },
    },
    null,
    2,
  );

  const analysisSample = JSON.stringify(
    {
      strategy: analysis.strategy,
      signals: Array.from(analysis.scriptAnalysis.signals),
      hasAsync: analysis.scriptAnalysis.hasAsync,
      hasSideEffects: analysis.scriptAnalysis.hasSideEffects,
      template: {
        hasBindings: analysis.templateAnalysis.hasBindings,
        hasDirectives: analysis.templateAnalysis.hasDirectives,
        hasEvents: analysis.templateAnalysis.hasEvents,
        hasExpressions: analysis.templateAnalysis.hasExpressions,
      },
    },
    null,
    2,
  );

  const runtimeCssSample = `/* Virtual CSS module: App.flow.css */
${compiled.css.trim()}

/* Fine-grained runtime subscriptions */
// Signal reads link directly to DOM text nodes and class attributes:
// items.length > 1 -> element.className updates on signal change
// visible -> conditional container toggle without virtual DOM diff`;

  const steps = [
    {
      id: 'parse',
      num: 1,
      title: 'Parse',
      description: 'Parses single-file .flow component into an abstract syntax tree.',
      file: 'packages/compiler/src/parser/index.ts',
      repoUrl: 'https://github.com/onuracar-dev/FluxDOM/blob/main/packages/compiler/src/parser/index.ts',
      code: astSample,
      lang: 'json',
      html: await highlight(astSample, 'json'),
      limitLines: 20,
    },
    {
      id: 'analyze',
      num: 2,
      title: 'Analyze',
      description: 'Identifies reactive signals, dependency graphs, and rendering strategy.',
      file: 'packages/compiler/src/analyzer/index.ts',
      repoUrl: 'https://github.com/onuracar-dev/FluxDOM/blob/main/packages/compiler/src/analyzer/index.ts',
      code: analysisSample,
      lang: 'json',
      html: await highlight(analysisSample, 'json'),
    },
    {
      id: 'transform',
      num: 3,
      title: 'Transform',
      description: 'Rewrites signal declarations and generates direct DOM manipulation routines.',
      file: 'packages/compiler/src/transformer/signal-transform.ts',
      repoUrl: 'https://github.com/onuracar-dev/FluxDOM/blob/main/packages/compiler/src/transformer/signal-transform.ts',
      code: compiled.js.trim(),
      lang: 'javascript',
      html: await highlight(compiled.js.trim(), 'javascript'),
    },
    {
      id: 'runtime',
      num: 4,
      title: 'Runtime calls + CSS',
      description: 'Connects signal subscriptions directly to DOM nodes and scopes component CSS.',
      file: 'packages/runtime/src/index.ts',
      repoUrl: 'https://github.com/onuracar-dev/FluxDOM/blob/main/packages/runtime/src/index.ts',
      code: runtimeCssSample,
      lang: 'css',
      html: await highlight(runtimeCssSample, 'css'),
    },
    {
      id: 'vite',
      num: 5,
      title: 'Vite bundle',
      description: 'Bundles .flow modules and virtual CSS into standard ESM for production.',
      file: 'packages/vite-plugin/src/index.ts',
      repoUrl: 'https://github.com/onuracar-dev/FluxDOM/blob/main/packages/vite-plugin/src/index.ts',
      code: null,
      explanation: 'The FluxDOM Vite plugin compiles .flow Single File Components into direct DOM operations and extracts virtual scoped CSS modules. It transforms components ahead of time during Vite dev and build cycles, emitting standard ESM without runtime compiler overhead.',
    },
  ];

  const data = {
    counter: {
      source: counterFlowSource,
      sourceHtml: counterSourceHtml,
      displayJs: counterDisplayJs,
      displayJsHtml: counterDisplayJsHtml,
    },
    steps,
  };

  await writeFile(samplesJsonFile, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  console.log(`Generated samples to ${samplesJsonFile}, ${counterDisplayFile}, and ${counterRunFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
