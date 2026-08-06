const fetch = require('node-fetch');

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0"
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

module.exports = async (req, res) => {
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        let hostHeader = (req.headers && req.headers.host) ? req.headers.host : 'localhost';
        const host = `https://${hostHeader}`;
        
        // TargetBaseUrl aur officialSite ko yahan upar define kar diya hai
        const targetBaseUrl = 'https://bold-darkness-d959.poonamchouhan076.workers.dev/?site=https://watchomovies.monster/';
        const officialSite = new URL(targetBaseUrl).searchParams.get('site');
        
        let play = req.query && req.query.play ? req.query.play : null;
        let searchQuery = req.query && req.query.q ? req.query.q.trim().toLowerCase() : '';
        
        if (!play) {
            let urlPath = req.url || '';
            const matchId = urlPath.match(/\/([a-zA-Z0-9]+)\.m3u8/);
            if (matchId && matchId[1]) {
                play = matchId[1];
            }
        }
        
        // --- PLAY MODE (Extracts .m3u8 and redirects) ---
        if (play) {
            play = play.split('|')[0].split('?')[0].replace('.m3u8', '').replace('.html', '').replace(/^\/+/, '').trim();
            
            const streamBase = await getLiveDomain(["https://speedostream1.com/", "https://speedostream.com/"]);
            const embedUrl = `${streamBase.replace(/\/$/, "")}/embed-${play}.html`;
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
                    "Sec-Fetch-Dest": "iframe",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "cross-site",
                    "Accept-Language": "en-US,en;q=0.9"
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!streamRes.ok) {
                return res.status(403).send(`Blocked or Forbidden! Server status: ${streamRes.status} | URL: ${embedUrl}`);
            }

            const source = await streamRes.text();
            
            // Regex se .m3u8 direct video stream link extract karein
            const m3u8Match = source.match(/file:\s*"([^"]+\.m3u8[^"]*)"/i);

            if (m3u8Match && m3u8Match[1]) {
                const videoUrl = m3u8Match[1];
                return res.redirect(302, videoUrl);
            }

            return res.status(404).send("Video stream link (.m3u8) not found in the source!");
        }

        // --- LIST / SEARCH MODE ---
        let targetUrl = targetBaseUrl;
        if (searchQuery) {
            targetUrl = `${targetBaseUrl}?s=${encodeURIComponent(searchQuery)}`;
        }

        const htmlRes = await fetch(targetUrl, {
            headers: { "User-Agent": getRandomUserAgent() }
        });

        if (!htmlRes.ok) {
            throw new Error(`Target worker returned status ${htmlRes.status}`);
        }

        const htmlContent = await htmlRes.text();
        const streamBaseLive = await getLiveDomain(["https://speedostream1.com/", "https://speedostream.com/"]);
        const cleanStreamBase = streamBaseLive.replace(/\/$/, "");
        const headersuffix = `|Referer=${cleanStreamBase}/&Origin=${cleanStreamBase}`;
        let playlist = "#EXTM3U\n";

        const mlItems = htmlContent.split('class="ml-item"');

        for (let index = 0; index < mlItems.length; index++) {
            if (index === 0) continue;
            const item = mlItems[index];

            const hrefMatch = item.match(/<a\s+href="([^"]+)"/);
            const imgMatch = item.match(/data-original="([^"]+)"/);
            const titleMatch = item.match(/<h2>([\s\S]*?)<\/h2>/);

            if (titleMatch && hrefMatch) {
                const title = titleMatch[1].trim();
                const movieHref = hrefMatch[1];

                if (searchQuery && !title.toLowerCase().includes(searchQuery)) {
                    continue;
                }

                try {
                    const detailRes = await fetch(movieHref, {
                        headers: { "User-Agent": getRandomUserAgent() }
                    });
                    if (detailRes.ok) {
                        const detailHtml = await detailRes.text();
                        const iframeMatch = detailHtml.match(/<iframe[^>]+src="([^"]+)"/i);
                        if (iframeMatch && iframeMatch[1]) {
                            const idMatch = iframeMatch[1].match(/embed-([a-zA-Z0-9]+)\.html/i);
                            if (idMatch && idMatch[1]) {
                                const embedId = idMatch[1];
                                // Player ke liye link ab direct .m3u8 format mein banega
                                const playLink = `${host}/${embedId}.m3u8${headersuffix}`;
                                const logo = imgMatch ? imgMatch[1] : '';
                                playlist += `#EXTINF:-1 tvg-logo="${logo}" group-title="✨New Movies",${title}\n${playLink}\n`;
                            }
                        }
                    }
                } catch (err) {}
            }
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(playlist);

    } catch (err) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send("#EXTM3U\n#ERROR: " + err.message);
    }
};
