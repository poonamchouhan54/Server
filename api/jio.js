const fetch = require('node-fetch');

export default async function handler(req, res) {
    const jsonUrl = "https://sonujson-v3.pages.dev/Data/sports.json";

    try {
        const response = await fetch(jsonUrl);
        const data = await response.json();

        // M3U Header with EXT-X-VERSION or standard M3U
        let m3uContent = '#EXTM3U\n';

        if (data.channels && Array.isArray(data.channels)) {
            data.channels.forEach(channel => {
                const id = channel.id || "";
                const name = channel.name || "Unknown Channel";
                const logo = channel.logo || `https://jiotv.catchup.cdn.jio.com/dare_images/images/${id}.png`;
                const group = channel.group || "Sports";
                const streamUrl = channel.stream_url || "";
                const cookie = channel.cookie || "";
                const keyId = channel.key_id || "";
                const key = channel.key || "";

                // 1. EXTINF Line (Har channel ki shuruat yahin se hogi)
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

                // 5. Final Stream URL (Nayi line par)
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
