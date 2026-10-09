const JSON_URL = "https://lingering-surf-17b2.prtstream.workers.dev/";
const PLAYLIST_URL = "https://mainplaylist.poonamchouhan076.workers.dev/";

export default async function handler(req, res) {
try {
// 1. Dono URLs se data fetch karo
const [jsonRes, playlistRes] = await Promise.all([
fetch(JSON_URL).then(r => {
if (!r.ok) throw new Error("JSON fetch failed: " + r.status);
return r.json();
}),
fetch(PLAYLIST_URL).then(r => {
if (!r.ok) throw new Error("Playlist fetch failed: " + r.status);
return r.text();
})
]);

const channelsData = jsonRes;
const playlistText = playlistRes;

// 2. Playlist ko channel blocks mein divide karo
const parts = playlistText.split('#EXTINF:');
const blocks = parts.slice(1).map(block => '#EXTINF:' + block);

let finalLivePlaylist = "#EXTM3U\n";

// 3. Channel matching function
function findChannel(searchKey, excludeDigital = false) {
  const key = searchKey.toLowerCase().trim();

  return blocks.find(block => {
    const lowerBlock = block.toLowerCase();

    // Channel ke naam wala hissa hi check karo
    const firstLine = lowerBlock.split(/\r?\n/)[0];
    const commaIndex = firstLine.indexOf(',');

    const channelName = (
      commaIndex !== -1
        ? firstLine.substring(commaIndex + 1)
        : firstLine
    ).trim();

    // Digital channel ko pehli search mein skip karo
    if (excludeDigital && channelName.includes("digital")) {
      return false;
    }

    // Special channel name matching
    if (key.includes("star sports 1 hindi hd") &&
        channelName.includes("star sports 1 hindi")) {
      return true;
    }

    if (key.includes("star sports 1 hd") &&
        channelName.includes("star sports 1")) {
      return true;
    }

    if (key.includes("star sports 2 hindi hd") &&
        channelName.includes("star sports hindi 2")) {
      return true;
    }

    if (key.includes("star sports 2 hd") &&
        channelName.includes("star sports 2")) {
      return true;
    }

    if (key.includes("star sports 3") &&
        channelName.includes("star sports 3")) {
      return true;
    }

    if (key.includes("select 1") &&
        channelName.includes("star sports select 1")) {
      return true;
    }

    if (key.includes("select 2") &&
        channelName.includes("star sports select 2")) {
      return true;
    }

    // General matching: HD hata kar naam match karo
    const normalizedKey = key
      .replace(/\bhd\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return channelName.includes(normalizedKey);
  });
}

// 4. Sirf live channels process karo
for (const [key, info] of Object.entries(channelsData)) {
  if (info.status !== "live" || !info.title || !info.channel_name) {
    continue;
  }

  const searchKey = info.channel_name.toLowerCase();

  // Pehle bina Digital wala channel dhoondho
  let matchedBlock = findChannel(searchKey, true);

  // Bina Digital wala na mile, tabhi Digital wala dhoondho
  if (!matchedBlock) {
    matchedBlock = findChannel(searchKey, false);
  }

  if (!matchedBlock) {
    continue;
  }

  let modifiedBlock = matchedBlock.trim();

  // 5. Group title replace karo
  if (/group-title="[^"]*"/i.test(modifiedBlock)) {
    modifiedBlock = modifiedBlock.replace(
      /group-title="[^"]*"/i,
      'group-title="✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"'
    );
  }

  // 6. Title ke shuru se Live- remove karo
  const cleanTitle = info.title.replace(/^Live-/i, "").trim();

  // 7. M3U entry mein title replace karo
  const firstLineEnd = modifiedBlock.indexOf("\n");

  const metaLine = firstLineEnd !== -1
    ? modifiedBlock.substring(0, firstLineEnd)
    : modifiedBlock;

  const commaIndex = metaLine.indexOf(",");

  if (commaIndex !== -1) {
    const prefix = metaLine.substring(0, commaIndex + 1);

    modifiedBlock =
      prefix +
      cleanTitle +
      modifiedBlock.substring(metaLine.length);
  }

  // 8. Final playlist mein add karo
  finalLivePlaylist += modifiedBlock + "\n\n";
}

// 9. Final M3U playlist return karo
res.setHeader("Content-Type", "audio/x-mpegurl; charset=utf-8");

return res.status(200).send(finalLivePlaylist);

} catch (err) {
res.setHeader("Content-Type", "text/plain; charset=utf-8");

return res
  .status(500)
  .send("Error generating playlist: " + err.message);

}
}