const fetch = require('node-fetch');

export default async function handler(req, res) {
    // Aap yahan multiple JSON URLs bhi add kar sakte hain agar zaroorat ho
    const jsonUrl = "https://wispy-wave-3131.diwij76343.workers.dev/"; 

    try {
        const response = await fetch(jsonUrl);
        const data = await response.json();

        let m3uContent = '#EXTM3U\n';

        // Check karo ki data ek array hai ya object jiske andar channels array hai
        let channelsList = [];
        if (Array.isArray(data)) {
            channelsList = data; // Directly array hai (jaise doosra wala JSON format)
        } else if (data.channels && Array.isArray(data.channels)) {
            channelsList = data.channels; // Object ke andar channels array hai (jaise pehla wala format)
        }

        if (channelsList.length > 0) {
            channelsList.forEach(channel => {
                // Dono formats ki keys ko handle karne ke liye (Fallback options)
                const id = channel.id || "";
                const name = channel.name || "Unknown Channel";
                const logo = channel.logo || `https://jiotv.catchup.cdn.jio.com/dare_images/images/${id}.png`;
                const group = channel.category || channel.group || "Sports";
                
                // stream_url ya url - jo bhi JSON mein ho
                const streamUrl = channel.stream_url || channel.url || "";
                const cookie = channel.cookie || "";
                
                // keyId ya key_id - dono handle honge
                const keyId = channel.keyId || channel.key_id || "";
                const key = channel.key || "";

                // 1. EXTINF Line
                m3uContent += `#EXTINF:-1 group-title="${group}" tvg-id="${id}" tvg-logo="${logo}",${name}\n`;

                // 2. DRM Key properties (agar available hain)
                if (keyId && key) {
                    m3uContent += `#KODIPROP:inputstream.adaptive.license_type=clearkey\n`;
                    m3uContent += `#KODIPROP:inputstream.adaptive.license_key=${keyId}:${key}\n`;
                }

                // 3. User Agent property
                m3uContent += `#KODIPROP:http-user-agent=plaYtv/7.1.5 (Linux;Android 15) ExoPlayerLib/2.11.6\n`;

                // 4. Cookie / EXTHTTP header (agar cookie available hai)
                if (cookie) {
                    m3uContent += `#EXTHTTP:{"Cookie":"${cookie}"}\n`;
                }

                // 5. Final Stream URL
                m3uContent += `${streamUrl}\n`;
            });
        }

        // Response Headers
        res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).send(m3uContent);

    } catch (error) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(500).send(`Error generating playlist: ${error.message}`);
    }
}
