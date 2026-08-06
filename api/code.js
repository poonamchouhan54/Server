const fetch = require('node-fetch');

async function debugStreamUpload() {
    // Aapka diya hua test ID
    const embedId = "nu48w0ddgwrw"; 
    const streamBase = "https://streamoupload.xyz/";
    const embedUrl = `${streamBase}embed-${embedId}.html`;
    const officialSite = "https://watchomovies.monster/";

    console.log(`Fetching URL: ${embedUrl}`);

    try {
        const res = await fetch(embedUrl, {
            headers: {
                "Host": new URL(streamBase).host,
                "Connection": "keep-alive",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": officialSite,
                "Origin": officialSite.replace(/\/$/, ""),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9"
            }
        });

        console.log(`Response Status: ${res.status} ${res.statusText}`);
        
        const html = await res.text();
        console.log(`\n--- HTML Total Length: ${html.length} characters ---\n`);

        // Check karo ki poore HTML mein kahin bhi .m3u8 hai ya nahi
        if (html.includes('.m3u8')) {
            console.log("[✔] Success: '.m3u8' keyword HTML ke andar mil gaya!");
            
            // Jahan-jahan .m3u8 hai, uske aas-paas ka text print kar do
            const regex = new RegExp(`[^"']*?\\.m3u8[^"']*?`, 'g');
            const matches = html.match(regex);
            
            if (matches) {
                console.log("\nFound Patterns:");
                matches.forEach((m, idx) => console.log(`[${idx + 1}] ${m}`));
            }
        } else {
            console.log("[✘] Warning: '.m3u8' text HTML mein direct nahi mila. Ho sakta hai ye JavaScript ke through dynamically load hota ho ya obfuscated/packed ho.");
            
            // HTML ka shuruati hissa print kar lo taaki structure pata chale
            console.log("\n--- HTML Preview (First 1000 chars) ---\n");
            console.log(html.substring(0, 1000));
        }

    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

debugStreamUpload();
