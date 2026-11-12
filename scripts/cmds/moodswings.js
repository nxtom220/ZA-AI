const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API = "https://diablo-moodswings-api.onrender.com";
const CACHE = path.join(__dirname, "cache");
if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE, { recursive: true });

function toBold(text) {
  const boldMap = {
    'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉', 'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓', 'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
    'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣', 'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭', 'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
    '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
  };
  return text.split('').map(char => boldMap[char] || char).join('');
}

module.exports = {
  config: {
    name: "moodswings",
    aliases: ["msd", "diablomood"],
    version: "1.2",
    author: "protik",
    countDown: 5,
    role: 0,
    category: "media",
    shortDescription: "Random videos from Diablo Moodswings API",
    guide: { en: "{pn} to open the menu" }
  },

  onStart: async function ({ message, event }) {
    try {
      const res = await axios.get(`${API}/api/categories`, { timeout: 90000 });
      const categories = Object.keys(res.data);

      if (!categories.length) return message.reply("❌ | No categories found.");

      let msg = "✦ ──『 𝐌𝐎𝐎𝐃𝐒𝐖𝐈𝐍𝐆𝐒 』── ✦\n\n";
      categories.forEach((cat, index) => {
        msg += `  ${toBold((index + 1).toString())} ❯ ${toBold(cat.toUpperCase())}\n`;
      });
      msg += `\n💬 | 𝐑𝐞𝐩𝐥𝐲 𝐰𝐢𝐭𝐡 𝐚 𝐧𝐮𝐦𝐛𝐞𝐫 𝐭𝐨 𝐬𝐞𝐥𝐞𝐜𝐭 𝐚 𝐜𝐚𝐭𝐞𝐠𝐨𝐫𝐲.`;

      return message.reply(msg, (err, info) => {
        if (err || !info) return;
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          author: event.senderID,
          messageID: info.messageID,
          step: 1,
          categories: categories,
          rawData: res.data
        });
      });
    } catch (e) {
      return message.reply("❌ | API Error. Please try again later.\n" + e.message);
    }
  },

  onReply: async function ({ message, event, Reply }) {
    if (event.senderID !== Reply.author) return;

    const input = parseInt(event.body.trim());
    if (isNaN(input)) return message.reply("❌ | 𝐍𝐨𝐭𝐡𝐢𝐧𝐠 𝐡𝐞𝐫𝐞. 𝐏𝐥𝐞𝐚𝐬𝐞 𝐫𝐞𝐩𝐥𝐲 𝐰𝐢𝐭𝐡 𝐚 𝐯𝐚𝐥𝐢𝐝 𝐧𝐮𝐦𝐛𝐞𝐫.");

    // ধাপ ১: মেইন ক্যাটাগরি সিলেক্ট করা
    if (Reply.step === 1) {
      if (input < 1 || input > Reply.categories.length) {
        return message.reply("❌ | 𝐍𝐨𝐭𝐡𝐢𝐧𝐠 𝐡𝐞𝐫𝐞. 𝐏𝐥𝐞𝐚𝐬𝐞 𝐫𝐞𝐩𝐥𝐲 𝐰𝐢𝐭𝐡 𝐚 𝐯𝐚𝐥𝐢𝐝 𝐧𝐮𝐦𝐛𝐞𝐫.");
      }

      const selectedMainCat = Reply.categories[input - 1];
      
      // সাব-ক্যাটাগরির নাম বের করার ফিক্স
      const subCatsData = Reply.rawData[selectedMainCat]; 
      const subCats = subCatsData.map(item => item.name);

      let msg = `✦ ──『 ${toBold(selectedMainCat.toUpperCase())} 』── ✦\n\n`;
      subCats.forEach((sub, index) => {
        msg += `  ${toBold((index + 1).toString())} ❯ ${toBold(sub.toUpperCase())}\n`;
      });
      msg += `\n💬 | 𝐑𝐞𝐩𝐥𝐲 𝐰𝐢𝐭𝐡 𝐚 𝐧𝐮𝐦𝐛𝐞𝐫 𝐭𝐨 𝐠𝐞𝐭 𝐭𝐡𝐞 𝐯𝐢𝐝𝐞𝐨.`;

      try { await message.unsend(Reply.messageID); } catch (e) {}

      return message.reply(msg, (err, info) => {
        if (err || !info) return;
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          author: event.senderID,
          messageID: info.messageID,
          step: 2,
          mainCat: selectedMainCat,
          subCats: subCats
        });
      });
    }

    // ধাপ ২: সাব-ক্যাটাগরি সিলেক্ট করে ভিডিও পাঠানো
    if (Reply.step === 2) {
      if (input < 1 || input > Reply.subCats.length) {
        return message.reply("❌ | 𝐍𝐨𝐭𝐡𝐢𝐧𝐠 𝐡𝐞𝐫𝐞. 𝐏𝐥𝐞𝐚𝐬𝐞 𝐫𝐞𝐩𝐥𝐲 𝐰𝐢𝐭𝐡 𝐚 𝐯𝐚𝐥𝐢𝐝 𝐧𝐮𝐦𝐛𝐞𝐫.");
      }

      const selectedSubCat = Reply.subCats[input - 1];
      try { await message.unsend(Reply.messageID); } catch (e) {}
      
      return sendVideo(message, Reply.mainCat, selectedSubCat);
    }
  }
};

async function sendVideo(message, mainCat, subCat) {
  const waitMsg = await message.reply(`⏳ | 𝐋𝐨𝐚𝐝𝐢𝐧𝐠 ${toBold(subCat.toUpperCase())}...`);
  const filePath = path.join(CACHE, `mood_${Date.now()}.mp4`);

  try {
    const response = await axios({
      method: "GET",
      url: `${API}/api/media`,
      params: { category: mainCat, subcategory: subCat },
      responseType: "stream",
      timeout: 120000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    // চেক করা API থেকে ভিডিও আসছে নাকি JSON এরর আসছে
    const contentType = String(response.headers["content-type"] || "").toLowerCase();
    if (contentType.includes("text/html") || contentType.includes("application/json")) {
      throw new Error("API returned an invalid media format.");
    }

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
      response.data.on("error", reject);
    });

    try { await message.unsend(waitMsg.messageID); } catch (e) {}

    await message.reply({
      body: `✦ ──『 ${toBold(mainCat.toUpperCase())} 』── ✦\n\n  🎬 ❯ ${toBold(subCat.toUpperCase())}\n\n🔗 | 𝐃𝐢𝐚𝐛𝐥𝐨 𝐌𝐨𝐨𝐝𝐬𝐰𝐢𝐧𝐠𝐬 𝐀𝐏𝐈`,
      attachment: fs.createReadStream(filePath)
    });

    setTimeout(() => { fs.unlink(filePath).catch(() => {}); }, 60000);

  } catch (error) {
    console.error("Video Download Error:", error.message);
    try { await message.unsend(waitMsg.messageID); } catch (e) {}
    return message.reply("❌ | 𝐅𝐚𝐢𝐥𝐞𝐝 𝐭𝐨 𝐥𝐨𝐚𝐝 𝐯𝐢𝐝𝐞𝐨. Please try again.");
  }
}
