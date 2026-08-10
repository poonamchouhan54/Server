const fetch = require('node-fetch');

export default async function handler(req, res) {
    const jsonUrl = "https://wispy-wave-3131.diwij76343.workers.dev/"; 

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
                const streamUrl = channel.stream_url || channel.url || "";

                // **CRITICAL FIX:** Agar channel ka name ya stream URL hi nahi hai, toh use skip kar do taaki app crash na ho!
                if (!name || !streamUrl) return;

                const logo = channel.logo || `https://jiotv.catchup.cdn.jio.com/dare_images/images/${id}.png`;
                const group = channel.category || channel.group || "Sports";
                const cookie = channel.cookie || "";
                const keyId = channel.keyId || channel.key_id || "";
                const key = channel.key || "";

                // 1. EXTINF Line
                m3uContent += `#EXTINF:-1 group-title="${group}" tvg-id="${id}" tvg-logo="${logo}",${name}\n`;

                // 2. DRM Key properties (Sirf tabhi add honge jab valid honge)
                if (keyId && key) {
                    m3uContent += `#KODIPROP:inputstream.adaptive.license_type=clearkey\n`;
                    m3uContent += `#KODIPROP:inputstream.adaptive.license_key=${keyId}:${key}\n`;
                }

                // 3. User Agent property
                m3uContent += `#KODIPROP:http-user-agent=plaYtv/7.1.5 (Linux;Android 15) ExoPlayerLib/2.11.6\n`;

                // 4. Cookie / EXTHTTP header
                if (cookie) {
                    m3uContent += `#EXTHTTP:{"Cookie":"${cookie}"}\n`;
                }

                // 5. Final Stream URL
                m3uContent += `${streamUrl}\n`;
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
