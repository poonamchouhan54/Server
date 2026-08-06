const fetch = require('node-fetch');

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
];

module.exports = async (req, res) => {
    try {
        // ID extraction
        let embedId = req.query.id; 
        if (embedId && embedId.includes('.')) {
            embedId = embedId.split('.')[0];
        }

        // Referer aur Origin nikalna (agar URL mein diye gaye hain)
        const referer = req.query.referer || "https://streamoupload.xyz/";
        const origin = req.query.origin || "https://streamoupload.xyz";

        if (!embedId) return res.status(400).send("ID missing");
        
        const embedUrl = `https://streamoupload.xyz/embed-${embedId}.html`;

        const response = await fetch(embedUrl, {
            headers: {
                "User-Agent": USER_AGENTS[0],
                "Referer": referer,
                "Origin": origin
            }
        });
        
        const html = await response.text();
        let foundM3u8 = null;

        // Extraction logic
        let directMatch = html.match(/file:\s*"([^"]+\.m3u8[^"]*)"/i) || html.match(/https?:\/\/[^\s"'<>\n]+\.m3u8[^\s"'<>]*?/i);
        if (directMatch) {
            foundM3u8 = directMatch[1] || directMatch[0];
        } else {
            const packerMatch = html.match(/eval\(function\(p,a,c,k,e,d\)\{.*?\}\('(.*?)',\s*(\d+),\s*(\d+),\s*'(.*?)'\.split\('(.)'\)\)\)/s);
            if (packerMatch) {
                const p = packerMatch[1], a = parseInt(packerMatch[2]), c = parseInt(packerMatch[3]), k = packerMatch[4].split(packerMatch[5]);
                let unpackedText = p;
                for (let i = c - 1; i >= 0; i--) {
                    if (k[i]) unpackedText = unpackedText.replace(new RegExp('\\b' + i.toString(a) + '\\b', 'g'), k[i]);
                }
                let uMatch = unpackedText.match(/https?:\/\/[^\s"'<>\n]+\.m3u8[^\s"'<>]*?/i);
                if (uMatch) foundM3u8 = uMatch[0];
            }
        }

        if (foundM3u8) {
            // Player ke liye redirect
            return res.redirect(302, foundM3u8);
        } else {
            return res.status(404).send("Stream not found");
        }
    } catch (err) {
        return res.status(500).send(err.message);
    }
};
