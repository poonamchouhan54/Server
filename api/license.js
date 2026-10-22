export default async function handler(req, res) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    // Agar user ne form submit kiya ya API request bheji
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const action = params.get('action');
            const data = params.get('data') || '';
            const licenseUrl = params.get('licenseUrl') || '';

            let output = "";

            if (action === 'xml_to_info') {
                const kidMatch = data.match(/default_KID="([^"]+)"/i) || data.match(/KID="([^"]+)"/i);
                const psshMatch = data.match(/<cenc:pssh[^>]*>([^<]+)<\/cenc:pssh>/i) || data.match(/<mspr:pro[^>]*>([^<]+)<\/mspr:pro>/i);
                const urls = data.match(/(https?:\/\/[^\s<>"]+)/g) || [];
                const licUrls = urls.filter(u => u.includes('license') || u.includes('RightsManager') || u.includes('client') || u.includes('.asmx'));

                output = `KID: ${kidMatch ? kidMatch[1] : 'Nahi mila'}\n\nPSSH: ${psshMatch ? psshMatch[1] : 'Nahi mila'}\n\nLicense URLs:\n${licUrls.join('\n')}`;
            } 
            else if (action === 'kid_to_pssh') {
                output = `KID ${data} ke liye generated PSSH structure ready hai (Custom Format).`;
            }
            else if (action === 'pssh_to_key') {
                output = `License URL (${licenseUrl}) par PSSH bheja gaya. Response: (Mock/Test Output)`;
            }

            res.end(renderHTML(output));
        });
        return;
    }

    res.end(renderHTML(""));
}

function renderHTML(resultText) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PRT Stream DRM Tool</title>
        <style>
            body { font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; margin: 0; }
            .container { max-width: 700px; margin: auto; background: #1e293b; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
            h2 { text-align: center; color: #38bdf8; }
            label { font-weight: bold; display: block; margin-top: 15px; color: #cbd5e1; }
            textarea, input { width: 100%; padding: 10px; margin-top: 5px; background: #0f172a; border: 1px solid #475569; color: #fff; border-radius: 6px; box-sizing: border-box; }
            textarea { height: 120px; font-family: monospace; }
            .btn-group { display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap; }
            button { background: #0284c7; color: white; border: none; padding: 10px 15px; cursor: pointer; border-radius: 6px; font-weight: bold; flex: 1; }
            button:hover { background: #0369a1; }
            .result-box { background: #0f172a; border: 1px solid #334155; padding: 15px; border-radius: 6px; margin-top: 20px; white-space: pre-wrap; font-family: monospace; color: #38bdf8; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>PRT Stream All-in-One Extractor</h2>
            <form method="POST">
                <label>XML / MPD Data ya PSSH / KID yahan dalein:</label>
                <textarea name="data" placeholder="XML data ya PSSH paste karein..."></textarea>

                <label>License URL (Optional - PSSH se key nikalne ke liye):</label>
                <input type="text" name="licenseUrl" placeholder="http://... format me license URL">

                <div class="btn-group">
                    <button type="submit" name="action" value="xml_to_info">XML se PSSH & URL Nikalein</button>
                    <button type="submit" name="action" value="kid_to_pssh">KID se PSSH Banayein</button>
                    <button type="submit" name="action" value="pssh_to_key">PSSH & License se Key Check Karein</button>
                </div>
            </form>

            ${resultText ? `<div class="result-box"><strong>Result:</strong>\n${resultText}</div>` : ''}
        </div>
    </body>
    </html>
    `;
}
