const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const http = require("http");
const https = require("https");

// reuse connections = faster requests
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 32 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 32 });

// Same downloader API that ytb.js already uses
const API = "https://dl.neokex.xyz";
const TMP_DIR = path.join(process.cwd(), "scripts", "cmds", "tmp");
const MAX_SIZE = 500 * 1024 * 1024; // max video size (500MB)
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
	"bilibili.com",
	"douyin.com", "kwai.com", "kuaishou.com", "sharechat.com", "rumble.com"
];

const URL_REGEX = /https?:\/\/[^\s<>"'\]\[]+/gi;
const inProgress = new Set();
const handledMessages = new Set();

function isSupported(link) {
	try {
		const host = new URL(link).hostname.toLowerCase().replace(/^www\./, "");
		return SUPPORTED.some(d => host === d || host.endsWith("." + d));
	}
	catch (e) {
		return false;
	}
}

// Messenger wraps shared links like https://l.facebook.com/l.php?u=<real link>
function unwrapRedirect(link) {
	try {
		const url = new URL(link);
		if (/(^|\.)facebook\.com$/.test(url.hostname) && /^\/(l\.php|flx\/warn)/.test(url.pathname)) {
			const real = url.searchParams.get("u");
			if (real)
				return real;
		}
	}
	catch (e) { }
	return link;
}

function extractLinks(text) {
	const links = String(text || "").match(URL_REGEX) || [];
	return [...new Set(links.map(l => unwrapRedirect(l.replace(/[).,!?]+$/, ""))))].filter(isSupported);
}

// Walk through ANY nested value of the attachment and collect every string in it.
// Messenger puts the shared link in different fields depending on the app / platform
// (url, facebookUrl, target.url, story_attachment.url, source, description ...),
// so we do not guess the field name, we scan all of them.
function collectStrings(value, out, depth) {
	if (depth > 6 || value == null)
		return out;
	if (typeof value === "string")
		out.push(value);
	else if (Array.isArray(value))
		for (const v of value)
			collectStrings(v, out, depth + 1);
	else if (typeof value === "object")
		for (const k of Object.keys(value))
			collectStrings(value[k], out, depth + 1);
	return out;
}

function linksFromString(str) {
	const variants = [str];
	try { variants.push(decodeURIComponent(str)); } catch (e) { }
	const found = [];
	for (const v of variants)
		for (const l of (String(v).match(URL_REGEX) || []))
			found.push(unwrapRedirect(l.replace(/[).,!?]+$/, "")));
	return found.filter(isSupported);
}

// links from ONE message object: its body text first, then its attachments.
// A shared card (attachment type "share") usually only carries a preview image url,
// the real link is in the message body, so the body is always read first.
function linksFromMessage(msg) {
	const found = [];
	if (!msg || typeof msg !== "object")
		return found;
	for (const l of linksFromString(String(msg.body || "")))
		if (!found.includes(l))
			found.push(l);
	const attachments = Array.isArray(msg.attachments) ? msg.attachments : [];
	for (const att of attachments) {
		if (!att || typeof att !== "object")
			continue;
		// photos / voice / stickers never carry a downloadable page link
		if (["photo", "sticker", "audio", "animated_image"].includes(att.type))
			continue;
		for (const str of collectStrings(att, [], 0))
			for (const link of linksFromString(str))
				if (!found.includes(link))
					found.push(link);
	}
	return found;
}

function collectLinks(event) {
	let found = linksFromMessage(event);
	// the link may sit in a field we do not know about: scan the whole event object
	if (!found.length) {
		try {
			const rest = { ...event };
			delete rest.participantIDs;
			for (const str of collectStrings(rest, [], 0))
				for (const l of linksFromString(str))
					if (!found.includes(l))
						found.push(l);
		}
		catch (e) { }
	}
	// replying to a shared link with the word "autodl" downloads the replied message's link
	if (!found.length && event.messageReply && /autodl|autodown/i.test(String(event.body || "")))
		found = linksFromMessage(event.messageReply);
	// non-facebook links first (a shared card can also contain a facebook.com redirect)
	found.sort((x, y) => Number(/facebook\.com|fb\.com/.test(hostOf(x))) - Number(/facebook\.com|fb\.com/.test(hostOf(y))));
	return found;
}

// call an api method that may use a callback OR return a promise, with a timeout
function callApi(run) {
	return new Promise(resolve => {
		let done = false;
		const finish = v => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
		const timer = setTimeout(() => finish(null), 8000);
		try {
			const r = run((err, data) => finish(err ? null : data));
			if (r && typeof r.then === "function")
				r.then(finish).catch(() => finish(null));
		}
		catch (e) { finish(null); }
	});
}

