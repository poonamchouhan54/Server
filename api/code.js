const fetch = require('node-fetch');

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
];

module.exports = async (req, res) => {
    try {
        // Poora URL ya path decode karo (taaki | ya %7C sahi se read ho sake)
        let fullUrl = decodeURIComponent(req.url);
        
        // URL ko '|' se split karte hain taaki ID aur parameters alag ho jayein
        let parts = fullUrl.split('|');
        let pathSegments = parts[0].split('/');
        let fileName = pathSegments[pathSegments.length - 1]; // "fie6rjl27cas.m3u8"
        let embedId = fileName.split('.')[0]; // "fie6rjl27cas"

        let referer = "https://watchomovies.monster/";
        let origin = "https://watchomovies.monster";

        // Agar pipe ke baad referer/origin diya gaya hai toh use parse karo
        if (parts.length > 1) {
            let params = new URLSearchParams(parts[1]);
            if (params.has('referer')) referer = params.get('referer');
            if (params.has('origin')) origin = params.get('origin');
        }

        if (!embedId) {
            return res.status(400).send("Embed ID is missing!");
        }
        
        const streamBase = "https://streamoupload.xyz/";
        const embedUrl = `${streamBase}embed-${embedId}.html`;

        const response = await fetch(embedUrl, {
            headers: {
                "Host": new URL(streamBase).host,
                "Connection": "keep-alive",
                "User-Agent": USER_AGENTS[0],
                "Referer": referer,
                "Origin": origin,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9"
            }
        });
        
        const html = await response.text();
        let foundM3u8 = null;

        // 1. Direct match check
        let directMatch = html.match(/file:\s*"([^"]+\.m3u8[^"]*)"/i) || html.match(/https?:\/\/[^\s"'<>\n]+\.m3u8[^\s"'<>]*?/i);
        if (directMatch) {
            foundM3u8 = directMatch[1] || directMatch[0];
        } else {
            // 2. Unpack Packer script
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
            return res.redirect(302, foundM3u8);
        } else {
            return res.status(404).send(`Stream not found for ID: ${embedId}`);
        }

    } catch (err) {
        return res.status(500).send(err.toString());
    }
};
