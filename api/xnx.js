const fetch = require('node-fetch');

const USER_AGENTS = [
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
"Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0"
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
      
    let hostHeader = (req.headers && req.headers.host) ? req.headers.host : 'localhost';  
    const host = `https://${hostHeader}`;  
      
    let play = req.query && req.query.play ? req.query.play : null;  
    let searchQuery = req.query && req.query.q ? req.query.q.trim().toLowerCase() : '';  
      
    if (!play) {  
        let urlPath = req.url || '';  
        const matchId = urlPath.match(/\/([a-zA-Z0-9]+)\.m3u8/);  
        if (matchId && matchId[1]) {  
            play = matchId[1];  
        }  
    }  
      
    // --- PLAY MODE (Extracts .m3u8 and redirects) ---  
    if (play) {  
        play = play.split('|')[0].split('?')[0].replace('.m3u8', '').replace('.html', '').replace(/^\/+/, '').trim();  
          const forceDomain = req.query.Domain
    ? decodeURIComponent(req.query.Domain)
    : "";
    
        const officialSite = "https://watchomovies.monster/";
        const candidateDomains = forceDomain
    ? [forceDomain]
    : [
        "https://streamoupload.xyz/",
        "https://speedostream1.com/",
        "https://speedostream.com/"
    ];

        let streamRes = null;  
        let activeDomain = "";  
        let embedUrl = "";  

        // Check which domain has the live embed for this ID  
        for (let domain of candidateDomains) {  
            try {  
                embedUrl = `${domain.replace(/\/$/, "")}/embed-${play}.html`;  
                const controller = new AbortController();  
                const timeoutId = setTimeout(() => controller.abort(), 4000);  

                const res = await fetch(embedUrl, {  
                    headers: {   
                        "Host": new URL(domain).host,  
                        "User-Agent": getRandomUserAgent(),  
                        "Referer": officialSite,  
                        "Origin": officialSite.replace(/\/$/, ""),  
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"  
                    },  
                    signal: controller.signal  
                });  
                clearTimeout(timeoutId);  

                if (res.ok) {  
                    streamRes = res;  
                    activeDomain = domain;  
                    break;  
                }  
            } catch (e) {}  
        }  

        if (!streamRes || !streamRes.ok) {  
            return res.status(403).send(`Blocked or Forbidden! Embed not found on any domain for ID: ${play}`);  
        }  

        const source = await streamRes.text();

// Sirf streamoupload.xyz ka raw embed source dikhao
if (activeDomain.includes("streamoupload.xyz")) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(source);
}

// Baaki domains ke liye kuch mat karo
return res.status(404).send("Only streamoupload.xyz source is supported.");
    }  

    // --- LIST / SEARCH MODE ---  
    const targetBaseUrl = 'https://bold-darkness-d959.poonamchouhan076.workers.dev/?site=https://watchomovies.monster/';  
    let targetUrl = targetBaseUrl;  
    if (searchQuery) {  
        targetUrl = `${targetBaseUrl}?s=${encodeURIComponent(searchQuery)}`;  
    }  

    const htmlRes = await fetch(targetUrl, {  
        headers: { "User-Agent": getRandomUserAgent() }  
    });  

    if (!htmlRes.ok) {  
        throw new Error(`Target worker returned status ${htmlRes.status}`);  
    }  

    const htmlContent = await htmlRes.text();  
    let playlist = "#EXTM3U\n";  

    const mlItems = htmlContent.split('class="ml-item"');  

    for (let index = 0; index < mlItems.length; index++) {  
        if (index === 0) continue;  
        const item = mlItems[index];  

        const hrefMatch = item.match(/<a\s+href="([^"]+)"/);  
        const imgMatch = item.match(/data-original="([^"]+)"/);  
        const titleMatch = item.match(/<h2>([\s\S]*?)<\/h2>/);  

        if (titleMatch && hrefMatch) {  
            const title = titleMatch[1].trim();  
            const movieHref = hrefMatch[1];  

            if (searchQuery && !title.toLowerCase().includes(searchQuery)) {  
                continue;  
            }  

            try {  
                const detailRes = await fetch(movieHref, {  
                    headers: { "User-Agent": getRandomUserAgent() }  
                });  
                if (detailRes.ok) {  
                    const detailHtml = await detailRes.text();  
                    const iframeMatch = detailHtml.match(/<iframe[^>]+src="([^"]+)"/i);  
                    if (iframeMatch && iframeMatch[1]) {  
                        const iframeSrc = iframeMatch[1];  
                        const idMatch = iframeSrc.match(/embed-([a-zA-Z0-9]+)\.html/i);  
                          
                        if (idMatch && idMatch[1]) {  
                            const embedId = idMatch[1];  
                              
                            // Extract origin directly from the specific iframe source URL  
                            let itemOrigin = "";  
                            try {  
                                const parsedIframe = new URL(iframeSrc);  
                                itemOrigin = parsedIframe.origin;  
                            } catch (e) {  
                                itemOrigin = "https://streamoupload.xyz";  
                            }  

                            const headersuffix = `|Domain=${encodeURIComponent(itemOrigin)}&Referer=${itemOrigin}/&Origin=${itemOrigin}`; 
                            const playLink = `${host}/${embedId}.m3u8${headersuffix}`;  
                            const logo = imgMatch ? imgMatch[1] : '';  
                              
                            playlist += `#EXTINF:-1 tvg-logo="${logo}" group-title="✨New Movies",${title}\n${playLink}\n`;  
                        }  
                    }  
                }  
            } catch (err) {}  
        }  
    }  

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');  
    return res.status(200).send(playlist);  

} catch (err) {  
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');  
    return res.status(200).send("#EXTM3U\n#ERROR: " + err.message);  
}

};

