import { SlashCommandBuilder, MessageFlags } from 'discord.js';

const norm = (s) =>
	String(s ?? '')
		.trim()
		.toLowerCase();
const userTag = (u) =>
	u.discriminator && u.discriminator !== '0'
		? `${u.username}#${u.discriminator}`
		: u.username;

export default {
	data: new SlashCommandBuilder()
		.setName('link')
		.setDescription(
			'Link your Discord to your Hypixel account (uses Hypixel social profile)'
		)
		.addStringOption((o) =>
			o
				.setName('ign')
				.setDescription('Your Minecraft username')
				.setRequired(true)
		),

	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const ign = interaction.options.getString('ign', true);
		const discordId = interaction.user.id;

		const { getLink, setLink } = interaction.client.store;
		const existing = getLink(discordId);
		if (existing) {
			const when = existing.linkedAt
				? `<t:${Math.floor(existing.linkedAt / 1000)}:R>`
				: 'earlier';
			return interaction.editReply(
				`❌ You’ve already linked your account to **${existing.ign}** (${existing.uuid}).\n` +
					`Linked ${when}.`
			);
		}

		if (!process.env.HYPIXEL_API_KEY) {
			return interaction.editReply('❌ Missing `HYPIXEL_API_KEY` in `.env`.');
		}

		try {
			const m = await fetch(
				`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(
					ign
				)}`
			);
			if (m.status === 204)
				return interaction.editReply(`❌ Player \`${ign}\` not found.`);
			if (!m.ok)
				return interaction.editReply('❌ Mojang lookup failed. Try again.');
			const { id: uuid, name: canonicalIgn } = await m.json();

			const r = await fetch(`https://api.hypixel.net/v2/player?uuid=${uuid}`, {
				headers: { 'API-Key': process.env.HYPIXEL_API_KEY },
			});
			const data = await r.json();
			if (!data?.success) {
				return interaction.editReply(
					`❌ Hypixel error: ${data?.cause || 'player endpoint failed'}`
				);
			}

			const hypDiscord = data?.player?.socialMedia?.links?.DISCORD;
			if (!hypDiscord) {
				return interaction.editReply(
					'❌ No Discord set on your Hypixel profile.\n' +
						'In-game: **My Profile → Social → Discord** → set it to your current Discord username, then run `/link` again.'
				);
			}

			const want = norm(hypDiscord);
			const meTag = norm(userTag(interaction.user));
			const meUser = norm(interaction.user.username);

			if (!(want === meTag || want === meUser)) {
				return interaction.editReply(
					`❌ Discord mismatch.\n` +
						`Hypixel shows: \`${hypDiscord}\`\n` +
						`Your Discord: \`${userTag(interaction.user)}\`\n` +
						`Update Hypixel **Social → Discord** to match exactly, then re-run \`/link\`.`
				);
			}

			// save mapping
			setLink(discordId, { uuid, ign: canonicalIgn || ign });

			return interaction.editReply(
				`✅ Linked **${canonicalIgn || ign}** to <@${discordId}>.`
			);
		} catch (e) {
			console.error('link error:', e);
			return interaction.editReply(
				'❌ Linking failed. Please try again shortly.'
			);
		}
	},
};
