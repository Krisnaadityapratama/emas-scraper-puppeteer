import axios from "axios";
import * as cheerio from "cheerio";

let cache = null;
let lastFetch = 0;

const CACHE_DURATION = 5 * 60 * 1000; // 5 menit

export default async function handler(req, res) {
  try {
    // ✅ CACHE (WAJIB untuk hindari blok)
    if (cache && Date.now() - lastFetch < CACHE_DURATION) {
      return res.status(200).json({
        source: "cache",
        ...cache
      });
    }

    const url = "https://www.logammulia.com/id/harga-emas-hari-ini";

    const response = await axios.get(url, {
      headers: {
        "User-Agent": getUA(),
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);

    let data = [];

    // ⚠️ SELECTOR HARUS DISESUAIKAN JIKA BERUBAH
    $("table tbody tr").each((i, el) => {
      const cols = $(el).find("td");

      const berat = $(cols[0]).text().trim();
      const harga = $(cols[1]).text().trim();

      if (berat && harga) {
        data.push({ berat, harga });
      }
    });

    const result = {
      success: true,
      updated: new Date(),
      data
    };

    cache = result;
    lastFetch = Date.now();

    res.status(200).json(result);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// 🔁 Random User Agent
function getUA() {
  const list = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Mozilla/5.0 (Macintosh)",
    "Mozilla/5.0 (X11; Linux x86_64)"
  ];
  return list[Math.floor(Math.random() * list.length)];
}