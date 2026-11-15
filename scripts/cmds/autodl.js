const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

// Same downloader API that ytb.js already uses
const API = "https://dl.neokex.xyz";
const TMP_DIR = path.join(process.cwd(), "scripts", "cmds", "tmp");
const MAX_SIZE = 83 * 1024 * 1024; // Messenger upload limit used by ytb.js
const USER_AGENT = "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36";

// Any link that looks like one of these will be downloaded automatically
const SUPPORTED = [
	"youtube.com", "youtu.be",
	"facebook.com", "fb.watch", "fb.com", "m.facebook.com",
	"instagram.com",
	"tiktok.com", "vm.tiktok.com", "vt.tiktok.com",
	"twitter.com", "x.com",
	"pinterest.com", "pin.it",
	"reddit.com", "redd.it",
	"threads.net",
	"snapchat.com",
	"likee.video", "likee.com",
	"capcut.com",
	"vimeo.com",
	"dailymotion.com",
	"soundcloud.com",
	"twitch.tv",
	"linkedin.com",
	"tumblr.com",
	"bilibili.com"
];

const URL_REGEX = /https?:\/\/[^\s<>"'\]\[]+/gi;
const inProgress = new Set();

function extractLinks(text) {
	const links = String(text || "").match(URL_REGEX) || [];
	return [...new Set(links.map(l => l.replace(/[).,!?]+$/, "")))].filter(link => {
		try {
			const host = new URL(link).hostname.toLowerCase().replace(/^www\./, "");
			return SUPPORTED.some(d => host === d || host.endsWith("." + d));
		}
		catch (e) {
			return false;
		}
	});
}

function safeName(name) {
	return String(name || "media").replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 50) || "media";
}

function react(api, messageID, emoji) {
	try {
		api.setMessageReaction(emoji, messageID, () => { }, true);
	}
	catch (e) { }
}

async function fetchMedia(link) {
	const { data } = await axios.get(`${API}/dl`, {
		params: { url: link },
		timeout: 90000,
		headers: { "user-agent": USER_AGENT }
	});
	if (!data || data.status === false || !data.result)
		throw new Error((data && data.message) || "Download failed");
	const result = data.result;
	const media = (result.media || []).filter(m => m && m.url);
	if (!media.length)
		throw new Error("No downloadable media found");
	return { title: result.title || "", media };
}

function pickMedia(media) {
	const videos = media.filter(m => m.type === "video");
	if (videos.length) {
		for (const q of ["hd", "sd"]) {
			const found = videos.find(m => m.quality === q);
			if (found)
				return { kind: "video", item: found };
		}
		return { kind: "video", item: videos[0] };
	}
	const images = media.filter(m => m.type === "image" || m.type === "photo");
	if (images.length)
		return { kind: "image", item: images[0] };
	const audios = media.filter(m => m.type === "audio");
	if (audios.length)
		return { kind: "audio", item: audios[0] };
	return { kind: "video", item: media[0] };
}

async function downloadToFile(url, filePath) {
	const response = await axios({
		url,
		method: "GET",
		responseType: "stream",
		timeout: 120000,
		maxRedirects: 5,
		headers: { "user-agent": USER_AGENT }
	});
	const declared = Number(response.headers["content-length"]) || 0;
	if (declared > MAX_SIZE) {
		response.data.destroy();
		throw new Error("too large");
	}
	let received = 0;
	await new Promise((resolve, reject) => {
		const writer = fs.createWriteStream(filePath);
		response.data.on("data", chunk => {
			received += chunk.length;
			if (received > MAX_SIZE) {
				response.data.destroy();
				writer.destroy();
				reject(new Error("too large"));
			}
		});
		response.data.on("error", reject);
		writer.on("finish", resolve);
		writer.on("error", reject);
		response.data.pipe(writer);
	});
	if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0)
		throw new Error("Download produced no file");
	return filePath;
}

function removeFile(filePath) {
	try {
		if (filePath && fs.existsSync(filePath))
			fs.unlinkSync(filePath);
	}
	catch (e) { }
}

module.exports = {
	config: {
		name: "autodl",
		aliases: ["autodown", "autodownload"],
		version: "1.0",
		author: "AKASH",
		countDown: 3,
		role: 0,
		description: {
			en: "Automatically download videos when a link is sent in chat (YouTube, Facebook, TikTok, Instagram, Twitter/X, Pinterest, Reddit...)"
		},
		category: "media",
		guide: {
			en: "   {pn} on: turn on auto download in this chat"
				+ "\n   {pn} off: turn off auto download in this chat"
				+ "\n   Then just send any video link, no command needed."
		}
	},

	langs: {
		en: {
			turnedOn: "✅ Auto download is now ON in this chat.",
			turnedOff: "❎ Auto download is now OFF in this chat.",
			status: "Auto download is currently: %1"
		}
	},

	onStart: async function ({ args, event, message, threadsData, getLang }) {
		const sub = (args[0] || "").toLowerCase();
		if (sub === "on" || sub === "off") {
			await threadsData.set(event.threadID, sub === "on", "data.autodl");
			return message.reply(getLang(sub === "on" ? "turnedOn" : "turnedOff"));
		}
		const current = await threadsData.get(event.threadID, "data.autodl");
		return message.reply(getLang("status", current === false ? "OFF" : "ON") + "\n" + "Use: autodl on / autodl off");
	},

	// Runs on every message. No prefix needed.
	onChat: async function ({ api, event, message, threadsData }) {
		try {
			const { body, senderID, threadID, messageID } = event;
			if (!body || typeof body !== "string")
				return;
			// never react to the bot's own messages (prevents loops)
			if (String(senderID) === String(api.getCurrentUserID()))
				return;
			// per-thread switch (default ON)
			const enabled = await threadsData.get(threadID, "data.autodl");
			if (enabled === false)
				return;

			const links = extractLinks(body);
			if (!links.length)
				return;

			const link = links[0];
			const lockKey = `${threadID}:${link}`;
			if (inProgress.has(lockKey))
				return;
			inProgress.add(lockKey);

			let filePath;
			try {
				react(api, messageID, "⏳");
				const info = await fetchMedia(link);
				const { kind, item } = pickMedia(info.media);
				const ext = item.extension || (kind === "audio" ? "mp3" : kind === "image" ? "jpg" : "mp4");
				fs.ensureDirSync(TMP_DIR);
				filePath = path.join(TMP_DIR, `autodl_${Date.now()}_${safeName(info.title)}.${ext}`);
				await downloadToFile(item.url, filePath);
				await message.reply({
					body: info.title ? `📥 ${info.title}` : "📥 Downloaded",
					attachment: fs.createReadStream(filePath)
				});
				react(api, messageID, "✅");
			}
			catch (err) {
				react(api, messageID, "❌");
				if (err && err.message === "too large")
					await message.reply("❌ Video is bigger than 83MB, can't send it here.");
			}
			finally {
				inProgress.delete(lockKey);
				removeFile(filePath);
			}
		}
		catch (err) {
			// onChat must never crash the handler
		}
	}
};
