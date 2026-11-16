/**
 * Event guard: stops the bot from running the same message twice and from
 * running messages that were sent before the bot started.
 *
 * Why this exists: when the bot (re)connects to Messenger, the server replays
 * the messages that arrived while it was offline (and the last few it already
 * delivered). Without a guard every one of those is handled again as if it was
 * just sent, so commands you tested before a restart run a second time.
 *
 * Two layers:
 *  1. Persistent de-duplication by messageID (survives restarts, kept in
 *     database/data/processedEvents.json).
 *  2. Stale filter: events whose timestamp is older than the moment this
 *     process started (minus a small grace period) are dropped.
 *
 * Config (all optional, config.json -> ignoreOldMessages):
 *   enable   : true  - turn the guard on/off
 *   graceMs  : 15000 - how far before the bot start time an event is still accepted
 *   keep     : 3000  - how many message ids are remembered
 */
const fs = require("fs-extra");
const path = require("path");

const FILE = path.join(process.cwd(), "database", "data", "processedEvents.json");
const TMP = FILE + ".tmp";
const DEDUPE_TYPES = new Set(["message", "message_reply", "message_unsend"]);
const STALE_TYPES = new Set(["message", "message_reply", "message_unsend", "message_reaction", "event"]);

const seen = new Set();
let dirty = false;
let timer = null;
let skippedOld = 0;
let skippedDup = 0;
let summaryTimer = null;

function getOptions() {
	const cfg = (global.GoatBot && global.GoatBot.config && global.GoatBot.config.ignoreOldMessages) || {};
	return {
		enable: cfg.enable !== false,
		graceMs: Number.isFinite(Number(cfg.graceMs)) ? Number(cfg.graceMs) : 15000,
		keep: Number.isFinite(Number(cfg.keep)) && Number(cfg.keep) > 0 ? Number(cfg.keep) : 3000
	};
}

function load() {
	try {
		if (!fs.existsSync(FILE))
			return;
		const list = JSON.parse(fs.readFileSync(FILE, "utf-8"));
		if (Array.isArray(list))
			for (const id of list)
				seen.add(String(id));
	}
	catch (e) {
		// corrupt file: start clean, it is only a cache
	}
}

function flush() {
	if (!dirty)
		return;
	dirty = false;
	try {
		fs.ensureDirSync(path.dirname(FILE));
		fs.writeFileSync(TMP, JSON.stringify([...seen]));
		fs.renameSync(TMP, FILE);
	}
	catch (e) {
		// best effort only
	}
}

function scheduleFlush() {
	dirty = true;
	if (timer)
		return;
	timer = setTimeout(() => {
		timer = null;
		flush();
	}, 1000);
	if (timer.unref)
		timer.unref();
}

function remember(id, keep) {
	seen.add(id);
	while (seen.size > keep)
		seen.delete(seen.values().next().value);
	scheduleFlush();
}

function normalizeTimestamp(ts) {
	let n = Number(ts);
	if (!Number.isFinite(n) || n <= 0)
		return null;
	if (n < 1e12) // seconds -> ms
		n *= 1000;
	return n;
}

function logSummary() {
	if (summaryTimer)
		return;
	summaryTimer = setTimeout(() => {
		summaryTimer = null;
		try {
			global.utils.log.info("EVENT GUARD", `Ignored ${skippedOld} old and ${skippedDup} duplicate event(s) replayed by Messenger`);
		}
		catch (e) { /* ignore */ }
		skippedOld = 0;
		skippedDup = 0;
	}, 3000);
	if (summaryTimer.unref)
		summaryTimer.unref();
}

/**
 * @returns {boolean} true when the event must NOT be handled
 */
function shouldSkip(event) {
	const options = getOptions();
	if (!options.enable || !event || !event.type)
		return false;

	if (STALE_TYPES.has(event.type)) {
		const startedAt = (global.GoatBot && global.GoatBot.startTime) || processStart;
		const ts = normalizeTimestamp(event.timestamp);
		if (ts !== null && ts < startedAt - options.graceMs) {
			skippedOld++;
			logSummary();
			return true;
		}
	}

	if (DEDUPE_TYPES.has(event.type) && event.messageID) {
		const key = `${event.type === "message_unsend" ? "unsend" : "msg"}:${event.messageID}`;
		if (seen.has(key)) {
			skippedDup++;
			logSummary();
			return true;
		}
		remember(key, options.keep);
	}
	return false;
}

const processStart = Date.now();
load();
process.on("exit", flush);

module.exports = { shouldSkip, flush };