// Shared cards (TikTok / Instagram app "share to Messenger") reach the bot without the link.
// Ask Facebook for the same message again, its full data still has the link.
async function linksViaLookup(api, event) {
	const { threadID, messageID } = event;
	const tries = [];
	for (const name of ["getMessage", "getMessageInfo", "fetchMessage"])
		if (typeof api[name] === "function")
			tries.push(() => callApi(cb => api[name](threadID, messageID, cb)));
	if (typeof api.getThreadHistory === "function")
		tries.push(() => callApi(cb => api.getThreadHistory(threadID, 10, null, cb)));
	for (const t of tries) {
		const data = await t();
		if (!data)
			continue;
		const list = Array.isArray(data) ? data : [data];
		const same = list.filter(m => m && String(m.messageID) === String(messageID));
		for (const m of (same.length ? same : list.slice(-3))) {
			const got = [];
			try {
				for (const str of collectStrings(m, [], 0))
					for (const l of linksFromString(str))
						if (!got.includes(l))
							got.push(l);
			}
			catch (e) { }
			if (got.length && (same.length || String(m.senderID) === String(event.senderID)))
				return got;
		}
	}
	return [];
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

function hostOf(link) {
	try {
		return new URL(link).hostname.toLowerCase().replace(/^www\./, "");
	}
	catch (e) {
		return "";
	}
}

function absUrl(u, base) {
	if (!u || typeof u !== "string")
		return null;
	if (/^https?:\/\//i.test(u))
		return u;
	if (u.startsWith("//"))
		return "https:" + u;
	if (u.startsWith("/"))
		return base + u;
	return u;
}

// short links (vt.tiktok.com, fb.watch, ...) -> real link
async function resolveUrl(link) {
	try {
		const res = await axios.get(link, {
			timeout: 15000,
			maxRedirects: 5,
			responseType: "stream",
			headers: { "user-agent": USER_AGENT },
			validateStatus: () => true
		});
		const finalUrl = (res.request && res.request.res && res.request.res.responseUrl) || link;
		res.data.destroy();
		return finalUrl;
	}
	catch (e) {
		return link;
	}
}

async function viaNeokex(link) {
	const { data } = await axios.get(`${API}/dl`, {
		params: { url: link },
		timeout: 40000,
		httpAgent, httpsAgent,
		headers: { "user-agent": USER_AGENT }
	});
	if (!data || data.status === false || !data.result)
		throw new Error((data && data.message) || "API returned no result");
	const result = data.result;
	let media = (result.media || []).filter(m => m && m.url);
	if (!media.length) {
		const single = result.video || result.url || result.download || result.play;
		if (typeof single === "string")
			media = [{ type: "video", quality: "hd", url: single, extension: "mp4" }];
	}
	if (!media.length)
		throw new Error("No downloadable media found");
	return { title: result.title || "", media };
}

async function viaTikwm(link) {
	const base = "https://www.tikwm.com";
	const { data } = await axios.get(`${base}/api/`, {
		params: { url: link, hd: 1 },
		timeout: 15000,
		httpAgent, httpsAgent,
		headers: { "user-agent": USER_AGENT }
	});
	if (!data || data.code !== 0 || !data.data)
		throw new Error((data && data.msg) || "API returned no result");
	const d = data.data;
	const media = [];
	if (d.hdplay)
		media.push({ type: "video", quality: "hd", url: absUrl(d.hdplay, base), extension: "mp4" });
	if (d.play)
		media.push({ type: "video", quality: "sd", url: absUrl(d.play, base), extension: "mp4" });
	if (!media.length && Array.isArray(d.images) && d.images.length)
		media.push({ type: "image", quality: "hd", url: absUrl(d.images[0], base), extension: "jpg" });
	const valid = media.filter(m => m.url);
	if (!valid.length)
		throw new Error("No downloadable media found");
	return { title: d.title || "", media: valid };
}

// tries several sources AT THE SAME TIME, the first one that works wins (faster than one after another)
async function fetchMedia(link) {
	const isTiktok = /(^|\.)tiktok\.com$/.test(hostOf(link));
	const providers = isTiktok
		? [
			["tikwm", () => viaTikwm(link)],
			["neokex", async () => viaNeokex(await resolveUrl(link))]
		]
		: [
			["neokex", () => viaNeokex(link)],
			["neokex-resolved", async () => {
				const resolved = await resolveUrl(link);
				if (resolved === link)
					throw new Error("link has no redirect");
				return viaNeokex(resolved);
			}]
		];
	const errors = [];
	const runs = providers.map(([name, run]) => run().catch(err => {
		const msg = (err && err.response && err.response.status ? `HTTP ${err.response.status}` : (err && err.message)) || "unknown error";
		errors.push(`${name}: ${msg}`);
		throw err;
	}));
	try {
		return await Promise.any(runs);
	}
	catch (e) {
		throw new Error(errors.join(" | ") || "all sources failed");
	}
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

// asks the server for the first byte only, to learn the total size and if parallel download works
async function probeRange(url) {
	try {
		const r = await axios.get(url, {
			headers: { "user-agent": USER_AGENT, Range: "bytes=0-0" },
			responseType: "stream", timeout: 10000, maxRedirects: 5,
			httpAgent, httpsAgent, validateStatus: () => true
		});
		r.data.destroy();
		if (r.status === 206) {
			const m = /\/(\d+)\s*$/.exec(String(r.headers["content-range"] || ""));
			if (m)
				return Number(m[1]);
		}
	}
	catch (e) { }
	return 0;
}

async function downloadPart(url, filePath, start, end) {
	const r = await axios({
		url, method: "GET", responseType: "stream", timeout: 60000, maxRedirects: 5,
		headers: { "user-agent": USER_AGENT, Range: `bytes=${start}-${end}` },
		httpAgent, httpsAgent
	});
	if (r.status !== 206) {
		r.data.destroy();
		throw new Error("range not supported");
	}
	await new Promise((resolve, reject) => {
		const w = fs.createWriteStream(filePath, { flags: "r+", start });
		r.data.on("error", reject);
		w.on("error", reject);
		w.on("finish", resolve);
		r.data.pipe(w);
	});
}

// big files are downloaded in several parts at once (much faster), small / unsupported ones in one stream
async function downloadToFile(url, filePath) {
	const total = await probeRange(url);
	if (total > MAX_SIZE)
		throw new Error("too large");
	if (total >= 6 * 1024 * 1024) {
		try {
			const parts = Math.min(8, Math.ceil(total / (3 * 1024 * 1024)));
			const size = Math.ceil(total / parts);
			fs.writeFileSync(filePath, Buffer.alloc(0));
			fs.truncateSync(filePath, total);
			await Promise.all(Array.from({ length: parts }, (_, i) =>
				downloadPart(url, filePath, i * size, Math.min(total - 1, (i + 1) * size - 1))));
			if (fs.statSync(filePath).size !== total)
				throw new Error("size mismatch");
			return filePath;
		}
		catch (e) {
			removeFile(filePath);
		}
	}
	return downloadSingle(url, filePath);
}

async function downloadSingle(url, filePath) {
	const response = await axios({
		url,
		method: "GET",
		responseType: "stream",
		timeout: 600000,
		maxRedirects: 5,
		httpAgent, httpsAgent,
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

function decodeHtml(str) {
	return String(str || "")
		.replace(/&#x([0-9a-f]+);/gi, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch (e) { return ""; } })
		.replace(/&#(\d+);/g, (_, d) => { try { return String.fromCodePoint(parseInt(d, 10)); } catch (e) { return ""; } })
		.replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
		.replace(/\s+/g, " ").trim();
}

function platformName(link) {
	let host = "";
	try { host = new URL(link).hostname.toLowerCase().replace(/^www\./, ""); } catch (e) { }
	const map = [
		[/youtube\.com|youtu\.be/, "YOUTUBE"], [/facebook\.com|fb\.watch|fb\.com/, "FACEBOOK"],
		[/instagram\.com/, "INSTAGRAM"], [/tiktok\.com/, "TIKTOK"], [/twitter\.com|x\.com/, "TWITTER"],
		[/pinterest\.com|pin\.it/, "PINTEREST"], [/reddit\.com|redd\.it/, "REDDIT"], [/threads\.net/, "THREADS"],
		[/snapchat\.com/, "SNAPCHAT"], [/likee/, "LIKEE"], [/capcut\.com/, "CAPCUT"], [/vimeo\.com/, "VIMEO"],
		[/dailymotion\.com/, "DAILYMOTION"], [/soundcloud\.com/, "SOUNDCLOUD"], [/twitch\.tv/, "TWITCH"],
		[/linkedin\.com/, "LINKEDIN"], [/tumblr\.com/, "TUMBLR"], [/bilibili\.com/, "BILIBILI"]
	];
	for (const [re, name] of map)
		if (re.test(host))
			return name;
	return host.toUpperCase() || "UNKNOWN";
}

function formatSize(bytes) {
	const mb = bytes / (1024 * 1024);
	return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`;
}

function buildCaption({ title, link, kind, item, size, seconds }) {
	let t = decodeHtml(title) || "Untitled";
	if (t.length > 60)
		t = t.slice(0, 60).trim() + "…";
	const fileType = kind === "audio" ? "🎵 AUDIO" : kind === "image" ? "🖼️ IMAGE" : "🎬 VIDEO";
	const quality = String(item.quality || "HD").toUpperCase();
	return [
		"✅ DOWNLOAD COMPLETE ✅",
		"────────────────────",
		`💠 TITLE — ${t}`,
		`💠 PLATFORM — ${platformName(link)}`,
		`💠 FILE — ${fileType}`,
		`💠 QUALITY — ${quality}`,
		`💠 SIZE — ${formatSize(size)}`,
		`💠 TIME — ${seconds}s`,
		"────────────────────",
		"⚙️ POWERED BY AKASH"
	].join("\n");
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
			en: "Always on in every chat. Just send or share any video link, no command needed."
		}
	},

	// Required by the bot loader. Auto download is always active, there is nothing to turn on or off.
	onStart: async function () { },

	// Runs on every message. No prefix needed.
	onChat: async function ({ api, event, message }) {
		try {
			const { senderID, threadID, messageID } = event;
			// never react to the bot's own messages (prevents loops)
			if (String(senderID) === String(api.getCurrentUserID()))
				return;
			let links = collectLinks(event);
			if (!links.length && Array.isArray(event.attachments) && event.attachments.some(a => a && a.type === "share"))
				links = await linksViaLookup(api, event);
			if (!links.length) {
				const cards = (Array.isArray(event.attachments) ? event.attachments : []).filter(a => a && a.type === "share");
				if (cards.length) {
					// full event dump with long strings shortened, so the log stays readable
					try {
						console.log("[AUTODL] no link in event:", JSON.stringify(event, (k, v) => (typeof v === "string" && v.length > 140 ? v.slice(0, 140) + "…" : v)).slice(0, 3500));
					}
					catch (e) { }
					// the card has no link: nothing to download, only show ❌ (no text message).
					// only for video platforms, other link cards are ignored silently
					if (/tiktok|instagram|youtu|ytimg/.test(collectStrings(cards, [], 0).join(" ").toLowerCase()))
						react(api, messageID, "❌");
				}
				return;
			}

			// the same message can arrive twice, handle it only once
			if (messageID) {
				if (handledMessages.has(messageID))
					return;
				handledMessages.add(messageID);
				const timer = setTimeout(() => handledMessages.delete(messageID), 5 * 60 * 1000);
				if (timer && timer.unref)
					timer.unref();
			}

			const link = links[0];
			const lockKey = `${threadID}:${link}`;
			if (inProgress.has(lockKey))
				return;
			inProgress.add(lockKey);

			let filePath;
			try {
				const startedAt = Date.now();
				react(api, messageID, "⏳");
				const info = await fetchMedia(link);
				const { kind, item } = pickMedia(info.media);
				const ext = item.extension || (kind === "audio" ? "mp3" : kind === "image" ? "jpg" : "mp4");
				fs.ensureDirSync(TMP_DIR);
				filePath = path.join(TMP_DIR, `autodl_${Date.now()}_${safeName(info.title)}.${ext}`);
				await downloadToFile(item.url, filePath);
				const caption = buildCaption({
					title: info.title,
					link,
					kind,
					item,
					size: fs.statSync(filePath).size,
					seconds: ((Date.now() - startedAt) / 1000).toFixed(2)
				});
				await message.reply({
					body: caption,
					attachment: fs.createReadStream(filePath)
				});
				react(api, messageID, "✅");
			}
			catch (err) {
				react(api, messageID, "❌");
				const reason = String((err && err.message) || err || "unknown error");
				try {
					global.utils.log.err("AUTODL", `Download failed for ${link}`, reason);
				}
				catch (e) {
					console.log("[AUTODL] Download failed for", link, "|", reason);
				}
				// too large (>500MB): only the ❌ reaction, no text
				if (reason !== "too large")
					await message.reply(`❌ Download failed\n${reason.slice(0, 300)}`);
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
