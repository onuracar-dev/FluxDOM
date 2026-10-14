import { spawn } from 'node:child_process';
import { access, mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const fluxRoot = process.cwd();
const artifactsRoot = resolve(fluxRoot, 'tests', '.artifacts');
const site = { name: 'fluxdom', root: fluxRoot, port: 4311 };

async function findChromium() {
  const browserRoot = resolve(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
  try {
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
  } catch {
    // Continue to fallbacks
  }

  const fallbacks = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const candidate of fallbacks) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue to next fallback
    }
  }

  throw new Error(`No Chromium executable found under ${browserRoot} or system browser paths`);
}

async function startPreview(siteConfig) {
  const vite = resolve(siteConfig.root, 'node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(
    process.execPath,
    [vite, 'preview', '--host', '127.0.0.1', '--port', String(siteConfig.port), '--strictPort'],
    {
      cwd: siteConfig.root,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );
  let logs = '';
  child.stdout.on('data', (chunk) => {
    logs += chunk;
  });
  child.stderr.on('data', (chunk) => {
    logs += chunk;
  });
  await waitForUrl(`http://127.0.0.1:${siteConfig.port}`, child, () => logs);
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

async function stopPreview(child) {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolvePromise) => child.once('exit', resolvePromise));
  child.kill();
  await Promise.race([exited, new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000))]);
}

