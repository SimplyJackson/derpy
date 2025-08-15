import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export default {
	data: new SlashCommandBuilder()
		.setName('unlink')
		.setDescription('Unlink your Discord from your Hypixel account'),

	async execute(interaction) {
		// Use MessageFlags.Ephemeral instead of ephemeral: true
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const discordId = interaction.user.id;
		const { getLink, deleteLink } = interaction.client.store;

		const existing = getLink(discordId);
		if (!existing) {
			return interaction.editReply('❌ You don’t have a linked account.');
		}

		// remove from store
		deleteLink(discordId);

		return interaction.editReply(
			`✅ Your link to **${existing.ign}** (${existing.uuid}) has been removed.\n` +
				`You can now use \`/link\` again to connect a different account.`
		);
	},
};
