const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

export default async function handler(req, res) {
  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    const result = {
      timestamp: new Date().toISOString(),
      source: "Puppeteer Scraper (Harga + 20 Butik Resmi + Stok Online)",
      harga_antam: [],
      harga_galeri24: [],
      stok_online_marketplace: [],
      daftar_20_butik: [],
      catatan_stok: "Stok fisik per butik TIDAK ditampilkan publik. Cek kuota antrean di https://antrean.logammulia.com/ (pilih butik → lihat slot tersedia)"
    };

    // === 1 & 2. Harga (sama seperti sebelumnya) ===
    await page.goto('https://galeri24.co.id/harga-emas', { waitUntil: 'networkidle2' });
    result.harga_galeri24 = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('table tr')).slice(1).map(row => {
        const c = row.querySelectorAll('td');
        return { berat: c[0]?.innerText.trim() || '', jual: c[1]?.innerText.trim() || '', buyback: c[2]?.innerText.trim() || '' };
      }).filter(r => r.berat);
    });

    await page.goto('https://logammulia.com/id/harga-emas-hari-ini', { waitUntil: 'networkidle2' });
    result.harga_antam = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('table tr')).slice(1).map(row => {
        const c = row.querySelectorAll('td');
        return { berat: c[0]?.innerText.trim() || '', harga: c[2]?.innerText.trim() || '' };
      }).filter(r => r.berat);
    });

    // === 3. Stok Online Marketplace (Tokopedia + Shopee) ===
    await page.goto('https://www.tokopedia.com/butik-emas-antam-official', { waitUntil: 'networkidle2' });
    const tokopediaStok = await page.evaluate(() => 
      Array.from(document.querySelectorAll('[data-testid="product-card"]')).slice(0,8).map(p => ({
        toko: "Tokopedia Official",
        produk: p.querySelector('h3')?.innerText.trim() || '',
        stok: p.querySelector('[data-testid="stock-text"]')?.innerText.trim() || 'Tersedia'
      }))
    );

    await page.goto('https://shopee.co.id/butikemasantam.official', { waitUntil: 'networkidle2' });
    const shopeeStok = await page.evaluate(() => 
      Array.from(document.querySelectorAll('.product-card')).slice(0,8).map(p => ({
        toko: "Shopee Official",
        produk: p.querySelector('.product-name')?.innerText.trim() || '',
        stok: p.querySelector('.stock')?.innerText.trim() || 'Tersedia'
      }))
    );

    result.stok_online_marketplace = [...tokopediaStok, ...shopeeStok];

    // === 4. Scrape 20 Butik Resmi (alamat, telp, maps) ===
    await page.goto('https://logammulia.com/id/contact', { waitUntil: 'networkidle2' });
    result.daftar_20_butik = await page.evaluate(() => {
      const butiks = [];
      document.querySelectorAll('div, section').forEach(section => {
        const nameEl = section.querySelector('h3, strong, .title');
        const addrEl = section.querySelector('p, .address');
        const phoneEl = section.querySelector('a[href^="tel"]');
        const mapEl = section.querySelector('a[href*="google.com/maps"]');

        if (nameEl && addrEl) {
          butiks.push({
            nama: nameEl.innerText.trim(),
            alamat: addrEl.innerText.trim(),
            telepon: phoneEl ? phoneEl.innerText.trim() : '-',
            maps: mapEl ? mapEl.href : '#'
          });
        }
      });
      return butiks.slice(0, 20); // pastikan maksimal 20
    });

    await browser.close();
    res.status(200).json(result);

  } catch (error) {
    if (browser) await browser.close();
    console.error(error);
    res.status(500).json({ error: "Scrape gagal", message: error.message });
  }
}