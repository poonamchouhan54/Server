const fetch = require('node-fetch');

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
];

module.exports = async (req, res) => {
    try {
        let fullUrl = decodeURIComponent(req.url);
        let parts = fullUrl.split('|');
        let pathSegments = parts[0].split('/');
        let fileName = pathSegments[pathSegments.length - 1]; 
        let embedId = fileName.split('.')[0]; 

        // Hamesha official site ko referer rakhein taaki stream block na ho
        let referer = "https://watchomovies.monster/";
        let origin = "https://watchomovies.monster";

        if (!embedId) {
            return res.status(400).send("Embed ID is missing!");
        }
        
        const streamBase = "https://streamoupload.xyz/";
        const embedUrl = `${streamBase}embed-${embedId}.html`;

        let debugLog = [];
        debugLog.push(`Fetching embed URL: ${embedUrl}`);

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
        debugLog.push(`Response Status: ${response.status}`);
        debugLog.push(`HTML Length: ${html.length}`);

        let foundM3u8 = null;
        let unpackedText = "";

        // 1. Direct match check
        let directMatch = html.match(/file:\s*"([^"]+\.m3u8[^"]*)"/i) || html.match(/https?:\/\/[^\s"'<>\n]+\.m3u8[^\s"'<>]*?/i);
        if (directMatch) {
            foundM3u8 = directMatch[1] || directMatch[0];
            debugLog.push(`Direct m3u8 found: ${foundM3u8}`);
        } else {
            // 2. Unpack Packer script
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
                    debugLog.push(`m3u8 found from unpacked code: ${foundM3u8}`);
                }
            }
        }

        // 3. Fallback poster image hash extraction
        if (!foundM3u8) {
            const posterMatch = html.match(/https?:\/\/pnam\.streamoupload\.xyz\/i\/[^\s"']+\/([a-z0-9]+)\.jpg/i);
            if (posterMatch && posterMatch[1]) {
                foundM3u8 = `https://pnam.streamoupload.xyz/hls/${posterMatch[1]}/master.m3u8`;
                debugLog.push(`Fallback hash found: ${foundM3u8}`);
            }
        }

        if (foundM3u8) {
            return res.redirect(302, foundM3u8);
        } else {
            // Agar link na mile toh HTML debug page dikhayein taaki pata chale issue kya hai
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            let output = `<h3 style="color:red;">Stream not found for ID: ${embedId}</h3>`;
            output += `<h4>Debug Logs:</h4><ul>${debugLog.map(l => `<li>${l}</li>`).join('')}</ul>`;
            if (unpackedText) output += `<h4>Unpacked Preview:</h4><textarea style="width:100%;height:150px;">${unpackedText}</textarea>`;
            output += `<h4>Raw HTML:</h4><textarea style="width:100%;height:200px;">${html}</textarea>`;
            return res.status(404).send(output);
        }

    } catch (err) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(500).send(`<h3 style="color:red;">Error:</h3><pre>${err.stack}</pre>`);
    }
};
