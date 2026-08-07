import admin from "firebase-admin";
import fetch from "node-fetch";

// Service Account JSON embedded securely directly into the code
const serviceAccount = {
  type: "service_account",
  project_id: "ipl2020-46d2f",
  private_key_id: "4ef0dd533cb2a0bec371b40a90089b474d351dcf",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC6wixlSUNyT4SY\nU32m0s/Ix6pTZHhwAB0BejZ7Odxmn+FqBJpV/7GZqB5sVqR841VpBt8275fNjvtf\nnofdd1raSF0A2OsCjyd3z+YJL0uQccTFHWVLUMQMjqJd5GDvVVvTXHW6u1PuJCin\nC+ZpwzR9gxOfHZdYvcQeJexD4RXnds7hbB04QSs4hQ+3zmrY197nSJUVMdaSh+4r\nG68UwhcaTk3kgTxT4PxYZMLug9MRAwvNXpuM1VzeleY3hzCA6Njxm5d+Q+u7xRlj\n/GFg/4TDQHT70fqwRT8H3unslEW1TN23xRLADDHootHdFbbZQuHMOg82w1ZBHZ/h\nYGaGRWinAgMBAAECggEAGzbcXU4Vw/yOZ9wSvVKO8MUXrts/KaL6lxKGCeLemR3H\nLTnKe6ms6aUz+bmOcpx1/73+nPTA/DVPsBlb1wvjc1eEJfF2HYNazvy+mqwHqN7L\nO6YS8qysROAsDN6QuY+It/4LMdDGZDdkrSLwyoylg3ysSU14lnfgsjv4d9O+62GG\n2BTBMGzuk82U/1IKniUgjRg4EJP7dwGFoU98xvTF2kJd9Hxabjl71LLcRgn2xMy3\nDZX/UI7YOcD7Mfl1sC0LReHpNCuKo6TpoAydN6IJwUdqDYxmhOwW9PE0OwXuMihh\nqoIjscWPH1r8U5j+5/hJefjuAKPxWb8zn1khuApBEQKBgQDqJz6j4fufSzGuyiqm\nqfS+riguAi77Cre5s9begjJrby9IaXUGs6YUzuvNrU/o6+wB4pRinrWIz4DQP+XB\nfKVTFzaHt1vzUMYo72jh0f4U3mBYXzxoHSD00zi9V9sTjeF4OgfvsE2Zw4S80RVU\nz88clTD9kU2DcKiUqmtZZNArcwKBgQDMLucnYqcl764tRnKorMa/BIMSgYFhzbKY\nAIpmyHQzAzNjcMynbg0QcEGM2NAQ/leJ4dyxz8Z9IwwpIo6EeLDMz7Gyz4SNDcaO\n9kIwC2gfHkNd1RRrBt/9noeVYy5cPMuivxkGAYDqeCkU0Rl1y0iFFl/eTAk0ZcDe\nbvZPNB2o/QKBgF3tKipxLw9CCYb039EFIgEPOVzjUVcwgGyEoG+XSIRiEFR6wQ/U\nJo34Rwy1NfXYFU7YRe+dfHKJ0kE3MIHB70t6Z0xfmAntX9/x0V+sbcCPR5SLd17I\nOH0c8Yi6Yk3gvw4MMTzLuwUwMeHP+T+RMKJlkkZU8AQGwAkKp48vanXTAoGAf0hF\nxKGU/OsasxKVa1y5UF5pruGYW/W0fVjo7gXLmflG0ZiBm2XZMwQneLu3iMBkpYls\n4FNbsqpkbEgke6QY4rQeXA9M2/lYa8pLnFOgBrYA3L91yPoyK5Hlh1Sak9k6QCvM\nV5gcWw2o3lcy/eFJRd2ayaKwoj9EKeUWGm2sh6kCgYEArr978JmAS1zgm0kNHPkD\nHxYx+mfGAsMlu5pr949kK4Xgwe0hNVwMtSDtfYHs9JcgGSLQTMWNZ3TNeXymNzvI\ABhfk99tvJ684tnSWNvzsyil3GeHFWOp4qE28CpEU2yHFV2/hxv/NcGB5ZIYtZuP\n7MRgmxF6GQK9syBYfzOn9kw=\n-----END PRIVATE KEY-----",
  client_email: "firebase-adminsdk-gtufp@ipl2020-46d2f.iam.gserviceaccount.com",
  client_id: "101763966194481438180",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-gtufp%40ipl2020-46d2f.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ipl2020-46d2f-default-rtdb.firebaseio.com"
  });
}

export default async function handler(req, res) {
  try {
    const response = await fetch("https://project-lc4mz.vercel.app/api/prt");
    const playlist = await response.text();

    await admin.database().ref("m3u/playlist").set(playlist);
    await admin.database().ref("m3u/lastUpdate").set(Date.now());

    res.status(200).json({
      success: true,
      message: "Playlist updated successfully"
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.message
    });
  }
}
