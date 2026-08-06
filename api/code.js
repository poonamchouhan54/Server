const fetch = require('node-fetch');

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
];

module.exports = async (req, res) => {
    try {
        // Embed ID ko request query ya URL path se dynamic lene ke liye
        // Jaise: /api/code?id=ujv780sfjdb9 ya agar aap path use kar rahe ho toh us hisab se adjust karein
        const embedId = req.query.id || req.query.embedId || "nu48w0ddgwrw"; 
        
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
        
        const html = await response.text();

        let foundM3u8 = null;
        let unpackedText = "";

        // 1. Direct match check
        let directMatch = html.match(/file:\s*"([^"]+\.m3u8[^"]*)"/i) || html.match(/https?:\/\/[^\s"'<>\n]+\.m3u8[^\s"'<>]*?/i);
        if (directMatch) {
            foundM3u8 = directMatch[1] || directMatch[0];
        } else {
            // 2. Unpack Dean Edward's Packer script
            const packerMatch = html.match(/eval\(function\(p,a,c,k,e,d\)\{.*?\}\('(.*?)',\s*(\d+),\s*(\d+),\s*'(.*?)'\.split\('(.)'\)\)\)/s);
            if (packerMatch) {
                const p = packerMatch[1];
                const a = parseInt(packerMatch[2]);
                let c = parseInt(packerMatch[3]);
                const k = packerMatch[4].split(packerMatch[5]);
                
                unpackedText = p;
                while (c--) {
                    if (k[c]) {
                        const regex = new RegExp('\\b' + c.toString(a) + '\\b', 'g');
                        unpackedText = unpackedText.replace(regex, k[c]);
                    }
                }

                let unpackedMatch = unpackedText.match(/https?:\/\/[^\s"'<>\n]+\.m3u8[^\s"'<>]*?/i) || unpackedText.match(/file:\s*"([^"]+\.m3u8[^"]*)"/i);
                if (unpackedMatch) {
                    foundM3u8 = unpackedMatch[1] || unpackedMatch[0];
                }
            }
        }

        // 3. Fallback poster image hash extraction agar pehle na mile
        if (!foundM3u8) {
            const posterMatch = html.match(/https?:\/\/pnam\.streamoupload\.xyz\/i\/[^\s"']+\/([a-z0-9]+)\.jpg/i);
            if (posterMatch && posterMatch[1]) {
                foundM3u8 = `https://pnam.streamoupload.xyz/hls/${posterMatch[1]}/master.m3u8`;
            }
        }

        // Agar m3u8 link mil jaye toh direct redirect kar do
        if (foundM3u8) {
            return res.redirect(302, foundM3u8);
        } else {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.status(404).send(`<h3 style="color:red;">Error: m3u8 stream link not found for ID: ${embedId}</h3>`);
        }

    } catch (err) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(500).send(`<h3 style="color:red;">Error:</h3><pre>${err.stack}</pre>`);
    }
};
