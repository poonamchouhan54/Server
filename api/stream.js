const fetch = require('node-fetch');

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

        // Real browser ki tarah headers bhejna taaki block na kare
        const streamRes = await fetch(embedUrl, {
            headers: { 
                "Host": "speedostream1.com",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Referer": officialSite,
                "Origin": "https://prmovies.directory",
                "Cookie": "file_id=53048; ref_url=" + encodeURIComponent(officialSite),
                "Sec-Ch-Ua": '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Fetch-Dest": "iframe",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "cross-site",
                "Upgrade-Insecure-Requests": "1"
            }
        });

        if (!streamRes.ok) {
            return res.status(403).send(`Speedostream Blocked Request! Status: ${streamRes.status}`);
        }

        const source = await streamRes.text();
        const m3u8Match = source.match(/file:\s*"([^"]+\.m3u8[^"]*)"/i) || source.match(/sources:\s*\[\s*\{\s*file:\s*"([^"]+)"/i);

        if (m3u8Match && m3u8Match[1]) {
            const videoUrl = m3u8Match[1];
            return res.redirect(302, videoUrl);
        }

        return res.status(404).send("Video stream link (.m3u8) not found in source!");

    } catch (err) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(500).send("ERROR: " + err.message);
    }
};
