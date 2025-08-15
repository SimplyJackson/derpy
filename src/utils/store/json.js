import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = path.join(process.cwd(), 'data', 'links.json');

function ensure() {
	const dir = path.dirname(DB_PATH);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '{}', 'utf8');
}
function load() {
	ensure();
	try {
		return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
	} catch {
		return {};
	}
}
function save(db) {
	ensure();
	fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

export function getLink(discordId) {
	const db = load();
	return db[discordId] || null;
}

export function setLink(discordId, { uuid, ign }) {
	const db = load();
	db[discordId] = {
		discordId: String(discordId),
		uuid: String(uuid).toLowerCase(),
		ign,
		linkedAt: Date.now(),
	};
	save(db);
}

export function deleteLink(discordId) {
	const db = load();
	delete db[discordId];
	save(db);
}

export function listLinks() {
	const db = load();
	return Object.entries(db).map(([discordId, v]) => ({ discordId, ...v }));
}
