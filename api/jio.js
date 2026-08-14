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

                // Logo handle karne ka absolute sahi tarika
                let logo = channel.logo || "";
                if (!logo) {
                    try {
                        // URL ke path me se segments nikal lo (jaise /bpk-tv/Star_Sports_HD1_Hindi_BTS/WDVLive/index.mpd)
                        const urlPath = new URL(cleanStreamUrl).pathname;
                        const segments = urlPath.split('/').filter(Boolean);
                        
                        // Jo segment stream folder hai (jaise Star_Sports_HD1_Hindi_BTS) usko pakdo
                        let folderName = "";
                        for (let seg of segments) {
                            if (seg.includes('_MOB') || seg.includes('_BTS') || seg.includes('_HD') || seg.includes('_SD') || seg.includes('_FHD') || seg.includes('_Live')) {
                                folderName = seg;
                                break;
                            }
                        }

                        // Agar upar wala segment na mile to URL ka aakhri se pehla wala folder le lo
                        if (!folderName && segments.length >= 2) {
                            folderName = segments[segments.length - 2];
                        }

                        // Extra tags (_BTS, _MOB, _WDVLive, _Live) ko hata kar sirf main channel name bacha lo
                        let extractedName = folderName
                            .replace(/(_BTS|_MOB|_WDVLive|_Live).*$/i, '')
                            .replace(/_WDVLive|_Live/gi, '');

                        if (!extractedName) {
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
