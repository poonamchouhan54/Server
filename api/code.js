const fetch = require('node-fetch');

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
];

module.exports = async (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        
        const embedId = "nu48w0ddgwrw"; 
        const streamBase = "https://streamoupload.xyz/";
        const embedUrl = `${streamBase}embed-${embedId}.html`;
        const officialSite = "https://watchomovies.monster/";

        let output = `<h2>StreamUpload Debugger & Extractor</h2>`;
        output += `<p><b>Fetching URL:</b> ${embedUrl}</p>`;

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

        output += `<p><b>Response Status:</b> ${response.status} ${response.statusText}</p>`;
        
        const html = await response.text();
        output += `<p><b>HTML Total Length:</b> ${html.length} characters</p>`;

        let foundM3u8 = null;
        let debugLog = [];
        let unpackedText = "";

        // 1. Direct match check
        let directMatch = html.match(/file:\s*"([^"]+\.m3u8[^"]*)"/i) || html.match(/https?:\/\/[^\s"'<>\n]+\.m3u8[^\s"'<>]*?/i);
        if (directMatch) {
            foundM3u8 = directMatch[1] || directMatch[0];
            debugLog.push(`<p style="color:green;">[✔] Direct m3u8 found: <code>${foundM3u8}</code></p>`);
        } else {
            debugLog.push(`<p style="color:orange;">[!] Direct m3u8 not found in raw HTML. Trying Packer unpacking...</p>`);
        }

        // 2. Unpack Dean Edward's Packer script
        const packerMatch = html.match(/eval\(function\(p,a,c,k,e,d\)\{.*?\}\('(.*?)',\s*(\d+),\s*(\d+),\s*'(.*?)'\.split\('(.)'\)\)\)/s);
        if (packerMatch) {
            debugLog.push(`<p style="color:green;">[✔] Packer script detected successfully!</p>`);
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
                debugLog.push(`<p style="color:green; font-weight:bold;">[✔] Success! m3u8 extracted from unpacked code: <code>${foundM3u8}</code></p>`);
            } else {
                debugLog.push(`<p style="color:red;">[✘] m3u8 pattern not found inside unpacked code.</p>`);
            }
        } else {
            debugLog.push(`<p style="color:red;">[✘] Packer script pattern not matched.</p>`);
        }

        // 3. Fallback poster image hash extraction
        const posterMatch = html.match(/https?:\/\/pnam\.streamoupload\.xyz\/i\/[^\s"']+\/([a-z0-9]+)\.jpg/i);
        if (posterMatch && posterMatch[1]) {
            const fallbackUrl = `https://pnam.streamoupload.xyz/hls/${posterMatch[1]}/master.m3u8`;
            debugLog.push(`<p style="color:blue;">[i] Poster Hash Found: <b>${posterMatch[1]}</b> -> Fallback Link: <code>${fallbackUrl}</code></p>`);
            if (!foundM3u8) {
                foundM3u8 = fallbackUrl;
            }
        }

        // Display Final Result Box
        if (foundM3u8) {
            output += `<div style="background:#032f03; border:2px solid green; padding:15px; margin:15px 0;">`;
            output += `<h3 style="color:#7ef87e; margin-top:0;">Final Extracted .m3u8 Stream Link:</h3>`;
            output += `<input type="text" value="${foundM3u8}" style="width:100%; padding:10px; font-size:16px; background:#000; color:#0f0; border:1px solid #444;" readonly />`;
            output += `</div>`;
        } else {
            output += `<div style="background:#320303; border:2px solid red; padding:15px; margin:15px 0;">`;
            output += `<h3 style="color:#f87e7e; margin-top:0;">Failed to extract m3u8 automatically!</h3>`;
            output += `</div>`;
        }

        output += `<h3>Extraction Steps Log:</h3><ul>`;
        debugLog.forEach(log => output += `<li>${log}</li>`);
        output += `</ul>`;

        if (unpackedText) {
            output += `<h3>Unpacked Script Preview:</h3>`;
            output += `<textarea style="width:100%; height:200px; background:#111; color:#0f0; padding:10px; font-family:monospace;">${unpackedText}</textarea>`;
        }

        output += `<h3>Raw HTML Source Code:</h3>`;
        output += `<textarea style="width:100%; height:300px; background:#111; color:#ff0; padding:10px; font-family:monospace;">${html}</textarea>`;

        return res.status(200).send(output);

    } catch (err) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`<h3 style="color:red;">Error:</h3><pre>${err.stack}</pre>`);
    }
};
