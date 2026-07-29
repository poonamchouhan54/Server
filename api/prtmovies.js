const fetch = require('node-fetch');

const TARGET_URL = 'https://prmovies-domain-a250.poonamchouhan076.workers.dev/?s=behind+the+door';

module.exports = async (req, res) => {
    // CORS headers add karna taaki kahin se bhi access ho sake
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json;charset=UTF-8');

    // Agar OPTIONS request aaye toh direct 200 bhej do (CORS preflight ke liye)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Target Worker se HTML fetch karo node-fetch ke zariye
        const response = await fetch(TARGET_URL);
        if (!response.ok) {
            throw new Error(`Worker returned status ${response.status}`);
        }
        const htmlContent = await response.text();

        const movies = [];
        const mlItems = htmlContent.split('class="ml-item"');

        mlItems.forEach((item, index) => {
            if (index === 0) return;

            const hrefMatch = item.match(/<a\s+href="([^"]+)"/);
            const imgMatch = item.match(/data-original="([^"]+)"/);
            const titleMatch = item.match(/<h2>([\s\S]*?)<\/h2>/);

            if (titleMatch && hrefMatch) {
                movies.push({
                    title: titleMatch[1].trim(),
                    image: imgMatch ? imgMatch[1] : '',
                    href: hrefMatch[1]
                });
            }
        });

        return res.status(200).json({ 
            status: 'success', 
            total: movies.length, 
            data: movies 
        });

    } catch (error) {
        return res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
};
