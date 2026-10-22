export default async function handler(req, res) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const action = params.get('action');
            const data = params.get('data') || '';
            const licenseUrl = params.get('licenseUrl') || '';

            let resultData = { kid: '', pssh: '', licenseUrls: [] };

            if (action === 'xml_to_info') {
                const kidMatch = data.match(/default_KID="([^"]+)"/i) || data.match(/KID="([^"]+)"/i);
                const psshMatch = data.match(/<cenc:pssh[^>]*>([^<]+)<\/cenc:pssh>/i);
                
                let urls = data.match(/(https?:\/\/[^\s<>"]+)/g) || [];
                let licUrls = urls.filter(u => u.includes('license') || u.includes('RightsManager') || u.includes('client') || u.includes('.asmx') || u.includes('expressplay'));

                const msprMatch = data.match(/<mspr:pro[^>]*>([^<]+)<\/mspr:pro>/i);
                if (msprMatch && licUrls.length === 0) {
                    try {
                        const decodedBuffer = Buffer.from(msprMatch[1], 'base64');
                        const decodedString = decodedBuffer.toString('utf16le');
                        const urlMatch = decodedString.match(/(https?:\/\/[^\s\0]+)/g);
                        if (urlMatch) {
                            const found = urlMatch.filter(u => u.includes('expressplay') || u.includes('license') || u.includes('RightsManager') || u.includes('client'));
                            licUrls = found.length ? found : urlMatch;
                        }
                    } catch (e) {}
                }

                resultData = {
                    kid: kidMatch ? kidMatch[1] : 'Nahi mila',
                    pssh: psshMatch ? psshMatch[1] : 'Nahi mila',
                    licenseUrls: licUrls.length ? licUrls : ['Nahi mila']
                };
            } 
            else if (action === 'kid_to_pssh') {
                resultData = { kid: data, pssh: `Generated PSSH for KID: ${data}`, licenseUrls: [] };
            }
            else if (action === 'pssh_to_key') {
                resultData = { kid: 'N/A', pssh: data, licenseUrls: [licenseUrl], response: 'License server request executed (Mock).' };
            }

            res.end(renderHTML(resultData, data, licenseUrl));
        });
        return;
    }

    res.end(renderHTML(null, "", ""));
}

function renderHTML(resData, savedData, savedLic) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PRT Stream Professional DRM Tool</title>
        <style>
            :root {
                --bg-color: #0b0f19;
                --card-bg: #111827;
                --border-color: #1f2937;
                --text-main: #f3f4f6;
                --text-muted: #9ca3af;
                --accent: #0284c7;
                --accent-hover: #0369a1;
                --success: #10b981;
            }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: var(--bg-color); color: var(--text-main); padding: 20px; margin: 0; }
            .container { max-width: 800px; margin: auto; background: var(--card-bg); padding: 25px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid var(--border-color); }
            h2 { text-align: center; color: #38bdf8; margin-bottom: 25px; font-size: 24px; }
            label { font-weight: 600; display: block; margin-top: 15px; color: var(--text-muted); font-size: 14px; }
            textarea, input { width: 100%; padding: 12px; margin-top: 6px; background: #030712; border: 1px solid var(--border-color); color: #fff; border-radius: 8px; box-sizing: border-box; font-family: monospace; font-size: 13px; }
            textarea { height: 130px; resize: vertical; }
            .btn-group { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 20px; }
            button { background: var(--accent); color: white; border: none; padding: 12px 18px; cursor: pointer; border-radius: 8px; font-weight: 600; transition: 0.2s; font-size: 14px; }
            button:hover { background: var(--accent-hover); }
            .result-section { margin-top: 25px; background: #030712; border: 1px solid var(--border-color); padding: 20px; border-radius: 12px; }
            .result-title { font-weight: bold; color: #38bdf8; margin-bottom: 15px; font-size: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; }
            .output-row { margin-bottom: 15px; }
            .output-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; display: block; }
            .output-box-wrapper { display: flex; gap: 10px; align-items: center; }
            .output-box { flex: 1; background: #111827; border: 1px solid var(--border-color); padding: 10px 14px; border-radius: 6px; font-family: monospace; font-size: 13px; word-break: break-all; color: #34d399; }
            .copy-btn { background: #374151; color: #fff; border: none; padding: 10px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; white-space: nowrap; transition: 0.2s; }
            .copy-btn:hover { background: #4b5563; }
            .copy-btn.copied { background: var(--success); }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>PRT Stream Professional DRM Tool</h2>
            <form method="POST">
                <label>XML / MPD Data ya PSSH / KID Yahan Dalein:</label>
                <textarea name="data" placeholder="XML data ya PSSH paste karein...">${savedData}</textarea>

                <label>License URL (Optional):</label>
                <input type="text" name="licenseUrl" value="${savedLic}" placeholder="https://... format me license URL">

                <div class="btn-group">
                    <button type="submit" name="action" value="xml_to_info">XML se Data Nikalein</button>
                    <button type="submit" name="action" value="kid_to_pssh">KID se PSSH Banayein</button>
                    <button type="submit" name="action" value="pssh_to_key">Key & License Check</button>
                </div>
            </form>

            ${resData ? `
            <div class="result-section">
                <div class="result-title">Extracted Results</div>
                
                <div class="output-row">
                    <span class="output-label">Default KID</span>
                    <div class="output-box-wrapper">
                        <div class="output-box" id="kidText">${resData.kid}</div>
                        <button class="copy-btn" onclick="copyText('kidText', this)">Copy KID</button>
                    </div>
                </div>

                <div class="output-row">
                    <span class="output-label">PSSH Box</span>
                    <div class="output-box-wrapper">
                        <div class="output-box" id="psshText">${resData.pssh}</div>
                        <button class="copy-btn" onclick="copyText('psshText', this)">Copy PSSH</button>
                    </div>
                </div>

                <div class="output-row">
                    <span class="output-label">License URL</span>
                    <div class="output-box-wrapper">
                        <div class="output-box" id="licText">${resData.licenseUrls.join(', ')}</div>
                        <button class="copy-btn" onclick="copyText('licText', this)">Copy URL</button>
                    </div>
                </div>
                
                ${resData.response ? `<div style="margin-top:10px; color:#fbbf24; font-size:13px;"><strong>Note:</strong> ${resData.response}</div>` : ''}
            </div>
            ` : ''}
        </div>

        <script>
            function copyText(elementId, btn) {
                const text = document.getElementById(elementId).innerText;
                navigator.clipboard.writeText(text).then(() => {
                    const originalText = btn.innerText;
                    btn.innerText = 'Copied!';
                    btn.classList.add('copied');
                    setTimeout(() => {
                        btn.innerText = originalText;
                        btn.classList.remove('copied');
                    }, 2000);
                });
            }
        </script>
    </body>
    </html>
    `;
}
