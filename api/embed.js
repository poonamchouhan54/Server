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
        
        let play = req.query && req.query.play ? req.query.play : null;
        let searchQuery = req.query && req.query.q ? req.query.q.trim().toLowerCase() : '';
        
        if (!play) {
            let urlPath = req.url || '';
            const matchId = urlPath.match(/\/([a-zA-Z0-9]+)/);
            if (matchId && matchId[1]) {
                play = matchId[1];
            }
        }
        
        // --- PLAY MODE ---
        if (play) {
            play = play.split('|')[0].split('?')[0].replace('.m3u8', '').replace('.html', '').replace(/^\/+/, '').trim();
            
            const streamBase = await getLiveDomain(["https://speedostream1.com/", "https://speedostream.com/"]);
            const embedUrl = `${streamBase.replace(/\/$/, "")}/embed-${play}.html`;

            return res.redirect(302, embedUrl);
        }

        // --- LIST / SEARCH MODE ---
        const targetBaseUrl = 'https://bold-darkness-d959.poonamchouhan076.workers.dev/?site=https://prmovies.directory/';
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
                                // Ab yahan seedha Speedostream ka direct real embed link banega!
                                const playLink = `${cleanStreamBase}/embed-${embedId}.html`;
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
