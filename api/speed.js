const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 10000;

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15"
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function getLiveDomain(testUrls) {
    for (let url of testUrls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(url, { 
                method: 'HEAD',
                headers: { "User-Agent": getRandomUserAgent() },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) return new URL(res.url).origin + "/";
        } catch (e) {}
    }
    return testUrls[0];
}

// --- 1. PLAY / STREAM ROUTE (Jab koi movie play karega) ---
app.get('/play/:id', async (req, res) => {
    try {
        let playId = req.params.id.replace('.m3u8', '').replace('.html', '');
        const officialSite = await getLiveDomain(["https://prmovies.locker/", "https://yomovies.foundation/"]);
        const streamBase = await getLiveDomain(["https://speedostream1.com/", "https://speedostream.com/"]);
        const embedUrl = `${streamBase.replace(/\/$/, "")}/embed-${playId}.html`;
        const cleanOrigin = officialSite.replace(/\/$/, "");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const streamRes = await fetch(embedUrl, {
            headers: { 
                "Host": new URL(streamBase).host,
                "Connection": "keep-alive",
                "Cache-Control": "max-age=0",
                "User-Agent": getRandomUserAgent(),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Referer": officialSite,
                "Origin": cleanOrigin,
                "Accept-Language": "en-US,en;q=0.9"
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!streamRes.ok) {
            return res.status(404).send("Stream source not reachable");
        }

        const source = await streamRes.text();
        
        // HTML ke andar se master.m3u8 link nikalna
        const match = source.match(/file:\s*["'](https?:\/\/[^"']+\/master\.m3u8[^"']*)["']/i) || 
                      source.match(/(https?:\/\/[^"']+\/master\.m3u8[^\s"']*)/i);

        if (match && match[1]) {
            const finalM3u8 = match[1].replace(/\\/g, '');
            return res.redirect(302, finalM3u8);
        }

        return res.status(404).send("Master M3U8 Link not found inside embed source");

    } catch (err) {
        return res.status(500).send("Error: " + err.message);
    }
});

// --- 2. MAIN M3U / JSON LIST ROUTE ---
app.get('/', async (req, res) => {
  const originalJsonUrl = "https://black-sea-7b13.poonamchouhan076.workers.dev/";
  let hostHeader = (req.headers && req.headers.host) ? req.headers.host : 'localhost';
  const host = `https://${hostHeader}`;

  try {
    const response = await fetch(originalJsonUrl, {
        headers: { "User-Agent": getRandomUserAgent() }
    });
    const jsonData = await response.json();

    if (!jsonData.data || !Array.isArray(jsonData.data)) {
      return res.status(400).json({ error: "Invalid JSON structure" });
    }

    const movies = jsonData.data;
    const batchSize = 10; 
    let updatedData = [];

    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize);
      
      const batchResult = await Promise.all(
        batch.map(async (movie) => {
          try {
            if (!movie.href) return movie;

            const pageRes = await fetch(movie.href, {
                headers: { "User-Agent": getRandomUserAgent() }
            });
            const htmlText = await pageRes.text();

            let targetEmbedId = null;
            const iframeMatches = [...htmlText.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)];
            
            if (iframeMatches.length > 0) {
              let selectedIframeUrl = iframeMatches[0][1];

              if (htmlText.includes("HD 1080p")) {
                const match1080Tab = htmlText.match(/href=["'](#[^"']+)["'][^>]*>\s*HD 1080p/i);
                if (match1080Tab) {
                  const tabId = match1080Tab[1];
                  const tabDivRegex = new RegExp(`<div[^>]+id=["']${tabId.replace('#', '')}["'][^>]*>([\\s\\S]*?)<\/div>`, 'i');
                  const tabDivMatch = htmlText.match(tabDivRegex);
                  if (tabDivMatch) {
                    const iframeInTab = tabDivMatch[1].match(/src=["']([^"']+)["']/i);
                    if (iframeInTab) selectedIframeUrl = iframeInTab[1];
                  }
                }
              } else if (htmlText.includes("HD 720p")) {
                const match720Tab = htmlText.match(/href=["'](#[^"']+)["'][^>]*>\s*HD 720p/i);
                if (match720Tab) {
                  const tabId = match720Tab[1];
                  const tabDivRegex = new RegExp(`<div[^>]+id=["']${tabId.replace('#', '')}["'][^>]*>([\\s\\S]*?)<\/div>`, 'i');
                  const tabDivMatch = htmlText.match(tabDivRegex);
                  if (tabDivMatch) {
                    const iframeInTab = tabDivMatch[1].match(/src=["']([^"']+)["']/i);
                    if (iframeInTab) selectedIframeUrl = iframeInTab[1];
                  }
                }
              }

              const idMatch = selectedIframeUrl.match(/(?:embed-)?([a-zA-Z0-9]+)\.html/i);
              if (idMatch && idMatch[1]) {
                targetEmbedId = idMatch[1];
              }
            }

            let finalHref = movie.href;
            if (targetEmbedId) {
              // Yahan humne apne server ka play link set kar diya hai
              finalHref = `${host}/play/${targetEmbedId}.m3u8`; 
            }

            return {
              ...movie,
              href: finalHref
            };

          } catch (err) {
            return movie;
          }
        })
      );

      updatedData.push(...batchResult);
    }

    const finalResult = {
      status: jsonData.status || "success",
      total: updatedData.length,
      data: updatedData
    };

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.json(finalResult);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