async function runTests() {
  await mkdir(artifactsRoot, { recursive: true });
  const server = await startPreview(site);

  let browser;
  const results = [];

  try {
    const executablePath = await findChromium();
    browser = await chromium.launch({ headless: true, executablePath });

    const logPass = (title, details = '') => {
      console.log(`[PASS] ${title}${details ? ` (${details})` : ''}`);
      results.push({ test: title, status: 'PASS', details });
    };

    const logFail = (title, reason) => {
      console.error(`[FAIL] ${title}: ${reason}`);
      results.push({ test: title, status: 'FAIL', reason });
    };

    // Shared desktop context for interaction tests
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'no-preference',
      permissions: ['clipboard-read', 'clipboard-write'],
    });

    const page = await desktopContext.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`http://127.0.0.1:${site.port}`, { waitUntil: 'networkidle' });
    // Wait for initial fade/rise animations to settle
    await page.waitForTimeout(1600);

    // ----------------------------------------------------
    // Test 1: Sağlık
    // Sayfa açılır, konsolda error yok, tek h1, header/nav/main/footer var.
    // Bütün butonların erişilebilir bir adı var.
    // ----------------------------------------------------
    try {
      const structure = await page.evaluate(() => {
        const h1Count = document.querySelectorAll('h1').length;
        const landmarks = {
          header: document.querySelectorAll('header').length,
          nav: document.querySelectorAll('nav').length,
          main: document.querySelectorAll('main').length,
          footer: document.querySelectorAll('footer').length,
        };
        const buttons = Array.from(document.querySelectorAll('button')).map((btn) => ({
          text: (btn.textContent || '').trim(),
          ariaLabel: btn.getAttribute('aria-label'),
          hasName: Boolean(btn.getAttribute('aria-label') || (btn.textContent || '').trim()),
        }));
        return { h1Count, landmarks, buttons };
      });

      const missingLandmarks = Object.entries(structure.landmarks).filter(([, count]) => count < 1);
      const unlabeledButtons = structure.buttons.filter((b) => !b.hasName);

      if (consoleErrors.length > 0 || pageErrors.length > 0) {
        logFail('Test 1 - Sağlık', `Console errors: ${[...consoleErrors, ...pageErrors].join(', ')}`);
      } else if (structure.h1Count !== 1) {
        logFail('Test 1 - Sağlık', `Expected exactly 1 h1, found ${structure.h1Count}`);
      } else if (missingLandmarks.length > 0) {
        logFail('Test 1 - Sağlık', `Missing landmarks: ${missingLandmarks.map(([k]) => k).join(', ')}`);
      } else if (unlabeledButtons.length > 0) {
        logFail('Test 1 - Sağlık', `Found ${unlabeledButtons.length} button(s) without accessible names`);
      } else {
        logPass('Test 1 - Sağlık', `1 h1, landmarks present, ${structure.buttons.length} labeled buttons, 0 errors`);
      }
    } catch (err) {
      logFail('Test 1 - Sağlık', err.message);
    }

    // ----------------------------------------------------
    // Test 2: axe
    // 375 ve 1440 genişlikte 0 ihlal
    // ----------------------------------------------------
    const axeResults = {};
    for (const width of [375, 1440]) {
      try {
        const axeContext = await browser.newContext({
          viewport: { width, height: 900 },
          reducedMotion: 'no-preference',
        });
        const axePage = await axeContext.newPage();
        await axePage.goto(`http://127.0.0.1:${site.port}`, { waitUntil: 'networkidle' });
        await axePage.waitForTimeout(1600);

        const audit = await new AxeBuilder({ page: axePage })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();

        axeResults[width] = audit.violations;
        await axeContext.close();

        if (audit.violations.length === 0) {
          logPass(`Test 2 - axe (${width}px)`, '0 violations');
        } else {
          const summary = audit.violations.map((v) => `${v.id} (${v.nodes.length} nodes)`).join(', ');
          logFail(`Test 2 - axe (${width}px)`, `${audit.violations.length} violations: ${summary}`);
        }
      } catch (err) {
        logFail(`Test 2 - axe (${width}px)`, err.message);
      }
    }

    // ----------------------------------------------------
    // Test 3: Yatay taşma yok
    // 375 / 768 / 1440'ta scrollWidth <= innerWidth
    // ----------------------------------------------------
    for (const width of [375, 768, 1440]) {
      try {
        const overflowContext = await browser.newContext({
          viewport: { width, height: 900 },
        });
        const overflowPage = await overflowContext.newPage();
        await overflowPage.goto(`http://127.0.0.1:${site.port}`, { waitUntil: 'networkidle' });
        const overflow = await overflowPage.evaluate(() => {
          const root = document.documentElement;
          return {
            scrollWidth: root.scrollWidth,
            innerWidth: window.innerWidth,
            passed: root.scrollWidth <= window.innerWidth,
          };
        });
        await overflowContext.close();

        if (overflow.passed) {
          logPass(`Test 3 - Yatay taşma yok (${width}px)`, `scrollWidth: ${overflow.scrollWidth} <= innerWidth: ${overflow.innerWidth}`);
        } else {
          logFail(`Test 3 - Yatay taşma yok (${width}px)`, `scrollWidth: ${overflow.scrollWidth} > innerWidth: ${overflow.innerWidth}`);
        }
      } catch (err) {
        logFail(`Test 3 - Yatay taşma yok (${width}px)`, err.message);
      }
    }

    // ----------------------------------------------------
    // Test 4: Hero başlık
    // h1'in aria-label'ı "Write components. Ship direct DOM."
    // ----------------------------------------------------
    try {
      const h1AriaLabel = await page.locator('h1.hero-h').getAttribute('aria-label');
      const expectedLabel = 'Write components. Ship direct DOM.';
      if (h1AriaLabel === expectedLabel) {
        logPass('Test 4 - Hero başlık', `aria-label is "${expectedLabel}"`);
      } else {
        logFail('Test 4 - Hero başlık', `Expected "${expectedLabel}", received "${h1AriaLabel}"`);
      }
    } catch (err) {
      logFail('Test 4 - Hero başlık', err.message);
    }

    // ----------------------------------------------------
    // Test 5: Signal alanı fine-grained
    // Hero üzerinde 10 pointermove olayı gönder. Her karede .meter-live değeri
    // toplam nokta sayısının %15'inden azdır ve en az bir karede > 0'dır.
    // pointerleave'den 2 saniye sonra --h > 0 olan nokta kalmaz.
    // ----------------------------------------------------
    try {
      const totalDots = await page.evaluate(() => document.querySelectorAll('.hero-field .field-dot').length);
      const maxAllowed = totalDots * 0.15;
      const heroField = page.locator('.hero-field');
      const box = await heroField.boundingBox();

      if (!box || totalDots === 0) {
        throw new Error('Hero field element or dots not found');
      }

      const recordedEffects = [];
      for (let i = 0; i < 10; i++) {
        const x = box.x + 180 + i * 25;
        const y = box.y + 160 + i * 18;
        await page.mouse.move(x, y);
        await page.waitForTimeout(140);
        const liveVal = await page.evaluate(() => Number(document.querySelector('.meter-live')?.textContent?.trim() || '0'));
        recordedEffects.push(liveVal);
      }

      const anyAboveZero = recordedEffects.some((val) => val > 0);
      const allBelow15Percent = recordedEffects.every((val) => val < maxAllowed);

      // Trigger pointerleave and wait 2 seconds for dots to cool down
      await page.dispatchEvent('.hero-field', 'pointerleave');
      await page.waitForTimeout(2100);

      const hotDotsRemaining = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.hero-field .field-dot')).filter((dot) => {
          const style = dot.getAttribute('style') || '';
          const match = style.match(/--h:([0-9.]+)/);
          return match && parseFloat(match[1]) > 0;
        }).length;
      });

      if (!anyAboveZero) {
        logFail('Test 5 - Signal alanı fine-grained', `No frame reported > 0 effects: [${recordedEffects.join(', ')}]`);
      } else if (!allBelow15Percent) {
        logFail('Test 5 - Signal alanı fine-grained', `Some frames exceeded 15% (${maxAllowed}): [${recordedEffects.join(', ')}]`);
      } else if (hotDotsRemaining > 0) {
        logFail('Test 5 - Signal alanı fine-grained', `${hotDotsRemaining} dots still have --h > 0 after 2s cooldown`);
      } else {
        logPass(
          'Test 5 - Signal alanı fine-grained',
          `10 frames recorded [${recordedEffects.join(', ')}], all < 15% of ${totalDots}, 0 hot dots after 2s`,
        );
      }
    } catch (err) {
      logFail('Test 5 - Signal alanı fine-grained', err.message);
    }

    // ----------------------------------------------------
    // Test 6: Demo sayaçları
    // .live-mount button'a 3 kez tıkla. Her tıklama arasında 50ms bekle (ayrı task'lar).
    // Sonuç: buton metni Count: 3, effects 6, DOM writes 3.
    // ----------------------------------------------------
    try {
      const counterBtn = page.locator('.live-mount button');
      await counterBtn.waitFor({ state: 'visible', timeout: 5000 });

      for (let i = 0; i < 3; i++) {
        await counterBtn.click();
        await page.waitForTimeout(50);
      }
      await page.waitForTimeout(100);

      const btnText = (await counterBtn.textContent())?.trim();
      const effectsVal = (await page.locator('.readout--effect .readout-v').textContent())?.trim();
      const domVal = (await page.locator('.readout--dom .readout-v').textContent())?.trim();

      if (btnText !== 'Count: 3') {
        logFail('Test 6 - Demo sayaçları', `Expected button text "Count: 3", received "${btnText}"`);
      } else if (effectsVal !== '6') {
        logFail('Test 6 - Demo sayaçları', `Expected effects "6", received "${effectsVal}"`);
      } else if (domVal !== '3') {
        logFail('Test 6 - Demo sayaçları', `Expected DOM writes "3", received "${domVal}"`);
      } else {
        logPass('Test 6 - Demo sayaçları', `Button text "${btnText}", effects: ${effectsVal}, DOM writes: ${domVal}`);
      }
    } catch (err) {
      logFail('Test 6 - Demo sayaçları', err.message);
    }

    // ----------------------------------------------------
    // Test 7: Prototype patch yok
    // Element.prototype.setAttribute.toString() [native code] içerir.
    // ----------------------------------------------------
    try {
      const isNative = await page.evaluate(() => Element.prototype.setAttribute.toString().includes('[native code]'));
      if (isNative) {
        logPass('Test 7 - Prototype patch yok', 'Element.prototype.setAttribute is unpatched [native code]');
      } else {
        logFail('Test 7 - Prototype patch yok', 'Element.prototype.setAttribute was patched');
      }
    } catch (err) {
      logFail('Test 7 - Prototype patch yok', err.message);
    }

    // ----------------------------------------------------
    // Test 8: Class sınırı
    // 6. tıklamada buton max class'ını alır, DOM writes 1 fazladan artar (class yazımı).
    // ----------------------------------------------------
    try {
      const counterBtn = page.locator('.live-mount button');
      for (let i = 0; i < 3; i++) {
        await counterBtn.click();
        await page.waitForTimeout(50);
      }
      await page.waitForTimeout(100);

      const btnClasses = await counterBtn.getAttribute('class');
      const hasMaxClass = (btnClasses || '').split(/\s+/).includes('max');
      const domValAfter6 = (await page.locator('.readout--dom .readout-v').textContent())?.trim();

      // At 6 clicks: 6 text writes + 1 class write = 7 DOM writes (1 extra for class)
      if (!hasMaxClass) {
        logFail('Test 8 - Class sınırı', `Button missing "max" class: "${btnClasses}"`);
      } else if (domValAfter6 !== '7') {
        logFail('Test 8 - Class sınırı', `Expected DOM writes "7" (6 text + 1 class), received "${domValAfter6}"`);
      } else {
        logPass('Test 8 - Class sınırı', `Button received "max" class, DOM writes incremented by 1 extra to ${domValAfter6}`);
      }
    } catch (err) {
      logFail('Test 8 - Class sınırı', err.message);
    }

    // ----------------------------------------------------
    // Test 9: Break it
    // "Break it" sekmesine tıkla. .compile-error içinde "Destructuring in a top-level let"
    // metni var. "Counter.flow"ya dön, buton tekrar görünür ve sayaç kaldığı yerden devam eder.
    // ----------------------------------------------------
    try {
      const segButtons = page.locator('.seg button');
      await segButtons.nth(1).click();
      await page.waitForSelector('.compile-error', { timeout: 3000 });
      const errorText = await page.locator('.compile-error').innerText();

      if (!errorText.includes('Destructuring in a top-level let')) {
        logFail('Test 9 - Break it', `Compile error text missing expected message: "${errorText}"`);
      } else {
        await segButtons.nth(0).click();
        await page.waitForSelector('.live-mount button', { timeout: 3000 });
        const restoredBtnText = (await page.locator('.live-mount button').textContent())?.trim();

        if (restoredBtnText !== 'Count: 6') {
          logFail('Test 9 - Break it', `Counter did not preserve state after return: received "${restoredBtnText}"`);
        } else {
          logPass('Test 9 - Break it', 'Error displayed properly, returned to Counter.flow with count preserved at 6');
        }
      }
    } catch (err) {
      logFail('Test 9 - Break it', err.message);
    }

    // ----------------------------------------------------
    // Test 10: Compiler
    // 5 .stage var. Analyze stage'inde en az bir .chip--signal var.
    // ----------------------------------------------------
    try {
      const stageCount = await page.locator('.stage').count();
      const chipCount = await page.locator('#stage-analyze .chip--signal').count();

      if (stageCount !== 5) {
        logFail('Test 10 - Compiler', `Expected 5 .stage elements, found ${stageCount}`);
      } else if (chipCount < 1) {
        logFail('Test 10 - Compiler', `Expected at least 1 .chip--signal in Analyze stage, found ${chipCount}`);
      } else {
        logPass('Test 10 - Compiler', `Found 5 stages, Analyze stage contains ${chipCount} signal chips`);
      }
    } catch (err) {
      logFail('Test 10 - Compiler', err.message);
    }

    // ----------------------------------------------------
    // Test 11: Paketler
    // 7 .pkg, en az 7 .edge path'i var, her path'in d attribute'u boş değil.
    // ----------------------------------------------------
    try {
      const pkgCount = await page.locator('.pkg').count();
      const edgePaths = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.graph-edges path.edge')).map((p) => p.getAttribute('d') || '');
      });

      const emptyEdges = edgePaths.filter((d) => !d.trim());

      if (pkgCount !== 7) {
        logFail('Test 11 - Paketler', `Expected 7 .pkg elements, found ${pkgCount}`);
      } else if (edgePaths.length < 7) {
        logFail('Test 11 - Paketler', `Expected at least 7 .edge paths, found ${edgePaths.length}`);
      } else if (emptyEdges.length > 0) {
        logFail('Test 11 - Paketler', `Found ${emptyEdges.length} edge path(s) with empty d attribute`);
      } else {
        logPass('Test 11 - Paketler', `7 packages, ${edgePaths.length} edges with valid SVG path data`);
      }
    } catch (err) {
      logFail('Test 11 - Paketler', err.message);
    }

    // ----------------------------------------------------
    // Test 12: Terminal
    // Kapanış bölümüne scroll et. 3 saniye içinde .term-cmd "$ npx @fluxdom/cli create my-flow-app"
    // ve en az bir .term-out görünür.
    // ----------------------------------------------------
    try {
      await page.locator('.closing').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      const termCmdText = await page.locator('.term-cmd').first().textContent();
      const termOutCount = await page.locator('.term-out').count();

      if (!termCmdText?.includes('$ npx @fluxdom/cli create my-flow-app')) {
        logFail('Test 12 - Terminal', `Expected .term-cmd to contain "$ npx @fluxdom/cli create my-flow-app", found "${termCmdText}"`);
      } else if (termOutCount < 1) {
        logFail('Test 12 - Terminal', `Expected at least 1 .term-out line, found ${termOutCount}`);
      } else {
        logPass('Test 12 - Terminal', `Command rendered "$ npx @fluxdom/cli create my-flow-app" with ${termOutCount} output lines`);
      }
    } catch (err) {
      logFail('Test 12 - Terminal', err.message);
    }

    await desktopContext.close();

    // ----------------------------------------------------
    // Test 13: Reduced motion
    // reducedMotion: 'reduce' ile aç. Başlık anında görünür (.swap--done 100ms içinde),
    // pointermove sonrası .meter-live 0 kalır.
    // ----------------------------------------------------
    try {
      const rmContext = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: 'reduce',
      });
      const rmPage = await rmContext.newPage();
      await rmPage.goto(`http://127.0.0.1:${site.port}`, { waitUntil: 'networkidle' });
      await rmPage.waitForTimeout(90);

      const swapDoneCount = await rmPage.locator('.swap--done').count();
      const heroField = rmPage.locator('.hero-field');
      const box = await heroField.boundingBox();

      if (box) {
        await rmPage.mouse.move(box.x + 200, box.y + 200);
        await rmPage.waitForTimeout(150);
      }
      const rmLiveEffects = await rmPage.evaluate(() => Number(document.querySelector('.meter-live')?.textContent?.trim() || '0'));
      await rmContext.close();

      if (swapDoneCount < 1) {
        logFail('Test 13 - Reduced motion', 'Title did not achieve .swap--done within 100ms');
      } else if (rmLiveEffects !== 0) {
        logFail('Test 13 - Reduced motion', `Expected .meter-live to remain 0, received ${rmLiveEffects}`);
      } else {
        logPass('Test 13 - Reduced motion', 'Title compiled immediately (.swap--done within 100ms), meter-live stayed at 0');
      }
    } catch (err) {
      logFail('Test 13 - Reduced motion', err.message);
    }

    // ----------------------------------------------------
    // Test 14: Screenshot
    // 375 ve 1440, tests/.artifacts/ altına.
    // ----------------------------------------------------
    try {
      for (const vp of [
        { name: 'fluxdom-mobile-375', width: 375, height: 812 },
        { name: 'fluxdom-desktop-1440', width: 1440, height: 900 },
      ]) {
        const shotContext = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const shotPage = await shotContext.newPage();
        await shotPage.goto(`http://127.0.0.1:${site.port}`, { waitUntil: 'networkidle' });
        await shotPage.waitForTimeout(1600);
        await shotPage.screenshot({
          path: resolve(artifactsRoot, `${vp.name}.png`),
          fullPage: true,
        });
        await shotContext.close();
      }
      logPass('Test 14 - Screenshot', 'Saved 375px and 1440px full-page screenshots to tests/.artifacts/');
    } catch (err) {
      logFail('Test 14 - Screenshot', err.message);
    }

    // Write artifact report
    await writeFile(
      resolve(artifactsRoot, 'report.json'),
      `${JSON.stringify({ results, axe: axeResults }, null, 2)}\n`,
      'utf8',
    );
  } finally {
    if (browser) await browser.close();
    await stopPreview(server);
  }

  const failures = results.filter((r) => r.status === 'FAIL');
  console.log(`\n========================================`);
  console.log(`Summary: ${results.length - failures.length}/${results.length} checks passed.`);
  if (failures.length > 0) {
    console.error(`Failures (${failures.length}):`);
    for (const f of failures) {
      console.error(`  - ${f.test}: ${f.reason}`);
    }
    process.exit(1);
  } else {
    console.log('ALL PLAYWRIGHT & A11Y TESTS PASSED!');
    process.exit(0);
  }
}

runTests().catch((error) => {
  console.error('Fatal test error:', error);
  process.exit(1);
});
