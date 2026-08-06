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

        let output = `<h2>StreamUpload Debugger</h2>`;
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

        // Check karo ki .m3u8 hai ya nahi
        if (html.includes('.m3u8')) {
            output += `<p style="color:green; font-weight:bold;">[✔] Success: '.m3u8' keyword HTML ke andar mil gaya!</p>`;
            
            const regex = new RegExp(`[^"']*?\\.m3u8[^"']*?`, 'g');
            const matches = html.match(regex);
            
            if (matches) {
                output += `<h3>Found Patterns:</h3><ul>`;
                matches.forEach((m) => output += `<li><code>${m}</code></li>`);
                output += `</ul>`;
            }
        } else {
            output += `<p style="color:red; font-weight:bold;">[✘] Warning: '.m3u8' direct nahi mila. Neeche poora HTML source code hai, check kar le kahan link hai:</p>`;
            output += `<textarea style="width:100%; height:400px; background:#111; color:#0f0; padding:10px; font-family:monospace;">${html}</textarea>`;
        }

        return res.status(200).send(output);

    } catch (err) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`<h3 style="color:red;">Error:</h3><pre>${err.stack}</pre>`);
    }
};
