const axios = require('axios');
const cheerio = require('cheerio');

// Agar aapke paas axios/cheerio nahi hai toh package.json me add kar lein
// npm install axios cheerio

module.exports = async (req, res) => {
  try {
    // 1. Original M3U playlist fetch karein ya input se lein
    const playlistUrl = "https://filmy2-frost-d665.poonamchouhan076.workers.dev/";
    const response = await axios.get(playlistUrl);
    const m3uContent = response.data;

    // 2. M3U ko lines me todna aur entries parse karna
    const lines = m3uContent.split('\n');
    let updatedLines = [];
    let currentMeta = "";

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      if (line.startsWith('#EXTINF')) {
        currentMeta = line;
      } else if (line.startsWith('http')) {
        // Yeh ek movie link hai (jaise https://linkmake.in/view/...)
        const originalUrl = line;
        
        try {
          // Background me link ko fetch karke HTML nikalna
          const pageRes = await axios.get(originalUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000
          });
          
          const $ = cheerio.load(pageRes.data);
          let bestLink = null;
          let fallbackLink = null;

          // Sabhi download links ko check karna
          $('.dlink.dl a').each((index, element) => {
            const href = $(element).attr('href');
            const text = $(element).text();

            if (href) {
              // Pehli priority: 1080p-HD ya 1080p wala link
              if (text.includes('1080p') && !bestLink) {
                bestLink = href;
              }
              // Fallback: Koi bhi pehla ya dusra available link
              if (!fallbackLink) {
                fallbackLink = href;
              }
            }
          });

          // Final link decide karna (1080p mil jaye toh best, nahi toh fallback)
          const finalUrl = bestLink || fallbackLink;

          if (currentMeta) {
            updatedLines.push(currentMeta);
            currentMeta = "";
          }
          
          // Agar naya direct link mil gaya toh use replace kar do, warna purana rehne do
          updatedLines.push(finalUrl ? finalUrl : originalUrl);

        } catch (err) {
          // Agar kisi link par error aaye toh purana URL hi rakh lo
          if (currentMeta) {
            updatedLines.push(currentMeta);
            currentMeta = "";
          }
          updatedLines.push(originalUrl);
        }
      } else {
        if (line) updatedLines.push(line);
      }
    }

    // 3. Updated M3U content output dena
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    return res.status(200).send(updatedLines.join('\n'));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
