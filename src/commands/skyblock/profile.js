import {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	MessageFlags,
} from 'discord.js';

const num = (x) => (typeof x === 'number' ? x.toLocaleString('en-US') : '0');

const embedFor = ({ uuid, name, cute, purse, bank, fairy, lastSave }) =>
	new EmbedBuilder()
		.setColor(0x2b2d31)
		.setAuthor({ name, iconURL: `https://mc-heads.net/avatar/${uuid}/128` })
		.setTitle(`SkyBlock Profile • ${cute}`)
		.addFields(
			{ name: 'Purse', value: `${num(purse)} coins`, inline: true },
			{ name: 'Bank', value: `${num(bank)} coins`, inline: true },
			{
				name: 'Total',
				value: `${num((purse || 0) + (bank || 0))} coins`,
				inline: true,
			},
			{ name: 'Fairy Souls', value: `${num(fairy)}`, inline: true },
			{
				name: 'Last Save',
				value: lastSave ? `<t:${Math.floor(lastSave / 1000)}:R>` : 'Unknown',
				inline: true,
			}
		)
		.setFooter({ text: '• Derpy', iconURL: 'attachment://derpy.webp' });

export default {
	data: new SlashCommandBuilder()
		.setName('profile')
		.setDescription('Show SkyBlock profile stats with a dropdown picker')
		.addStringOption((o) =>
			o
				.setName('username')
				.setDescription('Minecraft IGN (optional if linked)')
				.setRequired(false)
		),

	async execute(interaction) {
		if (!process.env.HYPIXEL_API_KEY)
			return interaction.reply({
				content: '❌ Missing HYPIXEL_API_KEY in .env',
				ephemeral: true,
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
			if (!link)
				return interaction.editReply(
					'❌ Not linked. Use `/link ign:<YourIGN>` or run `/profile username:<IGN>`.'
				);
			uuid = link.uuid;
			name = link.ign;
		}

		const pRes = await fetch(
			`https://api.hypixel.net/v2/skyblock/profiles?uuid=${uuid}`,
			{
				headers: { 'API-Key': process.env.HYPIXEL_API_KEY },
			}
		);
		const pData = await pRes.json().catch(() => null);
		if (!pData || !pData.success)
			return interaction.editReply(
				`❌ Hypixel error: ${pData?.cause || 'skyblock/profiles'}`
			);

		const profiles = pData.profiles || [];
		if (!profiles.length)
			return interaction.editReply(
				`❌ No SkyBlock profiles found for **${name}**.`
			);

		const withSaves = profiles.map((pr) => ({
			pr,
			ms: pr.members?.[uuid]?.last_save ?? 0,
		}));
		const chosen =
			profiles.find((pr) => pr.selected) ||
			withSaves.sort((a, b) => b.ms - a.ms)[0]?.pr;
		if (!chosen)
			return interaction.editReply('❌ Could not determine an active profile.');

		const member = chosen.members?.[uuid] || {};
		const purse = member.coin_purse ?? 0;
		const bank = chosen.banking?.balance ?? 0;
		const fairy = member.fairy_souls_collected ?? 0;
		const lastSave = member.last_save ?? null;

		const options = withSaves
			.sort((a, b) => b.ms - a.ms)
			.map(({ pr, ms }) => ({
				label: `${pr.cute_name || 'Unknown'}`,
				description: ms ? new Date(ms).toLocaleString() : 'No recent save',
				value: pr.profile_id,
				default: pr.selected,
			}))
			.slice(0, 25);

		const select = new StringSelectMenuBuilder()
			.setCustomId(`derpy:profile:${interaction.user.id}:${uuid}:${name}`)
			.setPlaceholder('Choose a SkyBlock profile')
			.addOptions(options);

		const row = new ActionRowBuilder().addComponents(select);
		const embed = embedFor({
			uuid,
			name,
			cute: chosen.cute_name || 'Unknown',
			purse,
			bank,
			fairy,
			lastSave,
		});

		await interaction.editReply({
			embeds: [embed],
			components: [row],
			files: [{ attachment: 'derpy.webp', name: 'derpy.webp' }],
		});
	},

	selectExecute: async (interaction, userId, uuid, name) => {
		if (interaction.user.id !== userId)
			return interaction.reply({
				content: '❌ You cannot use this select menu.',
				flags: MessageFlags.Ephemeral,
			});
		if (!process.env.HYPIXEL_API_KEY)
			return interaction.reply({
				content: '❌ Missing HYPIXEL_API_KEY in .env',
				flags: MessageFlags.Ephemeral,
			});
		await interaction.deferUpdate();
		const profileId = interaction.values[0];
		const res = await fetch(
			`https://api.hypixel.net/v2/skyblock/profile?profile=${profileId}`,
			{
				headers: { 'API-Key': process.env.HYPIXEL_API_KEY },
			}
		);
		const data = await res.json().catch(() => null);
		if (!data || !data.success) {
			return interaction.reply({
				ephemeral: true,
				content: `Failed to fetch profile: ${data?.cause || 'unknown error'}`,
			});
		}
		const pRes = await fetch(
			`https://api.hypixel.net/v2/skyblock/profiles?uuid=${uuid}`,
			{
				headers: { 'API-Key': process.env.HYPIXEL_API_KEY },
			}
		);
		const pData = await pRes.json().catch(() => null);
		if (!pData || !pData.success)
			return interaction.editReply(
				`❌ Hypixel error: ${pData?.cause || 'skyblock/profiles'}`
			);

		const profiles = pData.profiles || [];
		if (!profiles.length)
			return interaction.editReply(
				`❌ No SkyBlock profiles found for **${name}**.`
			);

		// Find the profile with the selected ID
		const chosen = profiles.find((pr) => pr.profile_id === profileId);
		if (!chosen)
			return interaction.editReply(
				`❌ Profile with ID \`${profileId}\` not found.`
			);
		const withSaves = profiles.map((pr) => ({
			pr,
			ms: pr.members?.[uuid]?.last_save ?? 0,
		}));

		const member = chosen.members?.[uuid] || {};
		const purse = member.coin_purse ?? 0;
		const bank = chosen.banking?.balance ?? 0;
		const fairy = member.fairy_souls_collected ?? 0;
		const lastSave = member.last_save ?? null;

		const options = withSaves
			.sort((a, b) => b.ms - a.ms)
			.map(({ pr, ms }) => ({
				label: `${pr.cute_name || 'Unknown'}`,
				description: ms ? new Date(ms).toLocaleString() : 'No recent save',
				value: pr.profile_id,
				default: pr.profile_id === profileId,
			}))
			.slice(0, 25);

		const select = new StringSelectMenuBuilder()
			.setCustomId(`derpy:profile:${interaction.user.id}:${uuid}:${name}`)
			.setPlaceholder('Choose a SkyBlock profile')
			.addOptions(options);

		const row = new ActionRowBuilder().addComponents(select);
		const embed = embedFor({
			uuid,
			name,
			cute: chosen.cute_name || 'Unknown',
			purse,
			bank,
			fairy,
			lastSave,
		});
		await interaction.message.edit({
			embeds: [embed],
			components: [row],
			files: [{ attachment: 'derpy.webp', name: 'derpy.webp' }],
		});
	},
};
