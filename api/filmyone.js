import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    try {
        // Site se live data fetch karna
        const { data } = await axios.get('https://filmyfly.green/');
        const $ = cheerio.load(data);
        
        let m3uContent = "#EXTM3U\n";

        // Movies list extract karna
        $('.A10').each((i, el) => {
            const title = $(el).find('.row-title').text().trim();
            const link = $(el).find('a').attr('href');
            
            if (title && link) {
                // Link ko full URL banana
                const fullUrl = `https://filmyfly.green${link}`;
                m3uContent += `#EXTINF:-1 group-title="🎥 Filmy Fly",${title}\n${fullUrl}\n`;
            }
        });

        // M3U file ki tarah response bhejna
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.setHeader('Content-Disposition', 'attachment; filename="filmyfly.m3u"');
        res.status(200).send(m3uContent);

    } catch (error) {
        res.status(500).send("Error fetching data: " + error.message);
    }
}
