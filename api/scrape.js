const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core');

export default async function handler(req, res) {
  let browser;
  try {
    // Remote path dari GitHub release Sparticuz (versi 141 stabil 2026)
    // Kamu bisa ganti ke versi lain kalau perlu: https://github.com/Sparticuz/chromium/releases
    const remoteChromiumPath = 'https://github.com/Sparticuz/chromium/releases/download/v141.0.0/chromium-v141.0.0-pack.tar.br';

    const executablePath = await chromium.executablePath(remoteChromiumPath);

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,          // atau true / 'new' kalau error
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const result = {
      timestamp: new Date().toISOString(),
      source: "Puppeteer Scraper (Harga + 20 Butik Resmi + Stok Online)",
      harga_antam: [],
      harga_galeri24: [],
      stok_online_marketplace: [],
      daftar_20_butik: [],
      catatan_stok: "Stok fisik per butik TIDAK ditampilkan publik. Cek kuota antrean di https://antrean.logammulia.com/ (pilih butik → lihat slot tersedia)"
    };

    // === 1. Harga Galeri24 ===
    await page.goto('https://galeri24.co.id/harga-emas', { waitUntil: 'networkidle2', timeout: 30000 });
    result.harga_galeri24 = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('table tr')).slice(1).map(row => {
        const c = row.querySelectorAll('td');
        return {
          berat: c[0]?.innerText.trim() || '',
          jual: c[1]?.innerText.trim() || '',
          buyback: c[2]?.innerText.trim() || ''
        };
      }).filter(r => r.berat);
    });

    // === 2. Harga Antam (Logam Mulia) ===
    await page.goto('https://logammulia.com/id/harga-emas-hari-ini', { waitUntil: 'networkidle2', timeout: 30000 });
    result.harga_antam = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('table tr')).slice(1).map(row => {
        const c = row.querySelectorAll('td');
        return {
          berat: c[0]?.innerText.trim() || '',
          harga: c[2]?.innerText.trim() || ''
        };
      }).filter(r => r.berat);
    });

    // === 3. Stok Marketplace (Tokopedia + Shopee) ===
    await page.goto('https://www.tokopedia.com/butik-emas-antam-official', { waitUntil: 'networkidle2', timeout: 30000 });
    const tokopedia = await page.evaluate(() => 
      Array.from(document.querySelectorAll('[data-testid="product-card"]')).slice(0,8).map(p => ({
        toko: "Tokopedia Official",
        produk: p.querySelector('h3')?.innerText.trim() || '',
        stok: p.querySelector('[data-testid="stock-text"]')?.innerText.trim() || 'Tersedia'
      }))
    );

    await page.goto('https://shopee.co.id/butikemasantam.official', { waitUntil: 'networkidle2', timeout: 30000 });
    const shopee = await page.evaluate(() => 
      Array.from(document.querySelectorAll('.product-card')).slice(0,8).map(p => ({
        toko: "Shopee Official",
        produk: p.querySelector('.product-name')?.innerText.trim() || '',
        stok: p.querySelector('.stock')?.innerText.trim() || 'Tersedia'
      }))
    );

    result.stok_online_marketplace = [...tokopedia, ...shopee];

    // === 4. 20 Butik Resmi ===
    await page.goto('https://logammulia.com/id/contact', { waitUntil: 'networkidle2', timeout: 30000 });
    result.daftar_20_butik = await page.evaluate(() => {
      const butiks = [];
      document.querySelectorAll('div, section').forEach(el => {
        const name = el.querySelector('h3, strong, .title')?.innerText.trim();
        const addr = el.querySelector('p, .address')?.innerText.trim();
        const telp = el.querySelector('a[href^="tel"]')?.innerText.trim() || '-';
        const maps = el.querySelector('a[href*="maps"]')?.href || '#';

        if (name && addr) {
          butiks.push({ nama: name, alamat: addr, telepon: telp, maps });
        }
      });
      return butiks.slice(0, 20);
    });

    await browser.close();
    res.status(200).json(result);

  } catch (error) {
    if (browser) await browser.close();
    console.error('Error:', error.message, error.stack);
    res.status(500).json({
      error: 'Scrape gagal',
      message: error.message,
      tips: 'Cek Vercel logs. Pastikan remote path Chromium benar dan memory >=1024MB.'
    });
  }
}