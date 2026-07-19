import { spawn } from 'node:child_process';
import { access, mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const starterCommand = 'npx @fluxdom/cli create my-flow-app';
const installCommand = 'npm install @onuracar-dev/nimblejs';
const fluxRoot = process.cwd();
const nimbleRoot = resolve(fluxRoot, '..', '..', 'NimbleJs', 'website');
const artifactsRoot = resolve(fluxRoot, 'tests', '.artifacts');
const sites = [
  { name: 'fluxdom', root: fluxRoot, port: 4311 },
  { name: 'nimblejs', root: nimbleRoot, port: 4312 },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];
const servers = [];

try {
  await mkdir(artifactsRoot, { recursive: true });
  for (const site of sites) servers.push(await startPreview(site));

  const browser = await chromium.launch({ headless: true, executablePath: await findChromium() });
  const report = [];
  try {
    for (const site of sites) {
      for (const viewport of viewports) report.push(await auditPage(browser, site, viewport));
    }
  } finally {
    await browser.close();
  }

  await writeFile(resolve(artifactsRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
  if (report.some(hasReportFailure)) process.exitCode = 1;
} finally {
  await Promise.all(servers.map(stopPreview));
}

async function findChromium() {
  const browserRoot = resolve(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
  const installations = (await readdir(browserRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^chromium-\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => Number(right.split('-')[1]) - Number(left.split('-')[1]));
  for (const installation of installations) {
    const candidate = resolve(browserRoot, installation, 'chrome-win64', 'chrome.exe');
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next installed Chromium revision.
    }
  }
  throw new Error(`No Playwright Chromium executable found under ${browserRoot}`);
}

function hasReportFailure(entry) {
  const landmarks = entry.structure.landmarks;
  return entry.violations.length > 0
    || entry.overflow.documentPixels > 0
    || entry.overflow.culprits.length > 0
    || entry.consoleErrors.length > 0
    || entry.responseErrors.length > 0
    || entry.smokeFailures.length > 0
    || entry.structure.h1Count !== 1
    || entry.structure.unlabeledButtons > 0
    || !entry.structure.title
    || !entry.structure.lang
    || Object.values(landmarks).some((count) => count !== 1)
    || entry.keyboard.some((item) => !item?.focusVisible || !item.indicator);
}

async function stopPreview(child) {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolvePromise) => child.once('exit', resolvePromise));
  child.kill();
  await Promise.race([exited, new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000))]);
}

async function startPreview(site) {
  const vite = resolve(site.root, 'node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(process.execPath, [vite, 'preview', '--host', '127.0.0.1', '--port', String(site.port), '--strictPort'], {
    cwd: site.root,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let logs = '';
  child.stdout.on('data', (chunk) => { logs += chunk; });
  child.stderr.on('data', (chunk) => { logs += chunk; });
  await waitForUrl(`http://127.0.0.1:${site.port}`, child, () => logs);
  return child;
}

async function waitForUrl(url, child, getLogs) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Preview exited early: ${getLogs()}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error(`Timed out waiting for ${url}: ${getLogs()}`);
}

async function auditPage(browser, site, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'reduce',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const responseErrors = [];
  page.setDefaultTimeout(7_500);
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) responseErrors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(`http://127.0.0.1:${site.port}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: resolve(artifactsRoot, `${site.name}-${viewport.name}.png`), fullPage: true });
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const overflow = await measureOverflow(page);
  const structure = await inspectStructure(page);
  const keyboard = await inspectKeyboard(page, viewport.name === 'desktop' ? 14 : 8);
  const smokeFailures = await runSmoke(page, site.name, viewport.name);
  await context.close();

  return {
    site: site.name,
    viewport,
    violations: axe.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => ({ target: node.target, html: node.html, summary: node.failureSummary })),
    })),
    passes: axe.passes.length,
    incomplete: axe.incomplete.map((entry) => ({
      id: entry.id,
      nodes: entry.nodes.map((node) => ({ target: node.target, html: node.html, summary: node.failureSummary })),
    })),
    overflow,
    structure,
    keyboard,
    consoleErrors,
    responseErrors,
    smokeFailures,
  };
}

async function measureOverflow(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const documentPixels = Math.max(0, root.scrollWidth - root.clientWidth);
    const culprits = Array.from(document.querySelectorAll('body *')).flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0) return [];
      if (rect.right <= root.clientWidth + 1 && rect.left >= -1) return [];
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== document.body) {
        const ancestorStyle = getComputedStyle(ancestor);
        if ((ancestorStyle.overflowX === 'auto' || ancestorStyle.overflowX === 'scroll') && ancestor.scrollWidth > ancestor.clientWidth) return [];
        ancestor = ancestor.parentElement;
      }
      return [{
        selector: element.id ? `#${element.id}` : `${element.tagName.toLowerCase()}.${Array.from(element.classList).join('.')}`,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      }];
    }).slice(0, 12);
    return { documentPixels, scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, culprits };
  });
}

