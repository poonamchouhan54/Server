const fetch = require('node-fetch');

export default async function handler(req, res) {
    const jsonUrl = "https://sonujson-v3.pages.dev/Data/sports.json";

    try {
        const response = await fetch(jsonUrl);
        const data = await response.json();

        // M3U Header
        let m3uContent = '#EXTM3U\n';

        if (data.channels && Array.isArray(data.channels)) {
            data.channels.forEach(channel => {
                const id = channel.id || "";
                const name = channel.name || "Unknown Channel";
                // Agar JSON mein logo nahi hai toh default JioTV logo pattern use hoga
                const logo = channel.logo || `https://jiotv.catchup.cdn.jio.com/dare_images/images/${id}.png`;
                const group = channel.group || "Sports";
                const streamUrl = channel.stream_url || "";
                const cookie = channel.cookie || "";
                const keyId = channel.key_id || "";
                const key = channel.key || "";

                // Exact format string building as requested
                let channelLine = `#EXTINF:-1 group-title="${group}" -1 tvg-id="${id}" tvg-logo="${logo}",${name}`;

                // DRM Key properties (agar available hain)
                if (keyId && key) {
                    channelLine += `#KODIPROP:inputstream.adaptive.license_type=clearkey`;
                    channelLine += `#KODIPROP:inputstream.adaptive.license_key=${keyId}:${key}`;
                }

                // User Agent property
                channelLine += `#KODIPROP:http-user-agent=plaYtv/7.1.5 (Linux;Android 15) ExoPlayerLib/2.11.6`;

                // Cookie / EXTHTTP header (agar cookie available hai)
                if (cookie) {
                    channelLine += `#EXTHTTP:{"Cookie":"${cookie}"}`;
                }

                // Final Stream URL attached at the end of the line
                channelLine += `${streamUrl}\n`;

                m3uContent += channelLine;
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
