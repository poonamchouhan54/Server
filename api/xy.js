const fetch = require('node-fetch');

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0"
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
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
        
        let searchQuery = req.query && req.query.q ? req.query.q.trim().toLowerCase() : '';
        
        // Read raw URL directly to preserve IPTV pipe headers without query parser truncation
        let rawPlay = req.url || '';
        if (req.query && req.query.play && !rawPlay.includes('Referer=')) {
            rawPlay = req.query.play;
        }

        if (!rawPlay || rawPlay === '/' || rawPlay === '') {
            let urlPath = req.url || '';
            const matchId = urlPath.match(/\/([a-zA-Z0-9]+)\.m3u8/);
            if (matchId && matchId[1]) {
                rawPlay = matchId[1];
            }
        }
        
        // --- PLAY MODE ---
        if (rawPlay && (rawPlay.includes('.m3u8') || rawPlay.includes('embed-') || rawPlay.length < 50)) {
            let playId = rawPlay.split('|')[0].split('?')[0].replace('.m3u8', '').replace('.html', '').replace(/^\/+/, '').trim();
            
            let customReferer = "";
            if (rawPlay.includes('Referer=')) {
                const refMatch = rawPlay.match(/Referer=([^&]+)/i);
                if (refMatch && refMatch[1]) {
                    customReferer = decodeURIComponent(refMatch[1].trim());
                }
            }

            const officialSite = "https://prmovies.locker/";
            let targetDomain = customReferer ? new URL(customReferer).origin + "/" : "https://streamoupload.xyz/";
            let embedUrl = `${targetDomain.replace(/\/$/, "")}/embed-${playId}.html`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const streamRes = await fetch(embedUrl, {
                headers: { 
                    "Host": new URL(targetDomain).host,
                    "User-Agent": getRandomUserAgent(),
                    "Referer": customReferer || officialSite,
                    "Origin": customReferer ? new URL(customReferer).origin : officialSite.replace(/\/$/, ""),
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!streamRes.ok) {
                return res.status(403).send(`Blocked or Forbidden! Server status: ${streamRes.status} | URL: ${embedUrl}`);
            }

            const source = await streamRes.text();

            // Agar domain streamoupload.xyz hai, toh seedha view source (HTML) dikhao
            if (targetDomain.includes("streamoupload.xyz")) {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.status(200).send(source);
            }

            // Speedo domains ke liye purana .m3u8 redirect logic
            const m3u8Match = source.match(/file:\s*"([^"]+\.m3u8[^"]*)"/i);
            if (m3u8Match && m3u8Match[1]) {
                const videoUrl = m3u8Match[1];
                return res.redirect(302, videoUrl);
            }

            return res.status(404).send("Video stream link (.m3u8) not found in the source!");
        }

        // --- LIST / SEARCH MODE ---
        const targetBaseUrl = 'https://bold-darkness-d959.poonamchouhan076.workers.dev/?site=https://watchomovies.monster/';
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
                            const iframeSrc = iframeMatch[1];
                            const idMatch = iframeSrc.match(/embed-([a-zA-Z0-9]+)\.html/i);
                            
                            if (idMatch && idMatch[1]) {
                                const embedId = idMatch[1];
                                
                                let itemOrigin = "";
                                try {
                                    const parsedIframe = new URL(iframeSrc);
                                    itemOrigin = parsedIframe.origin;
                                } catch (e) {
                                    itemOrigin = "https://streamoupload.xyz";
                                }

                                const headersuffix = `|Referer=${itemOrigin}/&Origin=${itemOrigin}`;
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