async function inspectStructure(page) {
  return page.evaluate(() => ({
    title: document.title,
    lang: document.documentElement.lang,
    h1Count: document.querySelectorAll('h1').length,
    landmarks: {
      header: document.querySelectorAll('header').length,
      nav: document.querySelectorAll('nav').length,
      main: document.querySelectorAll('main').length,
      footer: document.querySelectorAll('footer').length,
    },
    unlabeledButtons: Array.from(document.querySelectorAll('button')).filter((button) => !(button.getAttribute('aria-label') || button.textContent?.trim())).length,
  }));
}

async function inspectKeyboard(page, count) {
  await page.goto(page.url(), { waitUntil: 'networkidle' });
  const sequence = [];
  for (let index = 0; index < count; index += 1) {
    await page.keyboard.press('Tab');
    sequence.push(await page.evaluate(() => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        text: (element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 70),
        focusVisible: element.matches(':focus-visible'),
        indicator: style.outlineStyle !== 'none' || style.boxShadow !== 'none',
      };
    }));
  }
  return sequence;
}

async function runSmoke(page, site, viewport) {
  const failures = [];
  const check = async (label, operation) => {
    try {
      await operation();
    } catch (error) {
      failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (viewport === 'mobile') {
    await check('mobile menu opens and closes after navigation', async () => {
      const menu = page.locator('button.menu');
      if (await menu.getAttribute('aria-label') !== 'Open navigation') throw new Error('menu did not start closed');
      await menu.focus();
      await page.keyboard.press('Enter');
      if (await menu.getAttribute('aria-expanded') !== 'true') throw new Error('aria-expanded did not become true');
      if (await menu.getAttribute('aria-label') !== 'Close navigation') throw new Error('open state was not announced');
      await page.keyboard.press('Tab');
      const firstLink = site === 'fluxdom' ? 'The idea' : 'Model';
      const focusedName = await page.evaluate(() => (document.activeElement?.textContent ?? '').trim());
      if (focusedName !== firstLink) throw new Error(`first navigation link did not receive focus: ${focusedName}`);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.querySelector('button.menu')?.getAttribute('aria-expanded') === 'false');
      if (!(await menu.evaluate((element) => element === document.activeElement))) throw new Error('Escape did not restore focus to the menu button');
      await page.keyboard.press('Enter');
      if (await menu.getAttribute('aria-expanded') !== 'true') throw new Error('menu did not reopen from the keyboard');
      const destination = site === 'fluxdom' ? 'Playground' : 'Boundaries';
      await page.getByRole('link', { name: destination, exact: true }).click();
      await page.waitForFunction(() => document.querySelector('button.menu')?.getAttribute('aria-expanded') === 'false');
      if (await menu.getAttribute('aria-label') !== 'Open navigation') throw new Error('closed state was not announced');
      if (await page.locator('nav.nav').isVisible()) throw new Error('navigation stayed visible');
    });
  }

  if (site === 'fluxdom') {
    await check('playground add/hide/show interaction', async () => {
      const input = page.getByRole('textbox', { name: 'New list item' });
      await input.fill('QA item');
      await input.press('Enter');
      await page.getByText('QA item', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Hide block' }).click();
      await page.getByText('Conditional block is not visible.').waitFor();
      await page.getByRole('button', { name: 'Show block' }).click();
      await page.getByText('QA item', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Remove QA item' }).click();
      if (await page.getByText('QA item', { exact: true }).count()) throw new Error('removed item stayed visible');
      await page.getByRole('button', { name: starterCommand }).click();
      if (await page.evaluate(() => navigator.clipboard.readText()) !== starterCommand) throw new Error('starter command was not copied');
    });
  } else {
    await check('batch and reset interaction', async () => {
      await page.getByRole('button', { name: /Write in batch/ }).click();
      const output = page.locator('.lab-output > strong');
      await output.waitFor();
      if ((await output.innerText()).replace(/\s+/g, ' ').trim() !== 'Katherine Johnson') throw new Error('batched name did not update');
      await page.getByText('Batch committed: dependent effect modeled once.').waitFor();
      if (await page.locator('.render-count i').innerText() !== '2') throw new Error('batch did not model one additional effect');
      await page.getByRole('button', { name: 'Reset lab' }).click();
      if ((await output.innerText()).replace(/\s+/g, ' ').trim() !== 'Ada Lovelace') throw new Error('reset did not restore the initial name');
      if (await page.locator('.render-count i').innerText() !== '1') throw new Error('reset did not restore the effect count');
      await page.getByRole('button', { name: installCommand }).click();
      if (await page.evaluate(() => navigator.clipboard.readText()) !== installCommand) throw new Error('install command was not copied');
    });
  }
  return failures;
}
