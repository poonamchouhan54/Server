const fetch = require('node-fetch');

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

module.exports = async (req, res) => {
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        let play = req.query && req.query.play ? req.query.play : null;
        let provider = req.query && req.query.provider ? req.query.provider : '';
        
        if (!play) {
            let urlPath = req.url || '';
            const matchId = urlPath.match(/\/([a-zA-Z0-9]+)\.m3u8/);
            if (matchId && matchId[1]) {
                play = matchId[1];
            }
        }

        if (!play) {
            return res.status(400).send("Error: Play ID not provided!");
        }

        play = play.split('|')[0].split('?')[0].replace('.m3u8', '').replace('.html', '').replace(/^\/+/, '').trim();
        const officialSite = "https://watchomovies.monster/";

        // --- Streamoupload Extractor ---
        async function fetchStreamoupload() {
            try {
                const streamBase = await getLiveDomain(["https://streamoupload.xyz/"]);
                const embedUrl = `${streamBase.replace(/\/$/, "")}/embed-${play}.html`;
                const cleanOrigin = officialSite.replace(/\/$/, "");

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);

                const streamRes = await fetch(embedUrl, {
                    headers: { 
                        "Host": new URL(streamBase).host,
                        "Connection": "keep-alive",
                        "User-Agent": getRandomUserAgent(),
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                        "Referer": officialSite,
                        "Origin": cleanOrigin
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (streamRes.ok) {
                    const source = await streamRes.text();
                    
                    // 1. Direct regex search for m3u8
                    let m3u8Match = source.match(/https?:\/\/[^\s"'<>\n]+\.m3u8[^\s"'<>]*?/i);
                    if (m3u8Match) return m3u8Match[0];

                    // 2. Packer unpacking logic
                    const packerMatch = source.match(/eval\(function\(p,a,c,k,e,d\)\{.*?\}\('(.*?)',\s*(\d+),\s*(\d+),\s*'(.*?)'\.split\('(.)'\)\)\)/s);
                    if (packerMatch) {
                        const p = packerMatch[1];
                        const a = parseInt(packerMatch[2]);
                        let c = parseInt(packerMatch[3]);
                        const k = packerMatch[4].split(packerMatch[5]);
                        
                        let unpacked = p;
                        while (c--) {
                            if (k[c]) {
                                const regex = new RegExp('\\b' + c.toString(a) + '\\b', 'g');
                                unpacked = unpacked.replace(regex, k[c]);
                            }
                        }

                        const unpackedMatch = unpacked.match(/https?:\/\/[^\s"'<>\n]+\.m3u8[^\s"'<>]*?/i);
                        if (unpackedMatch) return unpackedMatch[0];
                    }
                }
            } catch (e) {}
            return null;
        }

        // --- Speedostream Extractor ---
        async function fetchSpeedostream() {
            try {
                const streamBase = await getLiveDomain(["https://speedostream1.com/", "https://speedostream.com/"]);
                const embedUrl = `${streamBase.replace(/\/$/, "")}/embed-${play}.html`;
                const cleanOrigin = officialSite.replace(/\/$/, "");

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);

                const streamRes = await fetch(embedUrl, {
                    headers: { 
                        "Host": new URL(streamBase).host,
                        "Connection": "keep-alive",
                        "User-Agent": getRandomUserAgent(),
                        "Referer": officialSite,
                        "Origin": cleanOrigin
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (streamRes.ok) {
                    const source = await streamRes.text();
                    const m3u8Match = source.match(/file:\s*"([^"]+\.m3u8[^"]*)"/i);
                    if (m3u8Match && m3u8Match[1]) return m3u8Match[1];
                }
            } catch (e) {}
            return null;
        }

        let videoUrl = null;
        if (provider === 'streamoupload') {
            videoUrl = await fetchStreamoupload();
        } else {
            videoUrl = await fetchSpeedostream();
            if (!videoUrl) {
                videoUrl = await fetchStreamoupload();
            }
        }

        if (videoUrl) {
            return res.redirect(302, videoUrl);
        }

        return res.status(404).send("Video stream link (.m3u8) not found in the source!");

    } catch (err) {
        return res.status(500).send("Error: " + err.message);
    }
};
