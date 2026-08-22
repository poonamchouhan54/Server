import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    try {
        const { data } = await axios.get('https://filmyfly.green/');
        const $ = cheerio.load(data);
        let m3uContent = "#EXTM3U\n";

        $('.A10').each((i, el) => {
            const title = $(el).find('.row-title').text().trim();
            const link = $(el).find('a').attr('href');
            const img = $(el).find('img').attr('src'); // Yahan se image URL uthega
            
            if (title && link) {
                const fullUrl = `https://filmyfly.green${link}`;
                // tvg-logo tag add kar diya hai taaki image show ho
                m3uContent += `#EXTINF:-1 tvg-logo="${img}" group-title="🎥 Filmy Fly",${title}\n${fullUrl}\n`;
            }
        });

        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.setHeader('Content-Disposition', 'attachment; filename="filmyfly.m3u"');
        res.status(200).send(m3uContent);
        
    } catch (error) {
        res.status(500).send("Error fetching data: " + error.message);
    }
}
