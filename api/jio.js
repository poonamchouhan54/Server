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

                // Logo handle karne ka logic
                let logo = channel.logo || "";
                if (!logo) {
                    try {
                        const urlPath = new URL(cleanStreamUrl).pathname;
                        const pathSegments = urlPath.split('/').filter(Boolean);
                        
                        // Jo segment stream path me hai usko uthayein
                        let folderName = "";
                        for (let segment of pathSegments) {
                            if (segment.includes('Star') || segment.includes('Sports') || segment.includes('_HD') || segment.includes('_MOB') || segment.includes('_BTS')) {
                                folderName = segment;
                                break;
                            }
                        }
                        
                        if (!folderName && pathSegments.length >= 2) {
                            folderName = pathSegments[pathSegments.length - 3] || pathSegments[0];
                        }

                        // Extra words aur endings ko yaha clean kiya gaya hai taaki pura naam sahi aaye
                        let extractedName = folderName
                            .replace(/(_BTS|_MOB|_HD|_SD|_FHD).*$/i, '')
                            .replace(/_WDVLive|_Live/gi, '');

                        // Agar extraction me kuch chut jaye to channel name ka use karein
                        if (!extractedName || extractedName.length < 3) {
                            extractedName = name.replace(/[^a-zA-Z0-9_]/g, '_');
                        }

                        logo = `https://jiotv.catchup.cdn.jio.com/dare_images/images/${extractedName}.png`;
                    } catch (e) {
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
