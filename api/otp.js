const admin = require('firebase-admin');

try {
    if (!admin.apps.length) {
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        if (privateKey) {
            privateKey = privateKey.replace(/\\n/g, '\n');
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
            // Aapka Firebase Realtime Database URL direct yahan daal diya hai
            databaseURL: "https://ipl2020-46d2f.firebaseio.com"
        });
    }
} catch (e) {
    console.error("Firebase Init Error:", e.message);
}

const db = admin.apps.length ? admin.database() : null;

module.exports = async (req, res) => {
    try {
        if (!db) {
            return res.status(500).send("❌ Firebase Init Failed: Vercel par Project ID, Client Email, aur Private Key check karein.");
        }

        const randomCode = 'PRT' + Math.floor(100000 + Math.random() * 900000);
        const otpRef = db.ref(`otp_system/${randomCode}`);
        
        await otpRef.set({
            otp: randomCode,
            isUsed: false,
            deviceId: "",
            expiryTime: 0,
            createdAt: Date.now()
        });

        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>PRT Stream - OTP Generation</title>
                <style>
                    body { background: #121212; color: #fff; font-family: sans-serif; text-align: center; padding-top: 50px; }
                    .box { background: #1e1e1e; padding: 25px; border-radius: 12px; display: inline-block; border: 2px solid #ff0000; box-shadow: 0 4px 15px rgba(255,0,0,0.3); }
                    h2 { color: #ff0000; margin-bottom: 10px; }
                    .code { font-size: 36px; font-weight: bold; color: #00ff00; margin: 20px 0; letter-spacing: 3px; background: #000; padding: 10px; border-radius: 8px; }
                    p { color: #aaa; font-size: 14px; line-height: 1.5; }
                </style>
            </head>
            <body>
                <div class="box">
                    <h2>PRT STREAM PASSCODE</h2>
                    <p>Apna yeh passcode copy karein aur app me enter karein:</p>
                    <div class="code">${randomCode}</div>
                    <p>⚠️ Yeh link aur OTP ek baar generate ho chuka hai.</p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        return res.status(500).send("❌ Server Error: " + error.message);
    }
};
