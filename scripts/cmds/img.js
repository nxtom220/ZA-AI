const axios = require("axios");

const API = process.env.IMG_API || "https://gpt-img-seven.vercel.app/api/generate";

const RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4", "2:3", "3:2"];
const ALIAS = {
  g2: "gpt-image-2", gpt: "gpt-image-2", img2: "gpt-image-2", "2": "gpt-image-2",
  f: "gpt-image-2.6-flare", flare: "gpt-image-2.6-flare",
  sb: "gpt-image-2.6-sunburst", sun: "gpt-image-2.6-sunburst", sunburst: "gpt-image-2.6-sunburst",
  sd: "seedream", seed: "seedream",
  n2: "gemini", nb: "gemini", banana: "gemini",
  npro: "nano-banana-pro", pro: "nano-banana-pro",
  fx: "flux", flux: "flux"
};

module.exports = {
  config: {
    name: "img",
    aliases: ["imagine", "gen"],
    version: "1.4",
    role: 0,
    author: "Rafix4x",
    countDown: 8,
    longDescription: "Generate an image from text, or edit a replied photo",
    category: "image",
    guide: { en: "{pn} <prompt> -v flare -r 16:9 · {pn} -v list · reply to a photo to edit" }
  },

  onStart: async function ({ api, message, event, args }) {
    let model = "gpt-image-2.6-flare";
    let ratio = "1:1";
    const words = [];

    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      const lc = a.toLowerCase();
      if (a === "-v" || a === "--v" || a === "-model") model = args[++i] || "";
      else if (lc.startsWith("-v=") || lc.startsWith("--v=")) model = a.split("=")[1];
      else if (a === "-r" || a === "--r" || a === "-ratio") ratio = args[++i] || "";
      else if (lc.startsWith("-r=") || lc.startsWith("--r=") || lc.startsWith("-ratio=")) ratio = a.split("=")[1];
      else words.push(a);
    }

    if (!RATIOS.includes(ratio)) ratio = "1:1";

    let models = [];
    try {
      models = (await axios.get(`${API}?models=1`, { timeout: 30000 })).data.models || [];
    } catch (e) {
      return message.reply("⚠️ api down");
    }

    if (model === "list" || model === "ls") {
      return message.reply(models.map((m) => m.id).join("\n"));
    }

    const byId = models.find((m) => m.id === String(model).toLowerCase());
    const picked = ALIAS[String(model).toLowerCase()] || byId?.id || models.find((m) => m.id.includes(String(model).toLowerCase()))?.id;
    if (!picked) return message.reply("⚠️ unknown model · /img -v list");

    const prompt = words.join(" ").trim();
    const att = event.messageReply?.attachments?.[0];
    const raw = att && (att.url || att.previewUrl || att.largePreviewUrl || att.image_url);
    const isImg = raw && (!att.type || /photo|image/.test(att.type));

    if (!prompt && !isImg) {
      return message.reply(`/img <prompt> -v flare -r 16:9\n/img -v list\nreply to a photo to edit`);
    }

    const body = { prompt: prompt || "improve this image", model: picked, ratio };
    if (isImg) body.reference_url = raw;

    try {
      api.setMessageReaction("⏳", event.messageID, event.threadID, () => {}, true);
      const d = (await axios.post(API, body, { timeout: 300000 })).data;
      if (!d.images?.length) throw new Error(`no image ${JSON.stringify(d).slice(0, 160)}`);
      const img = await axios.get(d.images[0], { responseType: "stream", timeout: 120000 });
      await message.reply({ body: d.model, attachment: img.data });
      api.setMessageReaction("✅", event.messageID, event.threadID, () => {}, true);
    } catch (e) {
      const d = e.response?.data;
      const why = d ? (d.error || d.detail?.error || JSON.stringify(d).slice(0, 180)) : e.message;
      console.error("[img]", why);
      api.setMessageReaction("❌", event.messageID, event.threadID, () => {}, true);
      message.reply("❌ " + why);
    }
  }
};
