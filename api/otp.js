const admin = require('firebase-admin');

module.exports = async (req, res) => {
    try {
        if (!admin.apps.length) {
            const privateKeyLines = [
                "-----BEGIN PRIVATE KEY-----",
                "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC6wixlSUNyT4SY",
                "U32m0s/Ix6pTZHhwAB0BejZ7Odxmn+FqBJpV/7GZqB5sVqR841VpBt8275fNjvtf",
                "nofdd1raSF0A2OsCjyd3z+YJL0uQccTFHWVLUMQMjqJd5GDvVVvTXHW6u1PuJCin",
                "C+ZpwzR9gxOfHZdYvcQeJexD4RXnds7hbB04QSs4hQ+3zmrY197nSJUVMdaSh+4r",
                "G68UwhcaTk3kgTxT4PxYZMLug9MRAwvNXpuM1VzeleY3hzCA6Njxm5d+Q+u7xRlj",
                "/GFg/4TDQHT70fqwRT8H3unslEW1TN23xRLADDHootHdFbbZQuHMOg82w1ZBHZ/h",
                "YGaGRWinAgMBAAECggEAGzbcXU4Vw/yOZ9wSvVKO8MUXrts/KaL6lxKGCeLemR3H",
                "LTnKe6ms6aUz+bmOcpx1/73+nPTA/DVPsBlb1wvjc1eEJfF2HYNazvy+mqwHqN7L",
                "O6YS8qysROAsDN6QuY+It/4LMdDGZDdkrSLwyoylg3ysSU14lnfgsjv4d9O+62GG",
                "2BTBMGzuk82U/1IKniUgjRg4EJP7dwGFoU98xvTF2kJd9Hxabjl71LLcRgn2xMy3",
                "DZX/UI7YOcD7Mfl1sC0LReHpNCuKo6TpoAydN6IJwUdqDYxmhOwW9PE0OwXuMihh",
                "qoIjscWPH1r8U5j+5/hJefjuAKPxWb8zn1khuApBEQKBgQDqJz6j4fufSzGuyiqm",
                "qfS+riguAi77Cre5s9begjJrby9IaXUGs6YUzuvNrU/o6+wB4pRinrWIz4DQP+XB",
                "fKVTFzaHt1vzUMYo72jh0f4U3mBYXzxoHSD00zi9V9sTjeF4OgfvsE2Zw4S80RVU",
                "z88clTD9kU2DcKiUqmtZZNArcwKBgQDMLucnYqcl764tRnKorMa/BIMSgYFhzbKY",
                "AIpmyHQzAzNjcMynbg0QcEGM2NAQ/leJ4dyxz8Z9IwwpIo6EeLDMz7Gyz4SNDcaO",
                "9kIwC2gfHkNd1RRrBt/9noeVYy5cPMuivxkGAYDqeCkU0Rl1y0iFFl/eTAk0ZcDe",
                "bvZPNB2o/QKBgF3tKipxLw9CCYb039EFIgEPOVzjUVcwgGyEoG+XSIRiEFR6wQ/U",
                "Jo34Rwy1NfXYFU7YRe+dfHKJ0kE3MIHB70t6Z0xfmAntX9/x0V+sbcCPR5SLd17I",
                "OH0c8Yi6Yk3gvw4MMTzLuwUwMeHP+T+RMKJlkkZU8AQGwAkKp48vanXTAoGAf0hF",
                "xKGU/OsasxKVa1y5UF5pruGYW/W0fVjo7gXLmflG0ZiBm2XZMwQneLu3iMBkpYls",
                "4FNbsqpkbEgke6QY4rQeXA9M2/lYa8pLnFOgBrYA3L91yPoyK5Hlh1Sak9k6QCvM",
                "V5gcWw2o3lcy/eFJRd2ayaKwoj9EKeUWGm2sh6kCgYEArr978JmAS1zgm0kNHPkD",
                "HxYx+mfGAsMlu5pr949kK4Xgwe0hNVwMtSDtfYHs9JcgGSLQTMWNZ3TNeXymNzvI",
                "ABhfk99tvJ684tnSWNvzsyil3GeHFWOp4qE28CpEU2yHFV2/hxv/NcGB5ZIYtZuP",
                "7MRgmxF6GQK9syBYfzOn9kw=",
                "-----END PRIVATE KEY-----"
            ].join('\n');

            admin.initializeApp({
                credential: admin.credential.cert({
                    "project_id": "ipl2020-46d2f",
                    "client_email": "firebase-adminsdk-gtufp@ipl2020-46d2f.iam.gserviceaccount.com",
                    "private_key": privateKeyLines
                }),
                databaseURL: "https://ipl2020-46d2f.firebaseio.com"
            });
        }

        const db = admin.database();
        const randomCode = '' + Math.floor(100000 + Math.random() * 900000);
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
                <title>Verification Code</title>
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
                    <h2>VERIFICATION CODE</h2>
                    <p>Apna yeh code copy karein aur app me enter karein:</p>
                    <div class="code">${randomCode}</div>
                    <p>⚠️ Yeh code ek baar generate ho chuka hai.</p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        return res.status(500).send("❌ ASLI ERROR: " + error.message);
    }
};
