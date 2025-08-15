import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TOKEN = process.env.TOKEN;
const APP_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !APP_ID || !GUILD_ID) {
	console.error('❌ Need TOKEN, CLIENT_ID and GUILD_ID in .env');
	process.exit(1);
}

const commands = [];
const commandsRoot = path.join(process.cwd(), 'src', 'commands');

function* walk(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(full);
		else if (entry.isFile() && full.endsWith('.js')) yield full;
	}
}

for (const filePath of walk(commandsRoot)) {
	const mod = await import(pathToFileURL(filePath).href);
	const cmd = mod?.default ?? mod;
	if (!cmd?.data?.toJSON) {
		console.warn(
			`⚠️  Skipping ${path.relative(process.cwd(), filePath)} (no data)`
		);
		continue;
	}
	commands.push(cmd.data.toJSON());
	console.log(`➕ /${cmd.data.name}`);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

try {
	const data = await rest.put(
		Routes.applicationGuildCommands(APP_ID, GUILD_ID),
		{ body: commands }
	);
	console.log(`✅ Registered ${data.length} guild commands to ${GUILD_ID}`);
} catch (e) {
	console.error('❌ Slash deploy failed:', e);
	process.exit(1);
}
