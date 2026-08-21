const fetch = require('node-fetch');

// Random IP generate karne ka function taaki IP ban ya rate limit bypass ho jaye
function getRandomIP() {
    const r = () => Math.floor(Math.random() * 254) + 1;
    return `${r()}.${r()}.${r()}.${r()}`;
}

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0"
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

        let play = req.query && req.query.play ? req.query.play : null;
        if (!play) {
            let urlPath = req.url || '';
            const matchId = urlPath.match(/\/play\/([a-zA-Z0-9]+)(\.m3u8)?/);
            if (matchId && matchId[1]) {
                play = matchId[1];
            }
        }

        if (!play) {
            return res.status(400).send("Error: Embed ID missing!");
        }

        play = play.split('|')[0].split('?')[0].replace('.m3u8', '').replace('.html', '').replace(/^\/+/, '').trim();
        
        const officialSite = "https://prmovies.directory/";
        const streamBase = "https://speedostream1.com/";
        const embedUrl = `${streamBase}embed-${play}.html`;
        const fakeIP = getRandomIP();

        const streamRes = await fetch(embedUrl, {
            headers: { 
                "Host": "speedostream1.com",
                "User-Agent": getRandomUserAgent(),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": officialSite,
                "Origin": "https://prmovies.directory",
                // Yeh headers speedostream ko batayenge ki request alag-alag jagah se aa rahi hai
                "X-Forwarded-For": fakeIP,
                "Client-IP": fakeIP,
                "Cookie": "file_id=53048; ref_url=" + encodeURIComponent(officialSite),
                "Sec-Fetch-Dest": "iframe",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "cross-site",
                "Upgrade-Insecure-Requests": "1"
            }
        });

        if (!streamRes.ok) {
            return res.status(403).send(`Blocked! Status: ${streamRes.status} | IP used: ${fakeIP}`);
        }

        const source = await streamRes.text();
        const m3u8Match = source.match(/file:\s*"([^"]+\.m3u8[^"]*)"/i) || source.match(/sources:\s*\[\s*\{\s*file:\s*"([^"]+)"/i);

        if (m3u8Match && m3u8Match[1]) {
            const videoUrl = m3u8Match[1];
            return res.redirect(302, videoUrl);
        }

        return res.status(404).send("Video stream link (.m3u8) not found!");

    } catch (err) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(500).send("ERROR: " + err.message);
    }
};
