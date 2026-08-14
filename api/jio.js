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

                // URL clean karein (query parameters hatakar)
                const cleanStreamUrl = streamUrl.split('?')[0];

                // Logo handle karne ka logic (Agar JSON me nahi hai tab)
                let logo = channel.logo || "";
                if (!logo) {
                    try {
                        // Stream URL se path extract karein (jaise: /bpk-tv/Ten_4_Telugu_MOB/WDVLive/index.mpd)
                        const urlPath = new URL(cleanStreamUrl).pathname;
                        const pathSegments = urlPath.split('/').filter(Boolean);
                        
                        // Aamtaur par stream path me folder name channel ka hota hai (jaise Ten_4_Telugu_MOB)
                        let folderName = "";
                        for (let segment of pathSegments) {
                            if (segment.includes('_MOB') || segment.includes('_HD') || segment.includes('_SD')) {
                                folderName = segment;
                                break;
                            }
                        }
                        
                        // Agar specific segment nahi mila to fallback ke taur par second last ya relevant segment lein
                        if (!folderName && pathSegments.length >= 2) {
                            folderName = pathSegments[pathSegments.length - 3] || pathSegments[0];
                        }

                        // '_MOB', '_HD', ya aage ke extra parts ko remove karein taaki sirf exact name bache
                        let extractedName = folderName
                            .replace(/(_MOB|_HD|_SD|_FHD).*$/i, '')
                            .replace(/_WDVLive|_Live/gi, '');

                        if (!extractedName) {
                            extractedName = name.replace(/[^a-zA-Z0-9_]/g, '_');
                        }

                        logo = `https://jiotv.catchup.cdn.jio.com/dare_images/images/${extractedName}.png`;
                    } catch (e) {
                        // Agar URL parse karne me error aaye to channel name ya ID use karein
                        const fallbackName = name.replace(/[^a-zA-Z0-9_]/g, '_');
                        logo = `https://jiotv.catchup.cdn.jio.com/dare_images/images/${fallbackName}.png`;
                    }
                }

                const group = channel.category || channel.group || "Sports";
                const cookie = channel.cookie || "";
                const keyId = channel.keyId || channel.key_id || "";
                const key = channel.key || "";

                // **MULTI-LINE FORMAT**
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
