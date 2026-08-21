const fetch = require('node-fetch');

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0"
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
        if (!play) {
            let urlPath = req.url || '';
            const matchId = urlPath.match(/\/([a-zA-Z0-9]+)\.m3u8/);
            if (matchId && matchId[1]) {
                play = matchId[1];
            }
        }

        if (!play) {
            return res.status(400).send("Error: Embed ID missing!");
        }

        play = play.split('|')[0].split('?')[0].replace('.m3u8', '').replace('.html', '').replace(/^\/+/, '').trim();
        
        const officialSite = "https://prmovies.directory/";
        const streamBase = await getLiveDomain(["https://speedostream1.com/", "https://speedostream.com/"]);
        const embedUrl = `${streamBase.replace(/\/$/, "")}/embed-${play}.html`;
        const cleanOrigin = officialSite.replace(/\/$/, "");
        const streamHost = new URL(streamBase).host;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const streamRes = await fetch(embedUrl, {
            headers: { 
                "Host": streamHost,
                "User-Agent": getRandomUserAgent(),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": officialSite,
                "Origin": cleanOrigin,
                "Sec-Fetch-Dest": "iframe",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "cross-site",
                "Upgrade-Insecure-Requests": "1"
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!streamRes.ok) {
            return res.status(403).send(`Blocked or Forbidden! Server status: ${streamRes.status} | URL: ${embedUrl}`);
        }

        const source = await streamRes.text();
        const m3u8Match = source.match(/file:\s*"([^"]+\.m3u8[^"]*)"/i) || source.match(/sources:\s*\[\s*\{\s*file:\s*"([^"]+)"/i);

        if (m3u8Match && m3u8Match[1]) {
            const videoUrl = m3u8Match[1];
            return res.redirect(302, videoUrl);
        }

        return res.status(404).send("Video stream link (.m3u8) not found in the source!");

    } cmirror (err) {
    } catch (err) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(500).send("ERROR: " + err.message);
    }
};
