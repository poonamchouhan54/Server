const fetch = require('node-fetch'); // Agar Node version purana hai, ya standard global fetch use karein

export default async function handler(req, res) {
    const jsonUrl = "https://sonujson-v3.pages.dev/Data/sports.json";

    try {
        const response = await fetch(jsonUrl);
        const data = await response.json();

        // M3U Header
        let m3uContent = '#EXTM3U x-tvg-url=""\n';

        if (data.channels && Array.isArray(data.channels)) {
            data.channels.forEach(channel => {
                const name = channel.name || "Unknown Channel";
                const logo = channel.logo || "";
                const group = channel.group || "Live Sports";
                const streamUrl = channel.stream_url || "";
                const cookie = channel.cookie || "";
                const keyId = channel.key_id || "";
                const key = channel.key || "";

                // EXTINF Line
                m3uContent += `#EXTINF:-1 tvg-id="${channel.id}" tvg-name="${name}" tvg-logo="${logo}" group-title="${group}",${name}\n`;

                // Widevine DRM Key Properties (Agar available hain)
                if (keyId && key) {
                    m3uContent += `#KODIPROP:inputstream.adaptive.license_type=org.w3.clearkey\n`;
                    m3uContent += `#KODIPROP:inputstream.adaptive.license_key=${keyId}:${key}\n`;
                }

                // Headers / Cookie handling agar stream URL mein required ho
                if (cookie) {
                    // Kuch players ke liye User-Agent ya Cookie ko URL ke sath append karna padta hai
                    // Ya phir standard user-agent property:
                    m3uContent += `#EXTVLCOPT:http-user-agent=Mozilla/5.0\n`;
                }

                // Final Stream URL with Cookie if needed
                let finalStream = streamUrl;
                if (cookie && !streamUrl.includes("|")) {
                    finalStream += `|Cookie=${encodeURIComponent(cookie)}`;
                }

                m3uContent += `${finalStream}\n`;
            });
        }

        // Set Headers for M3U File Download/View
        res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).send(m3uContent);

    } catch (error) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(500).send(`Error generating M3U playlist: ${error.message}`);
    }
}
