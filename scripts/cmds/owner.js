const axios = require("axios");
const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "owner",
    aliases: ["admininfo", "info", "ownerinfo"],
    version: "2.1",
    author: "Toshiro Editz",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Show owner information"
    },
    category: "owner",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ message }) {
    const ownerName = "AKASH AHMED";
    const nickName = "ফু্ঁল্ঁ ও্ঁয়া্ঁলা্ঁ";
    const age = "19+";
    const dob = "08/02/2007";
    const religion = "Islam";
    const nationality = "Bangladeshi";
    const education = "Inter 1st Year";
    const university = "Social Media";
    const location = "Khulna";

    const game = "Uno / Free Fire";
    const hobby = "Music / Video Game / Sport";
    const dream = "Bow/Gf = Extract Kora";
    const goal = "Bow/Gf er oitaa";

    const facebook = "AK A SH";
    const messenger = "AK A SH";
    const whatsapp = "01410577478";

    const botName =
      global.GoatBot.config.nickNameBot ||
      global.GoatBot.config.nickNameBot ||
      "Unknown";

    const botSince = "12/07/2026";
    const videoLink = "https://i.imgur.com/RFGo2a1.mp4";

    const timeBD = moment().tz("Asia/Dhaka");

    const infoMsg =
`╭─ 💎 ᴏᴡɴᴇʀ ɪɴꜰᴏ 💎 ─╮
      │ 👤 ɴᴀᴍᴇ : ${ownerName}
      │ 🧬 ɴɪᴄᴋ : ${nickName}
      │ ⏳ ᴀɢᴇ : ${age}
      │ 🎂 ᴅᴏʙ : ${dob}
      │ 🕌 ʀᴇʟɪɢɪᴏɴ : ${religion}
      │ 🇧🇩 ɴᴀᴛɪᴏɴᴀʟɪᴛʏ : ${nationality}
      │ 📚 ᴇᴅᴜᴄᴀᴛɪᴏɴ : ${education}
      │ 🏫 ᴜɴɪᴠᴇʀꜱɪᴛʏ : ${university}
      │ 📍 ʟᴏᴄᴀᴛɪᴏɴ : ${location}
      ├─ ✨ ʟɪꜰᴇꜱᴛʏʟᴇ ─╮
      │ 🕹️ ɢᴀᴍᴇ : ${game}
      │ 🎧 ʜᴏʙʙʏ : ${hobby}
      │ 🌙 ᴅʀᴇᴀᴍ : ${dream}
      │ 🎯 ɢᴏᴀʟ : ${goal}
      ├─ 📞 ᴄᴏɴᴛᴀᴄᴛ ─╮
      │ 📘 ꜰᴀᴄᴇʙᴏᴏᴋ : ${facebook}
      │ 📩 ᴍᴇꜱꜱᴇɴɢᴇʀ : ${messenger}
      │ 💚 ᴡʜᴀᴛꜱᴀᴘᴘ : ${whatsapp}
      │ 🤖 ʙᴏᴛ ɴᴀᴍᴇ : ${botName}
      │ 📅 ʙᴏᴛ ꜱɪɴᴄᴇ : ${botSince}
      ├─ ⏰ ᴅᴀᴛᴇ & ᴛɪᴍᴇ ─╮
      │ 📆 ${timeBD.format("DD/MM/YYYY")}
      │ 🕒 ${timeBD.format("hh:mm:ss A")}
      ╰────────────────`;

    try {
      const response = await axios.get(videoLink, {
        responseType: "stream",
        timeout: 30000,
        maxRedirects: 5,
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });

      return message.reply({
        body: infoMsg,
        attachment: response.data
      });
    } catch (error) {
      console.error("[OWNER VIDEO ERROR]", error.message);
      return message.reply(infoMsg);
    }
  },

  onChat: async function ({ event, message }) {
    if (event.body?.trim().toLowerCase() === "info") {
      return this.onStart({ message, event });
    }
  }
};
