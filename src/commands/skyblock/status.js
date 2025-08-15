import {
	SlashCommandBuilder,
	EmbedBuilder,
	ButtonBuilder,
	ActionRowBuilder,
	ButtonStyle,
	MessageFlags,
} from 'discord.js';

const formatName = (str) =>
	!str
		? 'Unknown'
		: String(str)
				.toLowerCase()
				.split('_')
				.map((w) => w[0]?.toUpperCase() + w.slice(1))
				.join(' ');

export default {
	data: new SlashCommandBuilder()
		.setName('status')
		.setDescription('Show Hypixel online status & SkyBlock island')
		.addStringOption((o) =>
			o
				.setName('username')
				.setDescription('Minecraft IGN (optional if linked)')
				.setRequired(false)
		),

	async execute(interaction) {
		const key = process.env.HYPIXEL_API_KEY;
		if (!key)
			return interaction.reply({
				content: '❌ Missing HYPIXEL_API_KEY in `.env`.',
				flags: MessageFlags.Ephemeral,
			});

		await interaction.deferReply();

		const optIgn = interaction.options.getString('username');
		let uuid, name;

		if (optIgn) {
			const r = await fetch(
				`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(
					optIgn
				)}`
			);
			if (r.status === 204)
				return interaction.editReply(`❌ Player \`${optIgn}\` not found.`);
			if (!r.ok) return interaction.editReply('❌ Mojang lookup failed.');
			const m = await r.json();
			uuid = m.id;
			name = m.name;
		} else {
			const link = interaction.client.store.getLink(interaction.user.id);
			if (!link) {
				return interaction.editReply(
					'❌ Not linked. Use `/link ign:<YourIGN>` or run `/status username:<IGN>`.'
				);
			}
			uuid = link.uuid;
			name = link.ign;
		}

		const sRes = await fetch(`https://api.hypixel.net/v2/status?uuid=${uuid}`, {
			headers: { 'API-Key': key },
		});
		const sData = await sRes.json().catch(() => ({}));
		if (!sData?.success)
			return interaction.editReply(
				`❌ Hypixel error: ${sData?.cause || 'status endpoint'}`
			);

		const s = sData.session || {};
		const online = !!s.online;
		const dot = online ? '🟢' : '🔴';
		const gamePretty = formatName(s.gameType || 'Unknown');
		const mapRaw = s.map || '';
		const islandPretty =
			!mapRaw || mapRaw.toLowerCase() === 'dynamic'
				? 'Private Island'
				: formatName(mapRaw);

		const embed = new EmbedBuilder()
			.setColor(online ? 0x57f287 : 0xed4245)
			.setAuthor({ name, iconURL: `https://mc-heads.net/avatar/${uuid}/128` })
			.addFields(
				{ name: 'Status', value: `${dot} ${online ? 'Online' : 'Offline'}` },
				{ name: 'Game', value: gamePretty },
				...(gamePretty === 'Skyblock' && online
					? [{ name: 'Island', value: islandPretty }]
					: [])
			)
			.setFooter({ text: '• Derpy', iconURL: 'attachment://derpy.webp' });

		const button = new ButtonBuilder()
			.setCustomId(`derpy:status:${uuid}`)
			.setLabel(online ? 'Time Online' : 'Last Login')
			.setStyle(ButtonStyle.Primary);

		const row = new ActionRowBuilder().addComponents(button);

		await interaction.editReply({
			embeds: [embed],
			components: [row],
			files: [{ attachment: 'derpy.webp', name: 'derpy.webp' }],
		});
	},

	async buttonExecute(interaction, uuid) {
		if (!uuid)
			return interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: 'Missing UUID.',
			});
		if (!process.env.HYPIXEL_API_KEY) {
			return interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: 'Missing HYPIXEL_API_KEY in .env',
			});
		}

		const sRes = await fetch(`https://api.hypixel.net/v2/status?uuid=${uuid}`, {
			headers: { 'API-Key': process.env.HYPIXEL_API_KEY },
		});
		const sData = await sRes.json().catch(() => ({}));
		const online = !!sData?.session?.online;

		const pRes = await fetch(`https://api.hypixel.net/v2/player?uuid=${uuid}`, {
			headers: { 'API-Key': process.env.HYPIXEL_API_KEY },
		});
		const pData = await pRes.json().catch(() => ({}));
		const lastLogin = pData?.player?.lastLogin;

		const fmt = (ms) => {
			const s = Math.floor(ms / 1000);
			const d = Math.floor(s / 86400);
			const h = Math.floor((s % 86400) / 3600);
			const m = Math.floor((s % 3600) / 60);
			return [d && `${d}d`, h && `${h}h`, `${m}m`].filter(Boolean).join(' ');
		};

		if (online && lastLogin) {
			const ms = Date.now() - lastLogin;
			return interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: `🕒 Online for **${fmt(ms)}** (since <t:${Math.floor(
					lastLogin / 1000
				)}:R>).`,
			});
		}
		if (!online && lastLogin) {
			return interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: `🕒 Last login: <t:${Math.floor(
					lastLogin / 1000
				)}:F> (<t:${Math.floor(lastLogin / 1000)}:R>).`,
			});
		}
		return interaction.reply({
			flags: MessageFlags.Ephemeral,
			content: 'No login information available.',
		});
	},
};
