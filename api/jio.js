const fetch = require('node-fetch');

export default async function handler(req, res) {
    const jsonUrl = "https://sonujson-devloper.vercel.app/Data/sports.json"; 

    try {
        const response = await fetch(jsonUrl);
        const data = await response.json();

        let m3uContent = '#EXTM3U\n';

        let channelsList = [];
        if (Array.isArray(data)) {
            channelsList = data;
        } else if (data.channels && Array.isArray(data.channels)) {
            channelsList = data.channels;
        }

        if (channelsList.length > 0) {
            channelsList.forEach(channel => {
                const id = channel.id || "";
                const name = channel.name || "";
                let streamUrl = channel.stream_url || channel.url || "";

                if (!name || !streamUrl) return;

                const cleanStreamUrl = streamUrl.split('?')[0];

                // Logo Logic
                let logo = channel.logo || "";
                if (!logo) {
                    try {
                        const urlPath = new URL(cleanStreamUrl).pathname;
                        const segments = urlPath.split('/').filter(Boolean);
                        let folderName = segments.find(seg => /_MOB|_BTS|_HD|_SD|_FHD|_Live/i.test(seg)) || segments[segments.length - 2];
                        let extractedName = folderName ? folderName.replace(/(_BTS|_MOB|_WDVLive|_Live).*$/i, '') : name.replace(/[^a-zA-Z0-9_]/g, '_');
                        logo = `https://jiotv.catchup.cdn.jio.com/dare_images/images/${extractedName}.png`;
                    } catch (e) {
                        logo = `https://jiotv.catchup.cdn.jio.com/dare_images/images/${name.replace(/[^a-zA-Z0-9_]/g, '_')}.png`;
                    }
                }

                // --- SMART GROUP LOGIC ---
                const lowerName = name.toLowerCase();
                const lowerCat = (channel.category || channel.group || "").toLowerCase();
                
                let group = "Sports"; // Default sports rahega
                
                // Naye channels ke keywords yaha add kiye gaye hain
                if (
                    lowerCat.includes('kid') || 
                    lowerCat.includes('cartoon') || 
                    lowerName.includes('nick') || 
                    lowerName.includes('pogo') || 
                    lowerName.includes('disney') || 
                    lowerName.includes('sonic') || 
                    lowerName.includes('yay') || 
                    lowerName.includes('hungama') || 
                    lowerName.includes('cartoon network') || 
                    lowerName.includes('discovery') || 
                    lowerName.includes('dabangg') ||
                    lowerName.includes('sony aath') ||
                    lowerName.includes('unique tv') ||
                    lowerName.includes('colors bangla') ||
                    lowerName.includes('zee bangla') ||
                    lowerName.includes('jalsha')
                ) {
                    group = "Kids";
                }
                
                const cookie = channel.cookie || "";
                const keyId = channel.keyId || channel.key_id || "";
                const key = channel.key || "";

                // M3U Content
                m3uContent += `#EXTINF:-1 group-title="${group}" tvg-id="${id}" tvg-logo="${logo}",${name}\n`;

                if (keyId && key) {
                    m3uContent += `#KODIPROP:inputstream.adaptive.license_type=clearkey\n`;
                    m3uContent += `#KODIPROP:inputstream.adaptive.license_key=${keyId}:${key}\n`;
                }

                m3uContent += `#KODIPROP:http-user-agent=plaYtv/7.1.5 (Linux;Android 15) ExoPlayerLib/2.11.6\n`;

                if (cookie) {
                    m3uContent += `#EXTHTTP:{"Cookie":"${cookie}"}\n`;
                }

                m3uContent += `${cleanStreamUrl}\n`;
            });
        }

        res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).send(m3uContent);

    } catch (error) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(500).send(`Error generating playlist: ${error.message}`);
    }
}
