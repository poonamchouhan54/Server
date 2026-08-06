const fetch = require('node-fetch');

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
];

module.exports = async (req, res) => {
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // Dynamic ID capture from URL path (e.g. /ujv780sfjdb9.m3u8) or query param
        let play = null;
        if (req.query && req.query.play) {
            play = req.query.play;
        } else if (req.url) {
            const matchId = req.url.match(/\/([a-zA-Z0-9]+)\.m3u8/);
            if (matchId && matchId[1]) {
                play = matchId[1];
            }
        }

        if (!play) {
            return res.status(400).send("Error: Please provide ID in path like /ujv780sfjdb9.m3u8");
        }

        const embedId = play.split('|')[0].split('?')[0].replace('.m3u8', '').replace('.html', '').replace(/^\/+/, '').trim();
        const streamBase = "https://streamoupload.xyz/";
        const embedUrl = `${streamBase}embed-${embedId}.html`;
        const officialSite = "https://watchomovies.monster/";

        const response = await fetch(embedUrl, {
            headers: {
                "Host": new URL(streamBase).host,
                "Connection": "keep-alive",
                "User-Agent": USER_AGENTS[0],
                "Referer": officialSite,
                "Origin": officialSite.replace(/\/$/, ""),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9"
            }
        });

        if (!response.ok) {
            return res.status(404).send("Embed page not found!");
        }

        const html = await response.text();
        let foundM3u8 = null;

        // 1. Direct match check
        let directMatch = html.match(/file:\s*"([^"]+\.m3u8[^"]*)"/i) || html.match(/https?:\/\/[^\s"'<>\n]+\.m3u8[^\s"'<>]*?/i);
        if (directMatch) {
            foundM3u8 = directMatch[1] || directMatch[0];
        }

        // 2. Unpack Dean Edward's Packer script
        if (!foundM3u8) {
            const packerMatch = html.match(/eval\(function\(p,a,c,k,e,d\)\{.*?\}\('(.*?)',\s*(\d+),\s*(\d+),\s*'(.*?)'\.split\('(.)'\)\)\)/s);
            if (packerMatch) {
                const p = packerMatch[1];
                const a = parseInt(packerMatch[2]);
                let c = parseInt(packerMatch[3]);
                const k = packerMatch[4].split(packerMatch[5]);
                
                let unpackedText = p;
                while (c--) {
                    if (k[c]) {
                        const regex = new RegExp('\\b' + c.toString(a) + '\\b', 'g');
                        unpackedText = unpackedText.replace(regex, k[c]);
                    }
                }

                let unpackedMatch = unpackedText.match(/https?:\/\/[^\s"'<>\n]+\.m3u8[^\s"'<>]*?/i) || unpackedMatch.match(/file:\s*"([^"]+\.m3u8[^"]*)"/i);
                if (unpackedMatch) {
                    foundM3u8 = unpackedMatch[1] || unpackedMatch[0];
                }
            }
        }

        // 3. Fallback poster image hash extraction
        if (!foundM3u8) {
            const posterMatch = html.match(/https?:\/\/pnam\.streamoupload\.xyz\/i\/[^\s"']+\/([a-z0-9]+)\.jpg/i);
            if (posterMatch && posterMatch[1]) {
                foundM3u8 = `https://pnam.streamoupload.xyz/hls/${posterMatch[1]}/master.m3u8`;
            }
        }

        if (foundM3u8) {
            let finalUrl = foundM3u8.replace(/["']/g, '').trim();
            return res.redirect(302, finalUrl);
        }

        return res.status(404).send("Video stream link (.m3u8) not found in the source!");

    } catch (err) {
        return res.status(500).send("Error: " + err.message);
    }
};
