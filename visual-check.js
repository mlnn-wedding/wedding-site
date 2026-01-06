const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');

const viewports = [
  { name: 'desktop', width: 1200, height: 800 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const ARTIFACTS_DIR = path.join(__dirname, 'artifacts');

const ensureDir = async (dirPath) => {
  await fs.promises.mkdir(dirPath, { recursive: true });
};

const loadPng = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  return PNG.sync.read(buffer);
};

const countGreenishPixels = (png, region, borderPadding = 2) => {
  const xStart = Math.max(0, Math.floor(region.x + borderPadding));
  const yStart = Math.max(0, Math.floor(region.y + borderPadding));
  const xEnd = Math.min(png.width, Math.ceil(region.x + region.width - borderPadding));
  const yEnd = Math.min(png.height, Math.ceil(region.y + region.height - borderPadding));
  let count = 0;
  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const idx = (png.width * y + x) << 2;
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      const a = png.data[idx + 3];
      if (a === 0) continue;
      const greenLead = g - Math.max(r, b);
      const saturation = Math.max(g, r, b) - Math.min(g, r, b);
      if (greenLead > 28 && g > 50 && saturation > 18) {
        count += 1;
      }
    }
  }
  return count;
};

const relativeRect = (outer, inner) => ({
  x: inner.x - outer.x,
  y: inner.y - outer.y,
  width: inner.width,
  height: inner.height,
});

async function runViewportCheck(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  const fileUrl = `file://${path.join(__dirname, 'index.html')}`;
  await page.goto(fileUrl);
  await page.waitForSelector('.hero-frame');
  await page.waitForTimeout(200);

  const metrics = await page.evaluate(() => {
    const frame = document.querySelector('.hero-frame');
    const photo = frame?.querySelector('.hero-photo');
    const wreath = frame?.querySelector('.hero-wreath');
    if (!frame || !photo || !wreath) return null;
    const frameRect = frame.getBoundingClientRect();
    const photoRect = photo.getBoundingClientRect();
    const styles = getComputedStyle(frame);
    const vars = ['--hole-cx', '--hole-cy', '--hole-w', '--hole-h', '--hole-r'].reduce((acc, key) => {
      acc[key] = styles.getPropertyValue(key).trim();
      return acc;
    }, {});
    return {
      frame: { x: frameRect.x, y: frameRect.y, width: frameRect.width, height: frameRect.height },
      photo: { x: photoRect.x, y: photoRect.y, width: photoRect.width, height: photoRect.height },
      variables: vars,
    };
  });

  if (!metrics) {
    throw new Error(`[${viewport.name}] Не удалось получить размеры hero.`);
  }

  const frameHandle = await page.$('.hero-frame');
  if (!frameHandle) throw new Error(`[${viewport.name}] Не найден .hero-frame для скриншота.`);

  await ensureDir(ARTIFACTS_DIR);
  const screenshotPath = path.join(ARTIFACTS_DIR, `hero-${viewport.name}.png`);
  await frameHandle.screenshot({ path: screenshotPath });

  await page.$eval('.hero-photo', (el) => {
    el.style.visibility = 'hidden';
    el.style.opacity = '0';
  });
  await page.waitForTimeout(50);

  const maskShotPath = path.join(ARTIFACTS_DIR, `hero-${viewport.name}-mask.png`);
  await frameHandle.screenshot({ path: maskShotPath });

  const png = loadPng(maskShotPath);
  const photoRegion = relativeRect(metrics.frame, metrics.photo);
  const greenPixels = countGreenishPixels(png, photoRegion);
  await page.close();

  return {
    viewport,
    screenshotPath,
    maskShotPath,
    greenPixels,
    variables: metrics.variables,
    photoRegion,
  };
}

async function main() {
  await ensureDir(ARTIFACTS_DIR);
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const viewport of viewports) {
      const res = await runViewportCheck(browser, viewport);
      results.push(res);
    }
  } finally {
    await browser.close();
  }

  const leaks = results.filter((r) => r.greenPixels > 6);
  results.forEach((r) => {
    const message = `[${r.viewport.name}] зелёных пикселей внутри фото: ${r.greenPixels}; маска: ${JSON.stringify(r.variables)}`;
    console.log(message);
  });

  if (leaks.length) {
    console.error(`Обнаружено наложение венка внутри фото для: ${leaks.map((l) => l.viewport.name).join(', ')}`);
    process.exit(1);
  }

  console.log('Маска венка прошла проверку на всех разрешениях.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
