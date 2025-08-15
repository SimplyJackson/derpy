import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

async function mojangUUID(ign) {
	const r = await fetch(
		`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(ign)}`
	);
	if (r.status === 204) return null;
	if (!r.ok) throw new Error('Mojang lookup failed');
	return r.json();
}

export default {
	data: new SlashCommandBuilder()
		.setName('skin')
		.setDescription('Show a player’s Minecraft head render')
		.addStringOption((option) =>
			option
				.setName('username')
				.setDescription('Minecraft IGN')
				.setRequired(true)
		),
	async execute(interaction) {
		const ign = interaction.options.getString('username');
		const prof = await mojangUUID(ign);
		if (!prof)
			return interaction.reply({
				content: `❌ Player \`${ign}\` not found.`,
				ephemeral: true,
			});

		const uuid = prof.id;
		const name = prof.name;
		const embed = new EmbedBuilder()
			.setTitle(`${name}'s Skin`)
			.setImage(`https://mc-heads.net/body/${uuid}/256`)
			.setThumbnail(`https://mc-heads.net/avatar/${uuid}/128`);

		await interaction.reply({ embeds: [embed] });
	},
};
