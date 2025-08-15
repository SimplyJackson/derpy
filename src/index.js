import 'dotenv/config';
import {
	Client,
	GatewayIntentBits,
	Collection,
	Events,
	ActivityType,
	MessageFlags,
} from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as store from './utils/store/index.js';
import * as utils from './utils/utils.js';

const ownerIds = ['354349329076584459', '1405722099154419795']; // no yonkit!, I dont even know if it works, :skull:

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessageReactions,
	],
});
client.commands = new Collection();
client.store = store;
client.utils = utils;

function* walk(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(full);
		else if (entry.isFile() && full.endsWith('.js')) yield full;
	}
}

// client.on(Events.InteractionCreate, async interaction => {
//   try {
//     if (interaction.isStringSelectMenu() && interaction.customId.startsWith('derpy:sbprofile:')) {
//       const [, , ownerId, uuid] = interaction.customId.split(':');
//       if (interaction.user.id !== ownerId) {
//         return interaction.reply({ ephemeral: true, content: 'This selector belongs to someone else.' });
//       }
//       if (!process.env.HYPIXEL_API_KEY) {
//         return interaction.reply({ ephemeral: true, content: 'Missing HYPIXEL_API_KEY in .env' });
//       }

//       const profileId = interaction.values[0];
//       const res = await fetch(`https://api.hypixel.net/v2/skyblock/profile?profile=${profileId}`, {
//         headers: { 'API-Key': process.env.HYPIXEL_API_KEY }
//       });
//       const data = await res.json().catch(() => null);
//       if (!data || !data.success) {
//         return interaction.reply({ ephemeral: true, content: `Failed to fetch profile: ${data?.cause || 'unknown error'}` });
//       }

//       const pr = data.profile;
//       const m = pr?.members?.[uuid] || {};
//       const purse = m.coin_purse ?? 0;
//       const bank = pr?.banking?.balance ?? 0;
//       const fairy = m.fairy_souls_collected ?? 0;
//       const lastSave = m.last_save ?? null;

//       const embed = new EmbedBuilder()
//         .setColor(0x2B2D31)
//         .setAuthor({ name: interaction.message.embeds?.[0]?.author?.name || 'Player', iconURL: `https://mc-heads.net/avatar/${uuid}/128` })
//         .setTitle(`SkyBlock Profile • ${pr?.cute_name || 'Unknown'}`)
//         .addFields(
//           { name: 'Purse', value: `${purse.toLocaleString('en-US')} coins`, inline: true },
//           { name: 'Bank', value: `${bank.toLocaleString('en-US')} coins`, inline: true },
//           { name: 'Total', value: `${(purse + bank).toLocaleString('en-US')} coins`, inline: true },
//           { name: 'Fairy Souls', value: `${(fairy || 0).toLocaleString('en-US')}`, inline: true },
//           { name: 'Last Save', value: lastSave ? `<t:${Math.floor(lastSave / 1000)}:R>` : 'Unknown', inline: true }
//         )
//         .setFooter({ text: '• Derpy', iconURL: 'attachment://derpy.webp' });

//       await interaction.update({
//         embeds: [embed],
//         components: interaction.message.components,
//         files: [{ attachment: 'derpy.webp', name: 'derpy.webp' }]
//       });
//     }
//   } catch (e) {
//     let message = 'Something went wrong.';
//     if (ownerIds.includes(interaction.user.id)) message += `\n\`\`\`${e.message || e}\`\`\``;
//     await interaction.reply({ flags: MessageFlags.Ephemeral, content: message }).catch(() => {});
//   }
// });

/*
Not needed anymore, this is now in src/commands/skyblock.js
 Just make a selectExecute function in the command file
i over thoght it im pretty sure

I think my copilot just did it all for me, so I will just leave this here
okay sounds good



*/
// Walk commands directory and dynamically import commands
for (const filePath of walk(path.join(process.cwd(), 'src', 'commands'))) {
	const mod = await import(pathToFileURL(filePath).href);
	const cmd = mod?.default ?? mod;
	if (cmd?.data && typeof cmd.execute === 'function') {
		client.commands.set(cmd.data.name, cmd);
		console.log(
			`↳ loaded command /${cmd.data.name} from ${path.relative(
				process.cwd(),
				filePath
			)}`
		);
	} else {
		console.warn(`${path.relative(process.cwd(), filePath)} error`);
	}
}

// Walk events directory and dynamically import events
for (const filePath of walk(path.join(process.cwd(), 'src', 'events'))) {
	const mod = await import(pathToFileURL(filePath).href);
	const event = mod?.default ?? mod;
	if (event?.name && typeof event.execute === 'function') {
		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args));
		} else {
			client.on(event.name, (...args) => event.execute(...args));
		}
		console.log(
			`↳ loaded event ${event.name} from ${path.relative(
				process.cwd(),
				filePath
			)}`
		);
	} else {
		console.warn(`${path.relative(process.cwd(), filePath)} error`);
	}
}

client.on(Events.InteractionCreate, async (interaction) => {
	try {
		if (interaction.isChatInputCommand()) {
			const command = client.commands.get(interaction.commandName);
			if (!command) return;
			await command.execute(interaction);
			return;
		}
		if (interaction.isAutocomplete()) {
			const command = client.commands.get(interaction.commandName);
			if (!command || typeof command.autocomplete !== 'function') return;
			await command.autocomplete(interaction);
			return;
		}
		if (interaction.isButton()) {
			const [prefix, action, ...args] = interaction.customId.split(':');
			if (prefix !== 'derpy') return;
			const command = client.commands.get(action);
			if (!command || typeof command.buttonExecute !== 'function') return;
			await command.buttonExecute(interaction, ...args);
			return;
		}
		if (interaction.isModalSubmit()) {
			const [prefix, action, ...args] = interaction.customId.split(':');
			if (prefix !== 'derpy') return;
			const command = client.commands.get(action);
			if (!command || typeof command.modalExecute !== 'function') return;
			await command.modalExecute(interaction, ...args);
			return;
		}
		if (interaction.isContextMenuCommand()) {
			const command = client.commands.get(interaction.commandName);
			if (!command || typeof command.contextExecute !== 'function') return;
			await command.contextExecute(interaction);
			return;
		}
		if (interaction.isStringSelectMenu()) {
			const [prefix, action, ...args] = interaction.customId.split(':');
			if (prefix !== 'derpy') return;
			const command = client.commands.get(action);
			if (!command || typeof command.selectExecute !== 'function') return;
			await command.selectExecute(interaction, ...args);
			return;
		}
		console.warn(`Unknown interaction type: ${interaction.type}`);
	} catch (e) {
		console.error('interaction error:', e);
		if (interaction.isRepliable()) {
			const msg = {
				flags: MessageFlags.Ephemeral,
				content: '❌ Something went wrong.',
			};
			if (ownerIds.includes(interaction.user.id))
				msg.content += `\n\`\`\`${e.message || e}\`\`\``;
			if (interaction.deferred || interaction.replied)
				await interaction.followUp(msg);
			else await interaction.reply(msg);
		}
	}
});

if (!process.env.TOKEN) {
	console.error('❌ Missing TOKEN in .env');
	process.exit(1);
}
client.login(process.env.TOKEN);

export default client;
