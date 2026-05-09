import puppeteer from 'puppeteer';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const TIMEOUT_MS = 15_000;

export interface FetchResult {
  url: string;
  status: number;
  html: string;
  screenshot_base64: string;
  error?: string;
}

export async function fetchWebsite(url: string): Promise<FetchResult> {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setViewport({ width: 1280, height: 900 });

    let httpStatus = 0;

    page.on('response', (response) => {
      if (response.url() === page.url() || response.url() === url) {
        httpStatus = response.status();
      }
    });

    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: TIMEOUT_MS,
    });

    if (response !== null) {
      httpStatus = response.status();
    }

    const html = await page.content();

    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: false,
    });

    const screenshot_base64 = Buffer.from(screenshotBuffer).toString('base64');

    return { url, status: httpStatus, html, screenshot_base64 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout =
      message.toLowerCase().includes('timeout') ||
      message.toLowerCase().includes('timed out');

    return {
      url,
      status: 0,
      html: '',
      screenshot_base64: '',
      error: isTimeout ? 'timeout after 15s' : `connection error: ${message}`,
    };
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
