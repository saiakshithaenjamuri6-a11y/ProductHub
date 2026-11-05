const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

const screenshotsDir = path.resolve(__dirname, '../screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function capture() {
  console.log(`[Screenshot Tool] Using browser executable: ${executablePath}`);
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    defaultViewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2 // High-DPI Retina crispness
    },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();

  console.log('[Screenshot Tool] Navigating to http://localhost:5000...');
  await page.goto('http://localhost:5000', { waitUntil: 'networkidle0' });

  // Wait for products to render
  await page.waitForSelector('.product-card', { timeout: 10000 });
  await page.waitForTimeout ? page.waitForTimeout(1000) : new Promise((r) => setTimeout(r, 1000));

  // 1. Main Dashboard Screenshot
  console.log('[Screenshot Tool] Capturing 1/6: dashboard.png');
  await page.screenshot({
    path: path.join(screenshotsDir, 'dashboard.png'),
    fullPage: false
  });

  // 2. Product Listing Screenshot (scroll to products section)
  console.log('[Screenshot Tool] Capturing 2/6: product-list.png');
  await page.evaluate(() => {
    document.querySelector('.products-section').scrollIntoView({ behavior: 'instant' });
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({
    path: path.join(screenshotsDir, 'product-list.png'),
    fullPage: false
  });

  // Reset scroll to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 300));

  // 3. Add Product Modal Screenshot
  console.log('[Screenshot Tool] Capturing 3/6: add-product.png');
  await page.click('#openAddModalBtn');
  await page.waitForSelector('#addModalBackdrop.show', { visible: true });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({
    path: path.join(screenshotsDir, 'add-product.png'),
    fullPage: false
  });

  // Close Add Modal
  await page.click('#closeAddModalBtn');
  await new Promise((r) => setTimeout(r, 400));

  // 4. Edit Product Modal Screenshot
  console.log('[Screenshot Tool] Capturing 4/6: edit-product.png');
  const editBtn = await page.$('.btn-card-edit');
  if (editBtn) {
    await editBtn.click();
    await page.waitForSelector('#editModalBackdrop.show', { visible: true });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(screenshotsDir, 'edit-product.png'),
      fullPage: false
    });
    // Close Edit Modal
    await page.click('#closeEditModalBtn');
    await new Promise((r) => setTimeout(r, 400));
  }

  // 5. Delete Confirmation Dialog Screenshot
  console.log('[Screenshot Tool] Capturing 5/6: delete-confirmation.png');
  const deleteBtn = await page.$('.btn-card-delete');
  if (deleteBtn) {
    await deleteBtn.click();
    await page.waitForSelector('#deleteModalBackdrop.show', { visible: true });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(screenshotsDir, 'delete-confirmation.png'),
      fullPage: false
    });
    // Close Delete Modal
    await page.click('#closeDeleteModalBtn');
    await new Promise((r) => setTimeout(r, 400));
  }

  // 6. Category Filtering Screenshot
  console.log('[Screenshot Tool] Capturing 6/6: category-filter.png');
  // Scroll to products section
  await page.evaluate(() => {
    document.querySelector('.products-section').scrollIntoView({ behavior: 'instant' });
  });
  await new Promise((r) => setTimeout(r, 300));
  // Click Electronics pill
  await page.evaluate(() => {
    const pill = document.querySelector('.cat-pill[data-category="Electronics"]');
    if (pill) pill.click();
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({
    path: path.join(screenshotsDir, 'category-filter.png'),
    fullPage: false
  });

  console.log('[Screenshot Tool] All 6 genuine screenshots captured successfully in screenshots/!');
  await browser.close();
}

capture().catch((err) => {
  console.error('[Screenshot Tool] Error:', err);
  process.exit(1);
});
